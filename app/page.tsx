'use client';

import { useState, useEffect } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const [tenantId, setTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'documents' | 'chat'>('documents');

  useEffect(() => {
    // TODO: Implement proper tenant resolution
    // For now, prompt user or use a default
    const stored = localStorage.getItem('tenantId');
    if (stored) {
      setTenantId(stored);
    } else {
      // For demo purposes, generate a UUID or prompt user
      const demoTenantId = prompt('Enter Tenant ID (UUID):') || '';
      if (demoTenantId) {
        setTenantId(demoTenantId);
        localStorage.setItem('tenantId', demoTenantId);
      }
    }
  }, []);

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tenant ID Required</h1>
          <p className="text-gray-600">Please provide a tenant ID to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Multi-Tenant NGO AI Chatbot
            </h1>
            <div className="text-sm text-gray-600">
              Tenant: <span className="font-mono text-xs">{tenantId.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Chat
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <DocumentUpload tenantId={tenantId} />
            <DocumentList tenantId={tenantId} />
          </div>
        )}
        {activeTab === 'chat' && <ChatInterface tenantId={tenantId} />}
      </main>
    </div>
  );
}
