'use client';

import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { User } from '@/lib/socket';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ isOpen, onClose }) => {
  const { createConversation } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.searchUsers(query.trim());
      if (response.data.success) {
        setSearchResults(response.data.data.users);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (user: User) => {
    try {
      await createConversation(user);
      onClose();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Start New Conversation</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-white/60" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users by name, username, or email..."
            className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-md bg-black/20 backdrop-blur-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-4 text-white/70">
              No users found
            </div>
          )}

          {!loading && searchResults.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="flex items-center p-3 hover:bg-white/10 cursor-pointer rounded-lg transition-colors backdrop-blur-sm"
            >
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <span className="text-white font-medium">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-white">
                    {user.fullName || user.username}
                  </p>
                  {user.isOnline && (
                    <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                  )}
                </div>
                <p className="text-sm text-white/70">@{user.username}</p>
                {!user.isOnline && user.lastSeen && (
                  <p className="text-xs text-white/60">
                    Last seen {formatLastSeen(user.lastSeen)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {searchQuery.trim().length < 2 && (
          <div className="text-center py-4 text-white/70 text-sm">
            Type at least 2 characters to search for users
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;
