/**
 * routes/admin.js — admin-only race management endpoints.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { Router }                    from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { topUpRaces }                from '../services/racePool.js';
import { startRaceNow }              from '../services/raceScheduler.js';
import db                            from '../db.js';

const router = Router();

/** POST /admin/topup — manually fill the race pool to its target */
router.post('/topup', authenticate, requireAdmin, async (_req, res) => {
  try {
    const created = await topUpRaces(db);
    res.json({ message: `${created} race(s) added to pool`, created });
  } catch (err) {
    console.error('[admin] topup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /admin/start-race/:id — immediately start a specific pending race */
router.post('/start-race/:id', authenticate, requireAdmin, async (req, res) => {
  const raceID = parseInt(req.params.id, 10);
  if (isNaN(raceID)) return res.status(400).json({ message: 'Invalid race ID' });
  try {
    await startRaceNow(raceID);
    res.json({ message: `Race ${raceID} starting` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
