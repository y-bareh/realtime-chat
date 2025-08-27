'use client';

import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/lib/socket';
import { PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import UserSearch from './UserSearch';

const ConversationList: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    conversations, 
    activeConversation, 
    setActiveConversation, 
    onlineUsers,
    unreadCount 
  } = useChat();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const formatLastMessage = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const { content, type, senderId } = conversation.lastMessage;
    const isOwn = senderId === user?.id;
    const prefix = isOwn ? 'You: ' : '';

    if (type === 'image') {
      return `${prefix}📷 Image`;
    }

    return `${prefix}${content || ''}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    await logout();
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-full backdrop-blur-xl bg-white/10 border-r border-white/20">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-white">Messages</h1>
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/80 text-white backdrop-blur-sm">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
              title="Start new conversation"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                title="Settings"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 mt-2 w-48 backdrop-blur-xl bg-slate-900/95 border border-white/30 rounded-xl shadow-2xl py-1 z-10">
                  <div className="px-4 py-2 text-sm text-white/90 border-b border-white/30">
                    {user?.fullName || user?.username}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-white/80">No conversations yet</p>
              <p className="text-sm mt-1 text-white/60">Start a new conversation to begin chatting</p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Start Conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {conversations.map((conversation) => {
              const isActive = activeConversation?.id === conversation.id;
              const isOnline = onlineUsers.has(conversation.otherUser.id);
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => setActiveConversation(conversation)}
                  className={`flex items-center px-4 py-3 hover:bg-white/5 cursor-pointer transition-all duration-200 ${
                    isActive ? 'bg-white/10 border-r-2 border-blue-400' : ''
                  }`}
                >
                  <div className="flex-shrink-0 relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      {conversation.otherUser.avatarUrl ? (
                        <img
                          src={conversation.otherUser.avatarUrl}
                          alt={conversation.otherUser.fullName || conversation.otherUser.username}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <span className="text-white font-medium text-lg">
                          {(conversation.otherUser.fullName || conversation.otherUser.username).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white/20"></span>
                    )}
                  </div>

                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-white' : 'text-white/90'
                      }`}>
                        {conversation.otherUser.fullName || conversation.otherUser.username}
                      </p>
                      <p className="text-xs text-white/50">
                        {formatTime(conversation.lastMessageAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${
                        conversation.unreadCount > 0 ? 'font-medium text-white/90' : 'text-white/60'
                      }`}>
                        {formatLastMessage(conversation)}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-white bg-red-500/80 rounded-full backdrop-blur-sm">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Search Modal */}
      <UserSearch
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
      />
    </div>
  );
};

export default ConversationList;
