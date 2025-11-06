import { Request, Response } from 'express';
import {
  getAllSessions,
  getActiveSessions as getActiveSessionsService,
  getPastSessions as getPastSessionsService,
  getMessagesBySession,
  getSession,
} from '../services/chatService';
import ChatSession from '../models/ChatSession';

/**
 * Get all chat sessions (active and past)
 */
export async function getSessions(req: Request, res: Response): Promise<Response> {
  try {
    const sessions = await getAllSessions();
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get only active chat sessions
 */
export async function getActiveSessions(req: Request, res: Response): Promise<Response> {
  try {
    const sessions = await getActiveSessionsService();
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get past/inactive chat sessions
 */
export async function getPastSessions(req: Request, res: Response): Promise<Response> {
  try {
    const sessions = await getPastSessionsService();
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching past sessions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get messages for a specific session
 */
export async function getSessionMessages(req: Request, res: Response): Promise<Response> {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const messages = await getMessagesBySession(sessionId);
    return res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get a single session by ID
 */
export async function getSessionById(req: Request, res: Response): Promise<Response> {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Toggle AI auto-reply for a session
 */
export async function toggleAiForSession(req: Request, res: Response): Promise<Response> {
  try {
    const { sessionId } = req.params;
    const { enabled } = req.body as { enabled: boolean };
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) is required' });
    }
    const session = await ChatSession.findOne({ where: { sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await session.update({ aiEnabled: enabled });
    return res.json({ session_id: sessionId, ai_enabled: session.aiEnabled });
  } catch (error) {
    console.error('Error toggling AI:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
