import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByUsername } from '../services/authService';

/**
 * Login controller
 * Authenticates user and returns JWT token
 */
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user in database
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Verify JWT token controller
 * Validates token and returns user information
 */
export async function verifyToken(req: Request, res: Response): Promise<Response> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: number;
      username: string;
      role: string;
    };

    return res.json({
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
