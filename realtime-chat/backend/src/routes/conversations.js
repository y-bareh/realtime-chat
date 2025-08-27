const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [conversations] = await pool.execute(`
      SELECT 
        c.id,
        c.last_message_at,
        c.created_at,
        CASE 
          WHEN c.participant1_id = ? THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.participant1_id = ? THEN u2.username
          ELSE u1.username
        END as other_user_username,
        CASE 
          WHEN c.participant1_id = ? THEN u2.full_name
          ELSE u1.full_name
        END as other_user_full_name,
        CASE 
          WHEN c.participant1_id = ? THEN u2.avatar_url
          ELSE u1.avatar_url
        END as other_user_avatar_url,
        CASE 
          WHEN c.participant1_id = ? THEN u2.is_online
          ELSE u1.is_online
        END as other_user_is_online,
        CASE 
          WHEN c.participant1_id = ? THEN u2.last_seen
          ELSE u1.last_seen
        END as other_user_last_seen,
        m.content as last_message_content,
        m.message_type as last_message_type,
        m.sender_id as last_message_sender_id,
        m.created_at as last_message_created_at,
        COUNT(unread.id) as unread_count
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      LEFT JOIN messages m ON c.last_message_id = m.id
      LEFT JOIN messages unread ON unread.conversation_id = c.id 
        AND unread.sender_id != ? 
        AND unread.is_read = FALSE
      WHERE c.participant1_id = ? OR c.participant2_id = ?
      GROUP BY c.id
      ORDER BY c.last_message_at DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId, userId]);

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      otherUser: {
        id: conv.other_user_id,
        username: conv.other_user_username,
        fullName: conv.other_user_full_name,
        avatarUrl: conv.other_user_avatar_url,
        isOnline: Boolean(conv.other_user_is_online),
        lastSeen: conv.other_user_last_seen
      },
      lastMessage: conv.last_message_content ? {
        content: conv.last_message_content,
        type: conv.last_message_type,
        senderId: conv.last_message_sender_id,
        createdAt: conv.last_message_created_at
      } : null,
      unreadCount: conv.unread_count,
      lastMessageAt: conv.last_message_at,
      createdAt: conv.created_at
    }));

    res.json({
      success: true,
      data: {
        conversations: formattedConversations
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations'
    });
  }
});

// Get or create conversation with another user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Other user ID is required'
      });
    }

    if (otherUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Check if other user exists
    const [otherUsers] = await pool.execute(
      'SELECT id, username, full_name as fullName, avatar_url as avatarUrl, is_online as isOnline, last_seen as lastSeen FROM users WHERE id = ?',
      [otherUserId]
    );

    if (otherUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if conversation already exists
    const [existingConversations] = await pool.execute(`
      SELECT id FROM conversations 
      WHERE (participant1_id = ? AND participant2_id = ?) 
         OR (participant1_id = ? AND participant2_id = ?)
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);

    let conversationId;

    if (existingConversations.length > 0) {
      conversationId = existingConversations[0].id;
    } else {
      // Create new conversation
      const [result] = await pool.execute(
        'INSERT INTO conversations (participant1_id, participant2_id) VALUES (?, ?)',
        [Math.min(currentUserId, otherUserId), Math.max(currentUserId, otherUserId)]
      );
      conversationId = result.insertId;
    }

    res.json({
      success: true,
      data: {
        conversationId,
        otherUser: otherUsers[0]
      }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation'
    });
  }
});

// Get conversation details by ID
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const [conversations] = await pool.execute(`
      SELECT 
        c.id,
        c.participant1_id,
        c.participant2_id,
        CASE 
          WHEN c.participant1_id = ? THEN u2.id
          ELSE u1.id
        END as other_user_id,
        CASE 
          WHEN c.participant1_id = ? THEN u2.username
          ELSE u1.username
        END as other_user_username,
        CASE 
          WHEN c.participant1_id = ? THEN u2.full_name
          ELSE u1.full_name
        END as other_user_full_name,
        CASE 
          WHEN c.participant1_id = ? THEN u2.avatar_url
          ELSE u1.avatar_url
        END as other_user_avatar_url,
        CASE 
          WHEN c.participant1_id = ? THEN u2.is_online
          ELSE u1.is_online
        END as other_user_is_online,
        CASE 
          WHEN c.participant1_id = ? THEN u2.last_seen
          ELSE u1.last_seen
        END as other_user_last_seen
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE c.id = ? AND (c.participant1_id = ? OR c.participant2_id = ?)
    `, [userId, userId, userId, userId, userId, userId, conversationId, userId, userId]);

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const conversation = conversations[0];

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          otherUser: {
            id: conversation.other_user_id,
            username: conversation.other_user_username,
            fullName: conversation.other_user_full_name,
            avatarUrl: conversation.other_user_avatar_url,
            isOnline: Boolean(conversation.other_user_is_online),
            lastSeen: conversation.other_user_last_seen
          }
        }
      }
    });

  } catch (error) {
    console.error('Get conversation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation details'
    });
  }
});

module.exports = router;
