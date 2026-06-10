/**
 * auth.js — JWT verification middleware for Express routes.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(__dirname, '../.config.json'), 'utf8'));

/** Signing secret — set jwtSecret in server/.config.json */
export const JWT_SECRET = cfg.jwtSecret || 'adatr_dev_secret_change_this';

/** Attach req.user from a valid Bearer token; reject 401 if missing or invalid */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/** Reject non-admin users with 403 */
export function requireAdmin(req, res, next) {
  if (!req.user?.admin) return res.status(403).json({ message: 'Admin access required' });
  next();
}
