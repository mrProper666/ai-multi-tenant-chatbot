'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';

interface ChatInterfaceProps {
  tenantId: string;
}

export default function ChatInterface({ tenantId }: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    headers: {
      'X-Tenant-Id': tenantId,
    },
    body: {
      conversationId,
    },
    onResponse: async (response) => {
      // Extract conversation ID from response headers
      const convId = response.headers.get('X-Conversation-Id');
      if (convId && !conversationId) {
        setConversationId(convId);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Extract conversation ID from first message if available
    if (!conversationId && messages.length > 0) {
      // This is a workaround - in production, the API should return conversationId
      // For now, we'll create a new conversation on first message
    }

    handleSubmit(e);
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
            value={input}
            onChange={handleInputChange}
            placeholder="Type your question here..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
