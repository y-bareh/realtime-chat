'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
  Message, 
  Conversation,
  User
} from '@/lib/socket';
import { useAuth } from './AuthContext';
import { conversationsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface ChatContextType {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Set<number>;
  typingUsers: Map<number, string>;
  unreadCount: number;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, type?: 'text' | 'image', imageUrl?: string) => void;
  sendImageMessage: (imageFile: File) => Promise<void>;
  createConversation: (otherUser: User) => Promise<void>;
  markMessagesAsRead: (conversationId: number) => void;
  startTyping: () => void;
  stopTyping: () => void;
  loadMoreMessages: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Calculate unread count
  const unreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  // Initialize socket connection
  useEffect(() => {
    if (user && token) {
      const socketInstance = initializeSocket(token);
      setSocket(socketInstance);

      // Socket event listeners
      socketInstance.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);
        
        // Update conversation list
        setConversations(prev => {
          const existingConversation = prev.find(conv => conv.id === message.conversationId);
          
          if (existingConversation) {
            // Update existing conversation
            return prev.map(conv => 
              conv.id === message.conversationId
                ? {
                    ...conv,
                    lastMessage: {
                      content: message.content,
                      type: message.type,
                      senderId: message.sender.id,
                      createdAt: message.createdAt
                    },
                    lastMessageAt: message.createdAt,
                    unreadCount: message.sender.id === user.id ? conv.unreadCount : conv.unreadCount + 1
                  }
                : conv
            ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          } else {
            // Create new conversation entry if it doesn't exist
            const newConversation: Conversation = {
              id: message.conversationId,
              otherUser: message.sender,
              lastMessage: {
                content: message.content,
                type: message.type,
                senderId: message.sender.id,
                createdAt: message.createdAt
              },
              lastMessageAt: message.createdAt,
              unreadCount: message.sender.id === user.id ? 0 : 1,
              createdAt: message.createdAt
            };
            
            return [newConversation, ...prev].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          }
        });
      });

      socketInstance.on('message_notification', (data: {
        conversationId: number;
        message: Message;
        sender: User;
      }) => {
        toast.success(`New message from ${data.sender.fullName}`);
        
        // Also update conversations list when we get a notification
        setConversations(prev => {
          const existingConversation = prev.find(conv => conv.id === data.conversationId);
          
          if (existingConversation) {
            // Update existing conversation
            return prev.map(conv => 
              conv.id === data.conversationId
                ? {
                    ...conv,
                    lastMessage: {
                      content: data.message.content,
                      type: data.message.type,
                      senderId: data.message.sender.id,
                      createdAt: data.message.createdAt
                    },
                    lastMessageAt: data.message.createdAt,
                    unreadCount: conv.unreadCount + 1
                  }
                : conv
            ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          } else {
            // Create new conversation entry if it doesn't exist
            const newConversation: Conversation = {
              id: data.conversationId,
              otherUser: data.sender,
              lastMessage: {
                content: data.message.content,
                type: data.message.type,
                senderId: data.message.sender.id,
                createdAt: data.message.createdAt
              },
              lastMessageAt: data.message.createdAt,
              unreadCount: 1,
              createdAt: data.message.createdAt
            };
            
            return [newConversation, ...prev].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          }
        });
      });

      socketInstance.on('user_status_change', (data: {
        userId: number;
        isOnline: boolean;
        lastSeen: Date;
      }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (data.isOnline) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });

        // Update conversations with online status
        setConversations(prev =>
          prev.map(conv =>
            conv.otherUser.id === data.userId
              ? {
                  ...conv,
                  otherUser: {
                    ...conv.otherUser,
                    isOnline: data.isOnline,
                    lastSeen: data.lastSeen.toString()
                  }
                }
              : conv
          )
        );
      });

      socketInstance.on('user_typing', (data: {
        userId: number;
        username: string;
        conversationId: number;
        isTyping: boolean;
      }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (data.isTyping) {
            newMap.set(data.conversationId, data.username);
          } else {
            newMap.delete(data.conversationId);
          }
          return newMap;
        });
      });

      socketInstance.on('messages_read', (data: {
        conversationId: number;
        readByUserId: number;
      }) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.conversationId === data.conversationId && msg.sender.id !== data.readByUserId 
              ? { ...msg, isRead: true } 
              : msg
          )
        );
      });

      return () => {
        disconnectSocket();
        setSocket(null);
      };
    }
  }, [user, token]);

  // Load conversations
  const refreshConversations = async () => {
    try {
      const response = await conversationsAPI.getAll();
      if (response.data.success) {
        setConversations(response.data.data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(1, true);
      
      // Join conversation room
      if (socket) {
        socket.emit('join_conversation', activeConversation.id);
      }

      return () => {
        // Leave conversation room when component unmounts or conversation changes
        if (socket) {
          socket.emit('leave_conversation', activeConversation.id);
        }
      };
    }
  }, [activeConversation]);

  const loadMessages = useCallback(async (page: number, reset = false) => {
    if (!activeConversation) return;

    try {
      const { messagesAPI } = await import('@/lib/api');
      const response = await messagesAPI.getByConversation(activeConversation.id, page);
      
      if (response.data.success) {
        const newMessages = response.data.data.messages;
        setMessages(prev => reset ? newMessages : [...newMessages, ...prev]);
        setHasMoreMessages(response.data.data.pagination.hasMore);
        setMessagesPage(page);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [activeConversation]);

  const loadMoreMessages = async () => {
    if (hasMoreMessages) {
      await loadMessages(messagesPage + 1);
    }
  };

  const sendMessage = useCallback((content: string, type: 'text' | 'image' = 'text', imageUrl?: string) => {
    if (socket && activeConversation && (content.trim() || type === 'image')) {
      socket.emit('send_message', {
        conversationId: activeConversation.id,
        content: type === 'text' ? content.trim() : undefined,
        type,
        imageUrl
      });
    }
  }, [socket, activeConversation]);

  const sendImageMessage = async (imageFile: File) => {
    if (!activeConversation) return;

    try {
      const { messagesAPI } = await import('@/lib/api');
      const response = await messagesAPI.sendImage(activeConversation.id, imageFile);
      
      if (response.data.success) {
        // Message will be added via socket event
        toast.success('Image sent successfully');
      }
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image');
    }
  };

  const createConversation = async (otherUser: User) => {
    try {
      const response = await conversationsAPI.create(otherUser.id);
      if (response.data.success) {
        await refreshConversations();
        
        // Find and set the new conversation as active
        const newConv = conversations.find(conv => conv.otherUser.id === otherUser.id);
        if (newConv) {
          setActiveConversation(newConv);
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const markMessagesAsRead = useCallback((conversationId: number) => {
    if (socket) {
      socket.emit('mark_messages_read', { conversationId });
      
      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    }
  }, [socket]);

  const startTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing_start', { conversationId: activeConversation.id });
    }
  };

  const stopTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing_stop', { conversationId: activeConversation.id });
    }
  };

  const value: ChatContextType = {
    socket,
    conversations,
    activeConversation,
    messages,
    onlineUsers,
    typingUsers,
    unreadCount,
    setActiveConversation,
    sendMessage,
    sendImageMessage,
    createConversation,
    markMessagesAsRead,
    startTyping,
    stopTyping,
    loadMoreMessages,
    refreshConversations,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
