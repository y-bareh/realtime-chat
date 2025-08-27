'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/AuthForm';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 mx-auto"></div>
          </div>
          <p className="mt-4 text-lg text-white/80">Loading your chats...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm mode={authMode} onToggleMode={toggleAuthMode} />
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Background decorative elements for chat */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-10 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 relative z-10">
        <ConversationList />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        <ChatWindow />
      </div>
    </div>
  );
}
