/**
 * index.js — A Day At The Races game server.
 *
 * Exposes a REST API (Express) and a real-time race channel (Socket.io).
 * The race scheduler runs autonomously, starting races at their scheduled
 * times and topping up the race pool after each completion.
 *
 * Start with:  node index.js          (production)
 *              node --watch index.js  (development auto-restart)
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import express       from 'express';
import { createServer } from 'http';
import { Server }    from 'socket.io';
import cors          from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import db            from './db.js';
import authRouter    from './routes/auth.js';
import racesRouter   from './routes/races.js';
import adminRouter   from './routes/admin.js';
import { initSocket }    from './socket/index.js';
import { init as initScheduler } from './services/raceScheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(__dirname, '.config.json'), 'utf8'));

const PORT = cfg.serverPort ?? 3001;

// Allowed origins for CORS and Socket.io
const ORIGINS = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  `http://localhost:${PORT}`,
];

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: ORIGINS, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ORIGINS }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/auth',  authRouter);
app.use('/races', racesRouter);
app.use('/admin', adminRouter);
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// ── Socket.io ──────────────────────────────────────────────────────
initSocket(io);

// ── Race scheduler (runs races, tops up pool) ──────────────────────
initScheduler(io, db, cfg.raceIntervalMinutes ?? 15);

// ── Start listening ────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[server] A Day At The Races running on port ${PORT}`);
});
