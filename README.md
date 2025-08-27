# Real-Time Chat Application

A modern, full-stack real-time chat application built with Node.js, Next.js, and Socket.io, featuring a beautiful dark glassmorphism UI design.

## ✨ Features

- **Real-time messaging** with Socket.io
- **User authentication** (registration and login)
- **One-to-one conversations**
- **Text and image messaging**
- **Online status indicators**
- **Modern dark glassmorphism UI**
- **Responsive design**
- **Message timestamps**
- **User search functionality**

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.io** for real-time communication
- **SQLite** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads

### Frontend
- **Next.js 14** with TypeScript
- **React** with Context API
- **Tailwind CSS** with custom glassmorphism styling
- **Socket.io-client**
- **React Hot Toast** for notifications

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/realtime-chat.git
   cd realtime-chat
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend server will start on `http://localhost:3001`

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
realtime-chat/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── database-sqlite.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── conversations.js
│   │   │   └── messages.js
│   │   └── socket/
│   │       └── socketHandler.js
│   ├── migrations/
│   │   └── migrate-sqlite.js
│   ├── uploads/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── AuthForm.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   └── UserSearch.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ChatContext.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       └── socket.ts
│   └── public/
└── README.md
```

## 🎨 Features Overview

### Authentication
- User registration and login
- JWT-based authentication
- Secure password hashing
- Session management

### Real-time Messaging
- Instant message delivery
- Online/offline status
- Typing indicators
- Message timestamps
- Image sharing

### User Interface
- Dark glassmorphism design
- Responsive layout
- Modern gradient backgrounds
- Smooth animations
- Intuitive user experience

## 🔧 Configuration

### Backend Configuration
The backend uses SQLite by default. Database configuration can be found in:
- `backend/src/config/database-sqlite.js`

### Frontend Configuration
Update the API endpoints in:
- `frontend/src/lib/api.ts`
- `frontend/src/lib/socket.ts`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation

### Messages
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send text message
- `POST /api/messages/image` - Send image message

### Users
- `GET /api/users/search` - Search users

## 🔌 Socket Events

### Client to Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message

### Server to Client
- `new_message` - Receive new message
- `user_online` - User came online
- `user_offline` - User went offline

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.io for real-time communication
- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- The open-source community for inspiration and resources

## 📧 Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/realtime-chat](https://github.com/yourusername/realtime-chat)
