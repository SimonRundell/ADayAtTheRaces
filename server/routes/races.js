/**
 * routes/races.js — race card, bet placement, and bets list.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { Router }       from 'express';
import db               from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { computePayout } from '../common.js';

const router = Router();

/** GET /races/card — pending races ordered by scheduled time */
router.get('/card', async (_req, res) => {
  try {
    const [races] = await db.execute(
      `SELECT id, racecourse, racetime, distance, raceover, going, runners, status
       FROM tblrace WHERE status = 0
       ORDER BY racetime ASC LIMIT 50`
    );
    res.json(races.map(r => ({ ...r, runners: JSON.parse(r.runners) })));
  } catch (err) {
    console.error('[races] card error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /races/results — last 20 completed races */
router.get('/results', async (_req, res) => {
  try {
    const [races] = await db.execute(
      `SELECT id, racecourse, racetime, distance, raceover, going, result
       FROM tblrace WHERE status = 2
       ORDER BY racetime DESC LIMIT 20`
    );
    res.json(races.map(r => ({
      ...r,
      result: r.result ? JSON.parse(r.result) : [],
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /races/bets — open bets for the authenticated user */
router.get('/bets', authenticate, async (req, res) => {
  try {
    const [bets] = await db.execute(
      `SELECT b.id, b.raceID, b.horseID, b.stake, b.ew,
              r.racecourse, r.racetime, h.horseName
       FROM tblbets b
       JOIN tblrace  r ON r.id = b.raceID
       JOIN tblhorse h ON h.id = b.horseID
       WHERE b.punterID = ? AND r.status < 2
       ORDER BY r.racetime ASC`,
      [req.user.id]
    );
    res.json(bets);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /races/past-bets — settled bets for the authenticated user,
 * with finishing position, odds, returns, and net profit/loss.
 */
router.get('/past-bets', authenticate, async (req, res) => {
  try {
    const [bets] = await db.execute(
      `SELECT b.id, b.raceID, b.horseID, b.stake, b.ew,
              r.racecourse, r.racetime, r.result,
              h.horseName
       FROM tblbets b
       JOIN tblrace  r ON r.id  = b.raceID
       JOIN tblhorse h ON h.id  = b.horseID
       WHERE b.punterID = ? AND b.paidOut = 1
       ORDER BY r.racetime DESC
       LIMIT 50`,
      [req.user.id]
    );

    const settled = bets.map(bet => {
      const raceResult = bet.result ? JSON.parse(bet.result) : [];
      const numRunners = raceResult.length;

      // De-duplicate the result in case any old race has a corrupt entry
      const seen   = new Set();
      const unique = raceResult.filter(h => !seen.has(h.id) && seen.add(h.id));

      const finisher = unique.find(h => Number(h.id) === Number(bet.horseID));
      let returns = 0;

      if (finisher) {
        returns = computePayout(
          parseFloat(bet.stake), !!bet.ew, numRunners, finisher.place, finisher.odds ?? ''
        );
      }

      const stake = parseFloat(bet.stake);
      return {
        id:         bet.id,
        raceID:     bet.raceID,
        racecourse: bet.racecourse,
        racetime:   bet.racetime,
        horseName:  bet.horseName,
        stake,
        ew:         !!bet.ew,
        place:      finisher ? finisher.place : null,
        odds:       finisher ? finisher.odds  : null,
        returns:    parseFloat(returns.toFixed(2)),
        net:        parseFloat((returns - stake).toFixed(2)),
      };
    });

    res.json(settled);
  } catch (err) {
    console.error('[races] past-bets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /races/bet — place a win or each-way bet */
router.post('/bet', authenticate, async (req, res) => {
  const { raceID, horseID, stake, ew } = req.body;
  if (!raceID || !horseID || !stake)
    return res.status(400).json({ message: 'raceID, horseID, and stake are required' });

  const punterID = req.user.id;

  try {
    const [[userRow]] = await db.execute(
      'SELECT wallet FROM tbluser WHERE id = ?', [punterID]
    );
    if (!userRow) return res.status(404).json({ message: 'User not found' });

    const wallet   = parseFloat(userRow.wallet);
    // The client already doubles the stake for E/W (win leg + place leg),
    // so stake arriving here is always the total amount to deduct.
    const betTotal = parseFloat(stake);
    if (wallet < betTotal)
      return res.status(400).json({ message: 'Insufficient funds' });

    await db.execute(
      'INSERT INTO tblbets (raceID, horseID, stake, punterID, ew, paidOut) VALUES (?, ?, ?, ?, ?, 0)',
      [raceID, horseID, betTotal, punterID, ew ? 1 : 0]
    );

    const newWallet = parseFloat((wallet - betTotal).toFixed(2));
    await db.execute('UPDATE tbluser SET wallet = ? WHERE id = ?', [newWallet, punterID]);

    res.json({ message: 'Bet placed', wallet: newWallet });
  } catch (err) {
    console.error('[races] bet error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /races/:id — single race with full runner data */
router.get('/:id', async (req, res) => {
  try {
    const [[race]] = await db.execute('SELECT * FROM tblrace WHERE id = ?', [req.params.id]);
    if (!race) return res.status(404).json({ message: 'Race not found' });
    res.json({ ...race, runners: JSON.parse(race.runners) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
