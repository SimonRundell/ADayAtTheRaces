/**
 * services/raceScheduler.js — automatic race timing and pool management.
 *
 * Uses node-cron to check every minute for races due to start, then fires
 * them with setTimeout for accurate timing. Also tops up the race pool
 * every 5 minutes and once on startup.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import cron       from 'node-cron';
import { runRace }    from './raceEngine.js';
import { topUpRaces } from './racePool.js';

let _io              = null;
let _db              = null;
let _intervalMinutes = 15;
const activeRaceIDs  = new Set(); // prevent duplicate race starts

/**
 * Initialise the scheduler. Must be called once after Express and
 * Socket.io are fully set up.
 *
 * @param {import('socket.io').Server}       io
 * @param {import('mysql2/promise').Pool}    db
 * @param {number} intervalMinutes  minutes between scheduled race start times
 */
export function init(io, db, intervalMinutes = 15) {
  _io              = io;
  _db              = db;
  _intervalMinutes = intervalMinutes;

  // Initial pool top-up on startup
  topUpRaces(db, _intervalMinutes)
    .then(n => { if (n > 0) console.log(`[scheduler] Startup: added ${n} races`); })
    .catch(err => console.error('[scheduler] startup topUp error:', err));

  // Check for due races every minute
  cron.schedule('* * * * *', _checkScheduledRaces);

  // Replenish pool every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const n = await topUpRaces(db, _intervalMinutes);
      if (n > 0) {
        console.log(`[scheduler] Added ${n} race(s) to pool`);
        io.emit('race:pool-updated');
      }
    } catch (err) {
      console.error('[scheduler] pool topUp error:', err);
    }
  });
}

async function _checkScheduledRaces() {
  if (!_db) return;
  try {
    // Pick up races whose time falls within the next minute
    const [races] = await _db.execute(
      `SELECT * FROM tblrace
       WHERE status = 0 AND racetime <= DATE_ADD(NOW(), INTERVAL 1 MINUTE)
       ORDER BY racetime ASC LIMIT 5`
    );

    for (const race of races) {
      if (activeRaceIDs.has(race.id)) continue;

      race.runners = JSON.parse(race.runners);
      activeRaceIDs.add(race.id);

      const fireAt = Math.max(0, new Date(race.racetime).getTime() - Date.now());
      setTimeout(() => _fireRace(race), fireAt);
    }
  } catch (err) {
    console.error('[scheduler] check error:', err);
  }
}

async function _fireRace(race) {
  console.log(`[scheduler] Starting race ${race.id} — ${race.racecourse}`);
  try {
    await runRace(race, _io, _db);
    const n = await topUpRaces(_db, _intervalMinutes);
    if (n > 0) console.log(`[scheduler] Topped up ${n} race(s) after race ${race.id}`);
    _io.emit('race:pool-updated');
  } catch (err) {
    console.error(`[scheduler] Race ${race.id} error:`, err);
  } finally {
    activeRaceIDs.delete(race.id);
  }
}

/**
 * Manually start a specific pending race immediately (admin action).
 * Safe to call even if the scheduler hasn't picked the race up yet.
 *
 * @param {number} raceID
 */
export async function startRaceNow(raceID) {
  if (!_io || !_db) throw new Error('Scheduler not initialised');
  if (activeRaceIDs.has(raceID)) throw new Error(`Race ${raceID} is already running`);

  const [[race]] = await _db.execute('SELECT * FROM tblrace WHERE id = ?', [raceID]);
  if (!race) throw new Error(`Race ${raceID} not found`);
  if (race.status !== 0) throw new Error(`Race ${raceID} is not pending (status ${race.status})`);

  race.runners = JSON.parse(race.runners);
  activeRaceIDs.add(raceID);
  _fireRace(race); // intentionally not awaited — returns immediately, race runs in background
}
