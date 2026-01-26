'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';

interface ChatInterfaceProps {
  tenantId: string;
}

export default function ChatInterface({ tenantId }: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localInput, setLocalInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append } = useChat({
    api: '/api/chat',
    headers: {
      'X-Tenant-Id': tenantId,
    },
    body: conversationId ? {
      conversationId,
    } : undefined,
    onResponse: async (response) => {
      // Extract conversation ID from response headers
      const convId = response.headers.get('X-Conversation-Id');
      if (convId && !conversationId) {
        setConversationId(convId);
      }
    },
  });

  // Sync local input with useChat input
  useEffect(() => {
    if (input !== undefined && input !== null) {
      setLocalInput(input);
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Direct input handler
  const handleInputChangeDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalInput(value);
    // Update useChat's input state
    if (setInput) {
      setInput(value);
    }
    // Also call handleInputChange if available
    if (handleInputChange) {
      handleInputChange(e);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const messageText = localInput.trim();
    if (!messageText) {
      return;
    }
    
    // Clear local input immediately
    setLocalInput('');
    
    // Try to use append first (most reliable)
    if (append && typeof append === 'function') {
      try {
        await append({
          role: 'user',
          content: messageText,
        });
        return;
      } catch (error) {
        console.error('Error using append:', error);
      }
    }
    
    // Fallback: manually send message using fetch
    try {
      // Add user message to UI immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: messageText,
      };
      
      if (setMessages) {
        setMessages([...messages, userMessage]);
      }
      
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

      // Handle streaming response using useChat's mechanism
      // The response should be compatible with useChat's expected format
      if (response.body) {
        // useChat will handle the streaming if we set the input and trigger handleSubmit
        // But since that's not working, let's manually process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantMessageId = `assistant-${Date.now()}`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const data = JSON.parse(line.slice(2));
                if (data.type === 'text-delta' && data.textDelta) {
                  assistantContent += data.textDelta;
                  
                  // Update messages
                  if (setMessages) {
                    const assistantMsg = {
                      id: assistantMessageId,
                      role: 'assistant' as const,
                      content: assistantContent,
                    };
                    setMessages([...messages, userMessage, assistantMsg]);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove user message on error
      if (setMessages) {
        setMessages(messages);
      }
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
