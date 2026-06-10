/**
 * services/racePool.js — keeps the pending race queue topped up.
 *
 * Called on server startup and after each completed race. Generates
 * new races using the same odds algorithm as the client so the figures
 * are always consistent.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { calculateOdds } from '../common.js';

const TARGET = 30;

const RACECOURSES = [
  'Ascot Racecourse',        'Aintree Racecourse',       'Cheltenham Racecourse',
  'Epsom Downs Racecourse',  'Exeter Racecourse',        'Newmarket Racecourse',
  'Newton Abbott Racecourse','York Racecourse',           'Chester Racecourse',
  'Goodwood Racecourse',     'Haydock Park Racecourse',  'Sandown Park Racecourse',
  'Kempton Park Racecourse', 'Doncaster Racecourse',     'Windsor Racecourse',
  'Salisbury Racecourse',    'Lingfield Park Racecourse','Ayr Racecourse',
  'Musselburgh Racecourse',  'Hamilton Park Racecourse', 'Perth Racecourse',
  'Chepstow Racecourse',     'Bangor-on-Dee Racecourse', 'Ffos Las Racecourse',
  'Down Royal Racecourse',   'Downpatrick Racecourse',
];

const RACE_TYPES = [
  { over: 'flat',   col: 'horseFlatRating' },
  { over: 'chase',  col: 'horseChaseRating' },
  { over: 'hurdle', col: 'horseHurdleRating' },
];

const GOING     = ['Good', 'Good to Firm', 'Good to Soft', 'Soft'];
const DISTANCES = [402, 603];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Ensure at least TARGET pending races exist in tblrace.
 * New races are scheduled `intervalMinutes` after the current latest pending
 * race so the queue always extends naturally into the future.
 *
 * @param {import('mysql2/promise').Pool} db
 * @param {number} intervalMinutes  gap between consecutive race start times (default 15)
 * @returns {Promise<number>} number of races created
 */
export async function topUpRaces(db, intervalMinutes = 15) {
  const [[{ cnt }]] = await db.execute(
    'SELECT COUNT(*) AS cnt FROM tblrace WHERE status = 0'
  );
  const toCreate = TARGET - Number(cnt);
  if (toCreate <= 0) return 0;

  // Find the last scheduled time; append new races after it (but never in the past)
  const [[{ lastTime }]] = await db.execute(
    'SELECT MAX(racetime) AS lastTime FROM tblrace WHERE status = 0'
  );
  const anchor = lastTime
    ? new Date(Math.max(new Date(lastTime).getTime(), Date.now()))
    : new Date();

  let created = 0;

  for (let i = 0; i < toCreate; i++) {
    const type = pick(RACE_TYPES);

    // ORDER BY RAND() on our small horse table is fine
    const [horses] = await db.execute(
      `SELECT * FROM tblhorse WHERE \`${type.col}\` IS NOT NULL AND \`${type.col}\` > 0
       ORDER BY RAND() LIMIT 12`
    );
    if (horses.length < 6) continue;

    const count    = 6 + Math.floor(Math.random() * (horses.length - 5));
    const selected = horses.slice(0, count);
    const runners  = calculateOdds(selected, type.over);

    // Each new race is intervalMinutes after the previous one
    const raceTime = new Date(anchor.getTime() + (created + 1) * intervalMinutes * 60 * 1000);
    const raceStr  = raceTime.toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      `INSERT INTO tblrace (racecourse, racetime, distance, raceover, going, runners)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pick(RACECOURSES), raceStr, pick(DISTANCES), type.over, pick(GOING), JSON.stringify(runners)]
    );
    created++;
  }

  return created;
}
