import { Op } from 'sequelize';
import ChatSession from '../models/ChatSession';
import Message from '../models/Message';

/**
 * Get all chat sessions with message counts and last message time
 * Separates active and past chats
 * @returns Promise with sessions array including message statistics
 */
export async function getAllSessions() {
  try {
    const sessions = await ChatSession.findAll({
      attributes: [
        'id',
        'sessionId',
        'userIp',
        'userAgent',
        'status',
        'aiEnabled',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: Message,
          as: 'messages',
          attributes: [],
          required: false,
        },
      ],
      order: [['updatedAt', 'DESC']],
      group: ['ChatSession.id'],
    });

    // Get message counts and last message times for each session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await Message.count({
          where: { sessionId: session.sessionId },
        });

        const lastMessage = await Message.findOne({
          where: { sessionId: session.sessionId },
          order: [['createdAt', 'DESC']],
          attributes: ['createdAt', 'message', 'senderType'],
        });

        return {
          id: session.id,
          session_id: session.sessionId,
          user_ip: session.userIp,
          user_agent: session.userAgent,
          status: session.status,
          ai_enabled: (session as any).aiEnabled ?? false,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
          message_count: messageCount,
          last_message_at: lastMessage?.createdAt || session.updatedAt,
          last_message: lastMessage?.message || '',
          last_sender_type: lastMessage?.senderType || null,
        };
      })
    );

    return sessionsWithStats;
  } catch (error) {
    console.error('Error fetching all sessions:', error);
    throw error;
  }
}

/**
 * Get active chat sessions (status = 'active')
 * @returns Promise with active sessions array
 */
export async function getActiveSessions() {
  try {
    const sessions = await ChatSession.findAll({
      where: { status: 'active' },
      attributes: [
        'id',
        'sessionId',
        'userIp',
        'userAgent',
        'status',
        'aiEnabled',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: Message,
          as: 'messages',
          attributes: [],
          required: false,
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await Message.count({
          where: { sessionId: session.sessionId },
        });

        const lastMessage = await Message.findOne({
          where: { sessionId: session.sessionId },
          order: [['createdAt', 'DESC']],
          attributes: ['createdAt', 'message', 'senderType'],
        });

        return {
          id: session.id,
          session_id: session.sessionId,
          user_ip: session.userIp,
          user_agent: session.userAgent,
          status: session.status,
          ai_enabled: session.aiEnabled ?? false,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
          message_count: messageCount,
          last_message_at: lastMessage?.createdAt || session.updatedAt,
          last_message: lastMessage?.message || '',
          last_sender_type: lastMessage?.senderType || null,
        };
      })
    );

    return sessionsWithStats;
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    throw error;
  }
}

/**
 * Get past/inactive chat sessions
 * @returns Promise with past sessions array
 */
export async function getPastSessions() {
  try {
    const sessions = await ChatSession.findAll({
      where: {
        status: {
          [Op.in]: ['inactive', 'closed'],
        },
      },
      attributes: [
        'id',
        'sessionId',
        'userIp',
        'userAgent',
        'status',
        'aiEnabled',
        'createdAt',
        'updatedAt',
      ],
      order: [['updatedAt', 'DESC']],
    });

    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await Message.count({
          where: { sessionId: session.sessionId },
        });

        const lastMessage = await Message.findOne({
          where: { sessionId: session.sessionId },
          order: [['createdAt', 'DESC']],
          attributes: ['createdAt', 'message', 'senderType'],
        });

        return {
          id: session.id,
          session_id: session.sessionId,
          user_ip: session.userIp,
          user_agent: session.userAgent,
          status: session.status,
          ai_enabled: session.aiEnabled ?? false,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
          message_count: messageCount,
          last_message_at: lastMessage?.createdAt || session.updatedAt,
          last_message: lastMessage?.message || '',
          last_sender_type: lastMessage?.senderType || null,
        };
      })
    );

    return sessionsWithStats;
  } catch (error) {
    console.error('Error fetching past sessions:', error);
    throw error;
  }
}

/**
 * Get messages for a specific session
 * @param sessionId - Session ID to get messages for
 * @returns Promise with messages array
 */
export async function getMessagesBySession(sessionId: string) {
  try {
    const messages = await Message.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
      attributes: [
        'id',
        'sessionId',
        'message',
        'sender',
        'senderType',
        'attachmentUrl',
        'attachmentType',
        'isAi',
        'createdAt',
      ],
    });

    return messages.map((msg) => ({
      id: msg.id,
      session_id: msg.sessionId,
      message: msg.message,
      sender: msg.sender,
      sender_type: msg.senderType,
      attachment_url: msg.attachmentUrl,
      attachment_type: msg.attachmentType,
      is_ai: msg.isAi,
      created_at: msg.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching messages by session:', error);
    throw error;
  }
}

/**
 * Get a single session by session ID
 * @param sessionId - Session ID to find
 * @returns Promise with session or null
 */
export async function getSession(sessionId: string) {
  try {
    const session = await ChatSession.findOne({
      where: { sessionId },
      attributes: [
        'id',
        'sessionId',
        'userIp',
        'userAgent',
        'status',
        'aiEnabled',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      session_id: session.sessionId,
      user_ip: session.userIp,
      user_agent: session.userAgent,
      status: session.status,
      ai_enabled: session.aiEnabled ?? false,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching session:', error);
    throw error;
  }
}

/**
 * Create or update a chat session
 * @param sessionData - Session data
 * @returns Promise with created/updated session
 */
export async function createOrUpdateSession(sessionData: {
  sessionId: string;
  userIp?: string;
  userAgent?: string;
  status?: 'active' | 'inactive' | 'closed';
}) {
  try {
    const [session, created] = await ChatSession.findOrCreate({
      where: { sessionId: sessionData.sessionId },
      defaults: {
        sessionId: sessionData.sessionId,
        userIp: sessionData.userIp || null,
        userAgent: sessionData.userAgent || null,
        status: sessionData.status || 'active',
      },
    });

    // Update session if it exists
    if (!created) {
      await session.update({
        status: sessionData.status || 'active',
        userIp: sessionData.userIp || session.userIp,
        userAgent: sessionData.userAgent || session.userAgent,
      });
    }

    return session;
  } catch (error) {
    console.error('Error creating/updating session:', error);
    throw error;
  }
}

/**
 * Update session status
 * @param sessionId - Session ID to update
 * @param status - New status
 * @returns Promise with updated session
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'active' | 'inactive' | 'closed'
) {
  try {
    const session = await ChatSession.findOne({
      where: { sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await session.update({ status });
    return session;
  } catch (error) {
    console.error('Error updating session status:', error);
    throw error;
  }
}

/**
 * Create a new message
 * @param messageData - Message data
 * @returns Promise with created message
 */
export async function createMessage(messageData: {
  sessionId: string;
  message: string;
  sender: string;
  senderType: 'user' | 'admin';
  isAi?: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}) {
  try {
    const message = await Message.create({
      sessionId: messageData.sessionId,
      message: messageData.message,
      sender: messageData.sender,
      senderType: messageData.senderType,
      isAi: messageData.isAi || false,
      attachmentUrl: messageData.attachmentUrl || null,
      attachmentType: messageData.attachmentType || null,
    });

    // Update session updated_at timestamp
    await ChatSession.update(
      { updatedAt: new Date() },
      { where: { sessionId: messageData.sessionId } }
    );

    return {
      id: message.id,
      session_id: message.sessionId,
      message: message.message,
      sender: message.sender,
      sender_type: message.senderType,
      is_ai: message.isAi,
      attachment_url: message.attachmentUrl,
      attachment_type: message.attachmentType,
      created_at: message.createdAt,
    };
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}
