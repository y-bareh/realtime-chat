import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }) => api.post('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  getProfile: () => api.get('/auth/me'),

  searchUsers: (query: string) =>
    api.get(`/auth/users/search?query=${encodeURIComponent(query)}`),
};

// Conversations API
export const conversationsAPI = {
  getAll: () => api.get('/conversations'),

  create: (otherUserId: number) =>
    api.post('/conversations', { otherUserId }),

  getById: (conversationId: number) =>
    api.get(`/conversations/${conversationId}`),
};

// Messages API
export const messagesAPI = {
  getByConversation: (conversationId: number, page = 1, limit = 50) =>
    api.get(`/messages/conversation/${conversationId}?page=${page}&limit=${limit}`),

  send: (data: { conversationId: number; content: string }) =>
    api.post('/messages', data),

  sendImage: (conversationId: number, imageFile: File) => {
    const formData = new FormData();
    formData.append('conversationId', conversationId.toString());
    formData.append('image', imageFile);

    return api.post('/messages/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  markAsRead: (conversationId: number) =>
    api.patch(`/messages/read/${conversationId}`),
};

export default api;
