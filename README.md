# Real-Time Chat Application

A modern real-time chat application with dark glassmorphism UI design.

## 🛠️ Tech Stack

**Backend:** Node.js + Express + Socket.io + SQLite + JWT  
**Frontend:** Next.js 14 + TypeScript + Tailwind CSS + React Context

## � Database Structure

### Users Table
```sql
users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Conversations Table
```sql
conversations (
  id INTEGER PRIMARY KEY,
  user1_id INTEGER,
  user2_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Messages Table
```sql
messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER,
  sender_id INTEGER,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## �️ Technical Approach

### Real-Time Communication
- **Socket.io** for instant messaging and online status
- Room-based messaging for conversation isolation
- Event-driven architecture for real-time updates

### Authentication & Security
- **JWT tokens** for secure authentication
- **bcryptjs** for password hashing
- Middleware protection for authenticated routes

### Database Design
- **SQLite** for simplicity and portability
- **One-to-one conversations** between users
- **Message history** with timestamps and type support
- **Foreign key relationships** for data integrity

### Frontend Architecture
- **React Context API** for global state management
- **Custom hooks** for API calls and socket management
- **Component-based** architecture with TypeScript
- **Dark glassmorphism UI** with Tailwind CSS

## 🚀 Quick Start

1. **Backend Setup**
   ```bash
   cd realtime-chat/backend
   npm install
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd realtime-chat/frontend
   npm install
   npm run dev
   ```

3. **Access the app** at `http://localhost:3000`

## � Features

- User registration and login
- Real-time messaging
- Image sharing
- Online status indicators
- Modern dark UI design
