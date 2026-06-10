/**
 * routes/auth.js — login, register, and token-refresh endpoints.
 *
 * Passwords are stored as bcrypt hashes. Legacy MD5 hashes (from the PHP
 * era) are detected at login and automatically upgraded to bcrypt.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { Router }      from 'express';
import bcrypt          from 'bcryptjs';
import jwt             from 'jsonwebtoken';
import { createHash }  from 'crypto';
import db              from '../db.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

const md5 = (str) => createHash('md5').update(str).digest('hex');

/** Shape the user object returned to the client. */
const publicUser = (u) => ({
  id:       u.id,
  email:    u.email,
  nickname: u.nickname,
  wallet:   parseFloat(u.wallet),
  admin:    u.admin,
});

/** POST /auth/login */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const [rows] = await db.execute('SELECT * FROM tbluser WHERE email = ?', [email]);
    if (!rows.length)
      return res.status(401).json({ message: 'Invalid email or password' });

    const user = rows[0];
    let valid = false;

    if (user.passwordHash.startsWith('$2')) {
      // Modern bcrypt hash
      valid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Legacy MD5 hash — verify and transparently upgrade
      valid = user.passwordHash === md5(password);
      if (valid) {
        const newHash = await bcrypt.hash(password, 12);
        await db.execute('UPDATE tbluser SET passwordHash = ? WHERE id = ?', [newHash, user.id]);
      }
    }

    if (!valid)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname, admin: user.admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /auth/register */
router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  if (!email || !password || !nickname)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const [existing] = await db.execute('SELECT id FROM tbluser WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ message: 'That email address is already registered' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO tbluser (email, passwordHash, nickname, wallet, admin) VALUES (?, ?, ?, 100.00, 0)',
      [email, hash, nickname]
    );

    res.status(201).json({ message: 'Registration successful', id: result.insertId });
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /auth/me — validate stored token and return fresh user data */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, nickname, wallet, admin FROM tbluser WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
