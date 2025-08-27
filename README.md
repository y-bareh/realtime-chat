# Real-Time Chat Application

A modern real-time chat application with dark glassmorphism UI design.

## 🛠️ Tech Stack

**Backend:** Node.js + Express + Socket.io + SQLite + JWT  
**Frontend:** Next.js 14 + TypeScript + Tailwind CSS + React Context

## 📊 Database Structure

- **Users:** Store user credentials (username, email, password hash), profile info, and timestamps
- **Conversations:** Track one-to-one chat relationships between users with creation/update timestamps
- **Messages:** Store message content, sender info, conversation references, and support text/image types

## 🏗️ Technical Approach

### Real-Time Communication
- **Socket.io** for instant messaging and online status
- Room-based messaging for conversation isolation

### Authentication & Security
- **JWT tokens** for secure authentication
- **bcryptjs** for password hashing

### Database Design
- **SQLite** for simplicity and portability
- **One-to-one conversations** with message history
- **Foreign key relationships** for data integrity

### Frontend Architecture
- **React Context API** for global state management
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

## 📱 Features

- User registration and login
- Real-time messaging
- Image sharing
- Online status indicators
- Modern dark UI design
