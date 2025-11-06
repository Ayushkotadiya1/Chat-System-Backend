import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import {
  getSessions,
  getActiveSessions,
  getPastSessions,
  getSessionMessages,
  getSessionById,
  toggleAiForSession,
} from '../controllers/chatController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * Chat routes
 * All routes require authentication
 */

// Get all chat sessions (active and past)
router.get('/sessions', authenticateToken, getSessions);

// Get only active chat sessions
router.get('/sessions/active', authenticateToken, getActiveSessions);

// Get past/inactive chat sessions
router.get('/sessions/past', authenticateToken, getPastSessions);

// Get messages for a specific session
router.get('/sessions/:sessionId/messages', authenticateToken, getSessionMessages);

// Get session details
router.get('/sessions/:sessionId', authenticateToken, getSessionById);

// Toggle AI reply on/off
router.patch('/sessions/:sessionId/ai', authenticateToken, toggleAiForSession);

// Upload attachment (image/file) and return URL; admin or public allowed
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = (req as any).file as { filename: string; mimetype: string } | undefined;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `${process.env.BACKEND_URL || 'http://localhost:5001'}/uploads/${file.filename}`;
  const type = file.mimetype;
  return res.json({ url, type });
});

export default router;

