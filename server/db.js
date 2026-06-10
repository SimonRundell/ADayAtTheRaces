/**
 * db.js — mysql2 connection pool, shared across all routes and services.
 * Reads credentials from .config.json in the same directory.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(__dirname, '.config.json'), 'utf8'));

const pool = mysql.createPool({
  host:             cfg.servername,
  user:             cfg.username,
  password:         cfg.password,
  database:         cfg.dbname,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
});

export default pool;
