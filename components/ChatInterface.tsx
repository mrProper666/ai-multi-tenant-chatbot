'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInterfaceProps {
  tenantId: string;
}

type SimpleMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatInterface({ tenantId }: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localInput, setLocalInput] = useState<string>('');
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Direct input handler
  const handleInputChangeDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalInput(value);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const messageText = localInput.trim();
    if (!messageText) {
      return;
    }
    
    // Clear local input immediately
    setLocalInput('');

    try {
      // Add user message to UI immediately
      const userMessage: SimpleMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      
      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Extract conversation ID
      const convId = response.headers.get('X-Conversation-Id');
      if (convId && !conversationId) {
        setConversationId(convId);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantMessageId = `assistant-${Date.now()}`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          // Prefer AI SDK "data stream" lines (0:... JSON). If not present, treat as plain text stream.
          let sawDataStream = false;
          for (const line of lines) {
            if (!line.startsWith('0:')) continue;
            sawDataStream = true;
            try {
              const data = JSON.parse(line.slice(2));
              if (data.type === 'text-delta' && data.textDelta) {
                assistantContent += data.textDelta;
              }
            } catch {
              // ignore malformed JSON
            }
          }
          if (!sawDataStream) {
            assistantContent += chunk;
          }

          const assistantMsg: SimpleMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: assistantContent,
          };
          setMessages(prev => {
            const withoutAssistant = prev.filter(m => m.id !== assistantMessageId);
            return [...withoutAssistant, assistantMsg];
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // best-effort: show error as assistant message
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'An error occurred while sending your message. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Chat with AI Assistant</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ask questions based on your uploaded documents
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Ask questions about your uploaded documents</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="text-sm text-gray-500">Thinking...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={localInput}
            onChange={handleInputChangeDirect}
            placeholder="Type your question here..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !localInput.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
