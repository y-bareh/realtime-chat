'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/lib/socket';
import { 
  PaperAirplaneIcon, 
  PhotoIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendImage: (file: File) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onSendImage, 
  disabled = false 
}) => {
  const { startTyping, stopTyping, activeConversation } = useChat();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      handleStopTyping();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    // Handle typing indicators
    if (value.trim() && !isTyping) {
      handleStartTyping();
    } else if (!value.trim() && isTyping) {
      handleStopTyping();
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 1000);
    }
  };

  const handleStartTyping = () => {
    if (!isTyping && activeConversation) {
      setIsTyping(true);
      startTyping();
    }
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onSendImage(file);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Stop typing when conversation changes
  useEffect(() => {
    handleStopTyping();
    setMessage('');
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="border-t border-white/10 px-4 py-4 bg-black/20 backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Image upload button */}
        <div className="flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-md"
            title="Send image"
          >
            <PhotoIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Message input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${activeConversation.otherUser.fullName || activeConversation.otherUser.username}...`}
            disabled={disabled}
            rows={1}
            className="block w-full px-3 py-2 border border-white/20 rounded-lg resize-none bg-black/20 backdrop-blur-md text-white placeholder-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <div className="flex-shrink-0">
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-md"
            title="Send message"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

interface ChatWindowProps {}

const ChatWindow: React.FC<ChatWindowProps> = () => {
  const { user } = useAuth();
  const { 
    activeConversation, 
    messages, 
    sendMessage, 
    sendImageMessage, 
    onlineUsers,
    typingUsers,
    markMessagesAsRead,
    loadMoreMessages
  } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      
      if (isAtBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } else {
        setShowScrollButton(true);
      }
    }
  }, [messages]);

  // Mark messages as read when conversation is active
  useEffect(() => {
    if (activeConversation) {
      markMessagesAsRead(activeConversation.id);
    }
  }, [activeConversation, markMessagesAsRead]);

  // Handle scroll to check if user is at bottom
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      setShowScrollButton(!isAtBottom && messages.length > 0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, prevMessage?: Message) => {
    if (!prevMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const prevDate = new Date(prevMessage.createdAt).toDateString();
    
    return currentDate !== prevDate;
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender.id === user?.id;
    const prevMessage = messages[index - 1];
    const showDate = shouldShowDateSeparator(message, prevMessage);

    return (
      <div key={message.id}>
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 text-xs text-white/70 bg-black/20 backdrop-blur-md border border-white/10 rounded-full">
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg backdrop-blur-md border ${
            isOwn 
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-white/20' 
              : 'bg-black/20 text-white border-white/10'
          }`}>
            {message.type === 'text' ? (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            ) : (
              <div>
                <img
                  src={`http://localhost:5000${message.imageUrl}`}
                  alt="Shared image"
                  className="rounded max-w-full h-auto cursor-pointer"
                  onClick={() => window.open(`http://localhost:5000${message.imageUrl}`, '_blank')}
                />
              </div>
            )}
            
            <div className={`text-xs mt-1 ${
              isOwn ? 'text-white/80' : 'text-white/60'
            }`}>
              {formatTime(message.createdAt)}
              {isOwn && message.isRead && (
                <span className="ml-1">✓✓</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!activeConversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-white/50">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-white">No conversation selected</h3>
          <p className="mt-1 text-sm text-white/70">Choose a conversation from the sidebar to start chatting.</p>
        </div>
      </div>
    );
  }

  const isOnline = onlineUsers.has(activeConversation.otherUser.id);
  const typingUser = typingUsers.get(activeConversation.id);

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center">
          <div className="flex-shrink-0 relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              {activeConversation.otherUser.avatarUrl ? (
                <img
                  src={activeConversation.otherUser.avatarUrl}
                  alt={activeConversation.otherUser.fullName || activeConversation.otherUser.username}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span className="text-white font-medium">
                  {(activeConversation.otherUser.fullName || activeConversation.otherUser.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-black/20"></span>
            )}
          </div>
          
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-white">
              {activeConversation.otherUser.fullName || activeConversation.otherUser.username}
            </h2>
            <p className="text-sm text-white/70">
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-slate-900/50 relative"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/70">No messages yet</p>
              <p className="text-sm text-white/50 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            
            {typingUser && (
              <div className="flex justify-start mb-4">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600">{typingUser} is typing</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg backdrop-blur-xl border border-white/20 hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 z-10"
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        onSendImage={sendImageMessage}
      />
    </div>
  );
};

export default ChatWindow;
