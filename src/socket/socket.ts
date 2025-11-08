import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  createOrUpdateSession,
  createMessage,
  updateSessionStatus,
  getSession,
} from '../services/chatService';
import Groq from 'groq-sdk';

/**
 * Chat message interface
 */
interface ChatMessage {
  sessionId: string;
  message: string;
  sender: string;
  senderType: 'user' | 'admin';
  isAi?: boolean;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

/**
 * Setup Socket.IO event handlers
 * Handles real-time communication between customers and admins
 * @param io - Socket.IO server instance
 */
export function setupSocketIO(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    /**
     * Handle new user connection
     * Creates or updates chat session
     */
    socket.on('user:connect', async (data: { sessionId?: string; userIp?: string; userAgent?: string }) => {
      try {
        let sessionId = data.sessionId;

        // Generate new session ID if not provided
        if (!sessionId) {
          sessionId = uuidv4();
        }

        // Create or update session
        await createOrUpdateSession({
          sessionId,
          userIp: data.userIp || 'unknown',
          userAgent: data.userAgent || 'unknown',
          status: 'active',
        });

        // Join session room
        socket.join(`session:${sessionId}`);
        socket.emit('user:connected', { sessionId });
        console.log(`📱 User connected with session: ${sessionId}`);
      } catch (error) {
        console.error('Error handling user connection:', error);
        socket.emit('error', { message: 'Failed to establish connection' });
      }
    });

    /**
     * Handle user messages
     * Saves message to database and broadcasts to admins
     */
    socket.on('message:user', async (data: ChatMessage) => {
      try {
        console.log(data);
        const { sessionId, message, sender, attachmentUrl, attachmentType } = data;

        // Validate input
        if (!sessionId || !message || !message.trim()) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Save message to database using service
        const savedMessage = await createMessage({
          sessionId,
          message: message.trim(),
          sender: sender || 'User',
          senderType: 'user',
          isAi: false,
          attachmentUrl,
          attachmentType,
        });

        // Prepare message data for real-time transmission
        const messageData = {
          sessionId,
          message: savedMessage.message,
          sender: savedMessage.sender,
          senderType: 'user' as const,
          isAi: savedMessage.is_ai,
          attachmentUrl: (savedMessage as any).attachment_url,
          attachmentType: (savedMessage as any).attachment_type,
          timestamp: savedMessage.created_at.toISOString(),
        };

        // Broadcast to all admins in the admin room
        io.to('admin').emit('message:new', messageData);

        // Send confirmation back to sender
        socket.emit('message:sent', messageData);

        console.log(`💬 User message from ${sessionId}: ${message.substring(0, 50)}...`);

        // If AI is enabled for this session, generate a reply (optional)
        try {
          const session = await getSession(sessionId);
          const aiEnabled = (session as any)?.ai_enabled;
          const groqApiKey = process.env.GROQ_API_KEY;
          console.log('AI Enabled:', aiEnabled, 'Groq Key:', groqApiKey ? 'Present' : 'Missing');

          if (aiEnabled && groqApiKey) {
            // Notify user that AI is typing
            io.to(`session:${sessionId}`).emit('typing:admin');

            // Initialize Groq client
            const groq = new Groq({
              apiKey: groqApiKey,
            });

            const prompt = `You are a helpful and friendly customer support assistant. Reply concisely and professionally to the user's message. Keep responses brief and to the point. User message: ${message}`;

            try {
              // Call Groq API with latest model
              const completion = await groq.chat.completions.create({
                messages: [
                  {
                    role: 'system',
                    content: 'You are a helpful customer support assistant. Provide concise, professional, and friendly responses.',
                  },
                  {
                    role: 'user',
                    content: prompt,
                  },
                ],
                model: 'llama-3.1-70b-versatile', // Latest Groq model
                temperature: 0.7,
                max_tokens: 300,
                top_p: 1,
                stream: false,
              });

              const aiText = completion.choices[0]?.message?.content?.trim();
              console.log('Groq AI Response:', aiText);

              if (aiText) {
                const aiSaved = await createMessage({
                  sessionId,
                  message: aiText,
                  sender: 'AI',
                  senderType: 'admin',
                  isAi: true,
                });

                const aiMessageData = {
                  sessionId,
                  message: aiSaved.message,
                  sender: 'AI',
                  senderType: 'admin' as const,
                  isAi: true,
                  timestamp: (aiSaved as any).created_at.toISOString(),
                };

                // Send AI reply to the user session and notify admins
                io.to(`session:${sessionId}`).emit('message:received', aiMessageData);
                io.to('admin').emit('message:new', aiMessageData);
                io.to(`session:${sessionId}`).emit('typing:admin:stop');
              } else {
                throw new Error('Empty response from Groq API');
              }
            } catch (groqError: any) {
              console.error('Groq API error:', groqError);
              // Stop typing indicator on error
              io.to(`session:${sessionId}`).emit('typing:admin:stop');

              // Optionally send an error message to user
              if (groqError.status === 429) {
                console.error('Groq API rate limit exceeded');
              } else if (groqError.status === 401) {
                console.error('Invalid Groq API key');
              }
            }
          }
        } catch (err) {
          console.error('AI reply error:', err);
          io.to(`session:${sessionId}`).emit('typing:admin:stop');
        }
      } catch (error) {
        console.error('Error handling user message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Handle admin messages
     * Saves message to database and sends to specific session
     */
    socket.on('message:admin', async (data: ChatMessage) => {
      try {
        const { sessionId, message, sender, attachmentUrl, attachmentType } = data;

        // Validate input
        if (!sessionId || !message || !message.trim()) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Save message to database using service
        const savedMessage = await createMessage({
          sessionId,
          message: message.trim(),
          sender: sender || 'Admin',
          senderType: 'admin',
          isAi: false,
          attachmentUrl,
          attachmentType,
        });

        // Prepare message data for real-time transmission
        const messageData = {
          sessionId,
          message: savedMessage.message,
          sender: savedMessage.sender,
          senderType: 'admin' as const,
          isAi: savedMessage.is_ai,
          attachmentUrl: (savedMessage as any).attachment_url,
          attachmentType: (savedMessage as any).attachment_type,
          timestamp: savedMessage.created_at.toISOString(),
        };

        // Send to the specific session room
        io.to(`session:${sessionId}`).emit('message:received', messageData);

        // Send confirmation back to admin
        socket.emit('message:sent', messageData);

        console.log(`👨‍💼 Admin message to ${sessionId}: ${message.substring(0, 50)}...`);
      } catch (error) {
        console.error('Error handling admin message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Handle admin joining admin room
     * Allows admin to receive all user messages
     */
    socket.on('admin:join', () => {
      socket.join('admin');
      console.log(`👨‍💼 Admin joined: ${socket.id}`);
    });

    /**
     * Handle typing indicators - start typing
     */
    socket.on('typing:start', (data: { sessionId: string; senderType: 'user' | 'admin' }) => {
      if (!data.sessionId || !data.senderType) {
        return;
      }

      if (data.senderType === 'user') {
        // Broadcast to all admins that user is typing
        io.to('admin').emit('typing:user', { sessionId: data.sessionId });
      } else {
        // Broadcast to specific session that admin is typing
        io.to(`session:${data.sessionId}`).emit('typing:admin');
      }
    });

    /**
     * Handle typing indicators - stop typing
     */
    socket.on('typing:stop', (data: { sessionId: string; senderType: 'user' | 'admin' }) => {
      if (!data.sessionId || !data.senderType) {
        return;
      }

      if (data.senderType === 'user') {
        // Notify admins that user stopped typing
        io.to('admin').emit('typing:user:stop', { sessionId: data.sessionId });
      } else {
        // Notify session that admin stopped typing
        io.to(`session:${data.sessionId}`).emit('typing:admin:stop');
      }
    });

    /**
     * Handle session closure
     * Marks session as inactive when user disconnects
     */
    socket.on('session:close', async (data: { sessionId: string }) => {
      try {
        if (data.sessionId) {
          await updateSessionStatus(data.sessionId, 'inactive');
          console.log(`🔒 Session closed: ${data.sessionId}`);
        }
      } catch (error) {
        console.error('Error closing session:', error);
      }
    });

    /**
     * Handle client disconnection
     */
    socket.on('disconnect', async () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      // Try to find and mark session as inactive if user disconnected
      // This is a best-effort attempt
      try {
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('session:')) {
            const sessionId = room.replace('session:', '');
            // Only mark as inactive if no other sockets are in this room
            const roomSockets = await io.in(room).fetchSockets();
            if (roomSockets.length === 0) {
              await updateSessionStatus(sessionId, 'inactive');
              console.log(`🔒 Auto-closed inactive session: ${sessionId}`);
            }
          }
        }
      } catch (error) {
        console.error('Error handling disconnect cleanup:', error);
      }
    });
  });
}
