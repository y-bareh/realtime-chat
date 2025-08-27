import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: number;
  content?: string;
  type: 'text' | 'image';
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender: User;
  conversationId: number;
  isOwn?: boolean;
}

export interface Conversation {
  id: number;
  otherUser: User;
  lastMessage?: {
    content?: string;
    type: 'text' | 'image';
    senderId: number;
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId: number): void => {
  if (socket) {
    socket.emit('join_conversation', conversationId);
  }
};

export const leaveConversation = (conversationId: number): void => {
  if (socket) {
    socket.emit('leave_conversation', conversationId);
  }
};

export const sendMessage = (data: {
  conversationId: number;
  content?: string;
  type?: 'text' | 'image';
  imageUrl?: string;
}): void => {
  if (socket) {
    socket.emit('send_message', data);
  }
};

export const markMessagesAsRead = (conversationId: number): void => {
  if (socket) {
    socket.emit('mark_messages_read', { conversationId });
  }
};

export const startTyping = (conversationId: number): void => {
  if (socket) {
    socket.emit('typing_start', { conversationId });
  }
};

export const stopTyping = (conversationId: number): void => {
  if (socket) {
    socket.emit('typing_stop', { conversationId });
  }
};

export default socket;
