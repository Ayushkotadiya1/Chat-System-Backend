import express from 'express';
import { login, verifyToken } from '../controllers/authController';

const router = express.Router();

// Login endpoint
router.post('/login', login);

// Verify token endpoint
router.get('/verify', verifyToken);

export default router;

