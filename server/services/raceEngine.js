/**
 * services/raceEngine.js — server-side race simulation engine.
 *
 * Runs the race algorithm (ported directly from the original RunRace.jsx)
 * and broadcasts position updates and results via Socket.io. All connected
 * clients receive the same ticks, enabling genuine multiplayer spectating.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

import { capitalizeFirstLetter, calculateOdds, computePayout } from '../common.js';

/** Broadcast position snapshots this often (ms) */
const TICK_MS = 200;

/** Target wall-clock milliseconds for the race winner to cross the line */
const TARGET_DURATION_MS = 30000;

/**
 * Day-form multiplier range applied to each runner's base rating when building
 * the chances array.  A horse can run anywhere between DAY_FORM_MIN and
 * DAY_FORM_MAX of its official rating, modelling good/bad days, jockey
 * performance, ground conditions, etc.  Wider range = more upsets.
 */
const DAY_FORM_MIN = 0.75;
const DAY_FORM_MAX = 1.25;

/**
 * Run a race to completion, broadcasting progress via Socket.io.
 *
 * @param {object}  race - full race row with runners already JSON-parsed
 * @param {import('socket.io').Server} io
 * @param {import('mysql2/promise').Pool} db
 * @returns {Promise<{ results: object[], winningsMap: Map<number,number> }>}
 */
export async function runRace(race, io, db) {
  const { id: raceID, runners, distance, raceover } = race;
  const ratingKey = `horse${capitalizeFirstLetter(raceover)}Rating`;

  // --- Build the chances array ---
  // Each runner's base rating is scaled by a random day-form factor before
  // being loaded into the chances array.  This means official ratings are a
  // guide rather than a sentence: a 108-rated horse that draws a factor of 1.25
  // can outrun a 130-rated horse that draws 0.75 on the day.
  const chances = [];
  runners.forEach(runner => {
    const rating    = Number(runner[ratingKey]);
    const dayFactor = DAY_FORM_MIN + Math.random() * (DAY_FORM_MAX - DAY_FORM_MIN);
    const effective = Math.max(1, Math.round(rating * dayFactor));
    // Lucky-break bonus: 1-in-10 chance of 30 extra entries (exceptional run)
    if (Math.floor(Math.random() * 10) === 5) {
      for (let j = 0; j < 30; j++) chances.push(runner.id);
    }
    for (let i = 0; i < effective; i++) chances.push(runner.id);
  });

  // Recompute odds at run-time so payouts always use the current formula,
  // regardless of what was stored in the DB when the race was created.
  const runnersWithOdds = calculateOdds(runners, raceover);

  // --- Mutable progress state (mutated in-place for performance) ---
  const progress = runnersWithOdds.map(runner => ({
    id:       runner.id,
    name:     runner.horseName,
    distance: 0,
    odds:     runner.odds,
    rating:   Number(runner[ratingKey]),
  }));

  // --- Mark race in progress and notify all clients ---
  await db.execute('UPDATE tblrace SET status = 1 WHERE id = ?', [raceID]);

  io.emit('race:starting', {
    raceID,
    racecourse: race.racecourse,
    raceover,
    distance,
    going:      race.going,
    racetime:   race.racetime,
    runners,
  });

  // Brief pause so clients can switch to the race view before ticks arrive
  await delay(2000);

  // --- Pace calculation ------------------------------------------------
  // Find whichever horse ended up with the most entries after day-form is
  // applied (not necessarily the highest-rated one) and use its share of the
  // chances pool to estimate steps-to-finish, then derive stepsPerTick.
  const chanceMap = new Map();
  for (const id of chances) chanceMap.set(id, (chanceMap.get(id) ?? 0) + 1);
  const topCount          = Math.max(...chanceMap.values());
  const estimatedWinSteps = Math.ceil(distance * chances.length / topCount);
  const stepsPerTick      = Math.max(1, Math.round(estimatedWinSteps / (TARGET_DURATION_MS / TICK_MS)));

  // --- Main simulation loop ---
  const results      = [];
  const finishedIds  = new Set(); // horses already recorded, excluded from future checks
  let currentChances = [...chances];
  let placeCounter   = 1;
  let stepCount      = 0;

  while (results.length < runners.length - 1) {
    const moverID = currentChances[Math.floor(Math.random() * currentChances.length)];

    // All horses use the same movement distribution — selection frequency
    // (via the day-form-adjusted chances array) is the sole differentiator.
    const moveDistance = Math.floor(Math.random() * 3);
    const boost = Math.floor(Math.random() * 200) === 25 ? 5 : 0;

    const runner = progress.find(r => r.id === moverID);
    if (runner) runner.distance += moveDistance + boost;

    // Sort descending by distance then find the first horse that has crossed
    // the line and hasn't been recorded yet. Using find() avoids the
    // sort-stability trap where a finished horse with equal distance to a new
    // finisher could occupy sorted[placeCounter-1] and be recorded twice.
    const sorted       = [...progress].sort((a, b) => b.distance - a.distance);
    const nextFinisher = sorted.find(r => !finishedIds.has(r.id) && r.distance >= distance);
    if (nextFinisher) {
      results.push({ ...nextFinisher, place: placeCounter });
      finishedIds.add(nextFinisher.id);
      currentChances = currentChances.filter(c => c !== nextFinisher.id);
      placeCounter++;
    }

    // Broadcast current positions and yield to the event loop every stepsPerTick
    // steps, holding for TICK_MS so clients can animate the movement smoothly.
    if (++stepCount % stepsPerTick === 0) {
      io.emit('race:tick', progress.map(p => ({ ...p })));
      await delay(TICK_MS);
    }
  }

  // --- Handle last horse ---
  const lastHorse = progress.find(r => !finishedIds.has(r.id));
  if (lastHorse) {
    lastHorse.distance = distance;
    results.push({ ...lastHorse, place: runners.length });
  }

  // Final positions broadcast
  io.emit('race:tick', progress.map(p => ({ ...p })));

  // --- Settle bets, update wallets ---
  const winningsMap = await settleBets(raceID, results, runners.length, db);

  // --- Persist results and mark complete ---
  await db.execute(
    'UPDATE tblrace SET status = 2, result = ? WHERE id = ?',
    [JSON.stringify(results), raceID]
  );

  io.emit('race:result', {
    raceID,
    results,
    winningsMap: Object.fromEntries(winningsMap), // { "userId": amount }
  });

  return { results, winningsMap };
}

/**
 * Settle all open bets for a completed race, credit wallets, and return
 * a map of userID → total winnings for the socket broadcast.
 *
 * @param {number}  raceID
 * @param {object[]} results     - ordered by place ascending
 * @param {number}  numRunners
 * @param {import('mysql2/promise').Pool} db
 * @returns {Promise<Map<number,number>>}
 */
async function settleBets(raceID, results, numRunners, db) {
  const [bets] = await db.execute(
    'SELECT * FROM tblbets WHERE raceID = ? AND paidOut = 0',
    [raceID]
  );

  const topThree    = results.slice(0, 3);
  const topThreeIds = topThree.map(r => r.id);
  const winnings    = new Map(); // userID → total winnings

  for (const bet of bets) {
    const horse  = results.find(h => h.id === bet.horseID);
    if (!horse) continue;

    const payout = computePayout(
      parseFloat(bet.stake), !!bet.ew, numRunners, horse.place, horse.odds
    );
    if (payout > 0) {
      winnings.set(bet.punterID, (winnings.get(bet.punterID) ?? 0) + payout);
    }
  }

  // Credit wallets and mark bets paid
  for (const [userID, amount] of winnings) {
    await db.execute(
      'UPDATE tbluser SET wallet = wallet + ? WHERE id = ?',
      [parseFloat(amount.toFixed(2)), userID]
    );
  }
  if (bets.length) {
    await db.execute('UPDATE tblbets SET paidOut = 1 WHERE raceID = ?', [raceID]);
  }

  return winnings;
}


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
