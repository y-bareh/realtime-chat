const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { pool } = require('../config/database');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }
  });

  // Store user socket mappings
  const userSockets = new Map();

  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ User ${user.username} connected (${socket.id})`);

    // Store user socket mapping
    userSockets.set(user.id, socket.id);

    // Update user online status
    try {
      await pool.execute(
        'UPDATE users SET is_online = TRUE, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Notify contacts about online status
      socket.broadcast.emit('user_status_change', {
        userId: user.id,
        isOnline: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }

    // Join user to their personal room for receiving messages
    socket.join(`user_${user.id}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user is part of this conversation
        const [conversations] = await pool.execute(
          'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
          [conversationId, user.id, user.id]
        );

        if (conversations.length > 0) {
          socket.join(`conversation_${conversationId}`);
          console.log(`📱 User ${user.username} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`📱 User ${user.username} left conversation ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text', imageUrl } = data;

        // Verify user is part of this conversation
        const [conversations] = await pool.execute(
          'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
          [conversationId, user.id, user.id]
        );

        if (conversations.length === 0) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const conversation = conversations[0];
        
        // Determine recipient
        const recipientId = conversation.participant1_id === user.id 
          ? conversation.participant2_id 
          : conversation.participant1_id;

        // Insert message into database
        const [result] = await pool.execute(
          'INSERT INTO messages (conversation_id, sender_id, content, message_type, image_url) VALUES (?, ?, ?, ?, ?)',
          [conversationId, user.id, content, type, imageUrl]
        );

        const messageId = result.insertId;

        // Update conversation's last message
        await pool.execute(
          'UPDATE conversations SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
          [messageId, conversationId]
        );

        // Get complete message data
        const [messages] = await pool.execute(`
          SELECT 
            m.id,
            m.content,
            m.message_type,
            m.image_url,
            m.is_read,
            m.created_at,
            m.sender_id,
            u.username as sender_username,
            u.full_name as sender_full_name,
            u.avatar_url as sender_avatar_url
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [messageId]);

        const message = messages[0];
        const formattedMessage = {
          id: message.id,
          content: message.content,
          type: message.message_type,
          imageUrl: message.image_url,
          isRead: Boolean(message.is_read),
          createdAt: message.created_at,
          sender: {
            id: message.sender_id,
            username: message.sender_username,
            fullName: message.sender_full_name,
            avatarUrl: message.sender_avatar_url
          },
          conversationId: parseInt(conversationId)
        };

        // Send message to conversation room (for users currently viewing the conversation)
        io.to(`conversation_${conversationId}`).emit('new_message', formattedMessage);

        // Always send message to both participants directly (ensures conversation list updates)
        const senderSocketId = userSockets.get(user.id);
        const recipientSocketId = userSockets.get(recipientId);
        
        // Send to recipient
        if (recipientSocketId) {
          const recipientSocket = io.sockets.sockets.get(recipientSocketId);
          if (recipientSocket) {
            // If recipient is not in the conversation room, send both new_message and notification
            if (!recipientSocket.rooms.has(`conversation_${conversationId}`)) {
              recipientSocket.emit('new_message', formattedMessage);
              recipientSocket.emit('message_notification', {
                conversationId,
                message: formattedMessage,
                sender: {
                  id: user.id,
                  username: user.username,
                  fullName: user.full_name
                }
              });
            }
          }
        }
        
        // Send to sender (for conversation list update on sender's side)
        if (senderSocketId) {
          const senderSocket = io.sockets.sockets.get(senderSocketId);
          if (senderSocket && !senderSocket.rooms.has(`conversation_${conversationId}`)) {
            senderSocket.emit('new_message', formattedMessage);
          }
        }

        console.log(`💬 Message sent in conversation ${conversationId} by ${user.username}`);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: user.id,
        username: user.username,
        conversationId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: user.id,
        username: user.username,
        conversationId,
        isTyping: false
      });
    });

    // Handle message read status
    socket.on('mark_messages_read', async (data) => {
      try {
        const { conversationId } = data;

        // Mark messages as read
        await pool.execute(
          'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
          [conversationId, user.id]
        );

        // Notify other participants about read status
        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          readByUserId: user.id
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`❌ User ${user.username} disconnected (${socket.id})`);
      
      // Remove user socket mapping
      userSockets.delete(user.id);

      try {
        // Update user offline status
        await pool.execute(
          'UPDATE users SET is_online = FALSE, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );

        // Notify contacts about offline status
        socket.broadcast.emit('user_status_change', {
          userId: user.id,
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    });
  });

  return io;
};

module.exports = { initializeSocket };
