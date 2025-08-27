const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Get messages for a conversation
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Verify user is part of this conversation
    const [conversations] = await pool.execute(
      'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get messages with sender info
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
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, parseInt(limit), offset]);

    // Mark messages as read (only messages from other user)
    if (messages.length > 0) {
      await pool.execute(
        'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
        [conversationId, userId]
      );
    }

    // Reverse order to show oldest first
    const formattedMessages = messages.reverse().map(message => ({
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
      isOwn: message.sender_id === userId
    }));

    // Get total count for pagination
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
      [conversationId]
    );

    const totalMessages = countResult[0].total;
    const totalPages = Math.ceil(totalMessages / parseInt(limit));
    const hasMore = parseInt(page) < totalPages;

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages,
          hasMore
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
});

// Send a text message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user.id;

    if (!conversationId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and message content are required'
      });
    }

    // Verify user is part of this conversation
    const [conversations] = await pool.execute(
      'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, senderId, senderId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const conversation = conversations[0];

    // Insert message
    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
      [conversationId, senderId, content.trim(), 'text']
    );

    const messageId = result.insertId;

    // Update conversation's last message
    await pool.execute(
      'UPDATE conversations SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [messageId, conversationId]
    );

    // Get the complete message data
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

    res.status(201).json({
      success: true,
      data: {
        message: formattedMessage
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Send an image message
router.post('/image', authenticateToken, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user.id;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    // Verify user is part of this conversation
    const [conversations] = await pool.execute(
      'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, senderId, senderId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;

    // Insert message
    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, message_type, image_url) VALUES (?, ?, ?, ?)',
      [conversationId, senderId, 'image', imageUrl]
    );

    const messageId = result.insertId;

    // Update conversation's last message
    await pool.execute(
      'UPDATE conversations SET last_message_id = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [messageId, conversationId]
    );

    // Get the complete message data
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

    res.status(201).json({
      success: true,
      data: {
        message: formattedMessage
      }
    });

  } catch (error) {
    console.error('Send image message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send image message'
    });
  }
});

// Mark messages as read
router.patch('/read/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const [conversations] = await pool.execute(
      'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark all messages from other user as read
    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [conversationId, userId]
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
});

module.exports = router;
