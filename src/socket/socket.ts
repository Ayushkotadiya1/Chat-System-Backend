import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  createOrUpdateSession,
  createMessage,
  updateSessionStatus,
  getSession,
} from '../services/chatService';
import fetch from 'node-fetch';

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
          const openaiKey = process.env.OPENAI_API_KEY;
          console.log(aiEnabled, openaiKey);
          if (aiEnabled && openaiKey) {
            // Notify user typing
            io.to(`session:${sessionId}`).emit('typing:admin');

            const prompt = `You are a helpful support assistant. Reply concisely to the user. User message: ${message}`;
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 200,
              }),
            });
            if (!response.ok) {
              throw new Error(`OpenAI API error: ${response.status}`);
            }
            const json = (await response.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            console.log(json);
            const aiText = json?.choices && json.choices.length > 0
              ? json.choices[0]?.message?.content?.trim?.()
              : undefined;
            console.log(aiText);
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
