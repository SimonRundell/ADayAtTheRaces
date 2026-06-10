/**
 * socket/index.js — Socket.io connection handler.
 *
 * Authenticates the handshake token (guests without a token are allowed
 * as spectators). All race events are broadcast globally so every
 * connected client receives them without needing to join rooms.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import jwt            from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

/**
 * @param {import('socket.io').Server} io
 */
export function initSocket(io) {
  // Attach user info from the JWT handshake token if present
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try { socket.user = jwt.verify(token, JWT_SECRET); }
      catch { socket.user = null; }
    } else {
      socket.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    const who = socket.user?.nickname ?? 'guest';
    console.log(`[socket] ${socket.id} connected (${who})`);

    socket.on('disconnect', () => {
      console.log(`[socket] ${socket.id} disconnected`);
    });
  });
}
