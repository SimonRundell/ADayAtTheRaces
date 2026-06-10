/**
 * common.js — shared utility functions used by both server services
 * and mirrored in src/common.js on the client.
 *
 * @author  Simon Rundell for CodeMonkey Design Ltd.
 * @license CC BY-NC-SA 4.0
 */

export const capitalizeFirstLetter = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Return the place-odds fraction for the E/W place leg, or 0 if the horse
 * is outside the place terms for this field size.
 *
 * @param {number} numRunners
 * @param {number} place
 * @returns {number}
 */
function ewPlaceFraction(numRunners, place) {
  if (numRunners >= 12 && numRunners <= 15 && place <= 3) return 0.25;
  if (numRunners >= 8  && place <= 3) return 0.20;
  if (numRunners >= 5  && place <= 2) return 0.25;
  if (place === 1) return 1;   // <5 runners: winner only, full odds
  return 0;
}

/**
 * Compute the total return (stake + profit) for a settled bet.
 *
 * Win-only bets pay at full quoted odds for any top-3 finish (house rule).
 * E/W bets split the total stake equally between win and place legs:
 *   - win leg  pays at full odds if the horse wins
 *   - place leg pays at a fraction of the odds if the horse is placed
 *
 * Returns 0 if the horse finished outside the paid positions.
 *
 * @param {number}  stake      - total amount staked (win+place for E/W)
 * @param {boolean} ew         - true for each-way bet
 * @param {number}  numRunners - number of runners that started
 * @param {number}  place      - finishing position (1 = winner)
 * @param {string}  oddsStr    - quoted odds e.g. "5/1"
 * @returns {number} total return in pounds
 */
export function computePayout(stake, ew, numRunners, place, oddsStr) {
  if (!oddsStr || !oddsStr.includes('/')) return 0;
  const [num, den] = oddsStr.split('/').map(Number);
  const price = num / den;

  if (!ew) {
    return place <= 3 ? stake * (price + 1) : 0;
  }

  // E/W: each leg is half the total stake
  const legStake = stake / 2;
  let payout = 0;

  if (place === 1) {
    payout += legStake * (price + 1);        // win leg: full odds + stake back
  }

  const frac = ewPlaceFraction(numRunners, place);
  if (frac > 0) {
    payout += legStake * (price * frac + 1); // place leg: fraction of odds + stake back
  }

  return payout;
}

/**
 * Snap a raw decimal-odds value to the nearest step on the traditional
 * British bookmaking ladder and return it as a fractional string.
 * The floor is 1/1 (Evens) so that extremely short-priced favourites still
 * receive a quoted price compatible with the N/1 payout format.
 *
 * @param {number} dec  raw decimal odds (e.g. 2.04)
 * @returns {string}    e.g. "2/1", "14/1", "33/1"
 */
function snapOdds(dec) {
  const LADDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 25, 33, 40, 50, 66, 100];
  const clamped = Math.max(LADDER[0], dec);
  const nearest = LADDER.reduce((best, v) =>
    Math.abs(v - clamped) < Math.abs(best - clamped) ? v : best
  );
  return `${nearest}/1`;
}

/**
 * Calculate fractional odds for a field of horses using exponential weighting.
 *
 * A simple rating/totalRatings probability bunches every horse near 1/N
 * (around 10/1 for a ten-runner field) because ADATR ratings only span ~15–23
 * points per race type.  Exponential weighting amplifies those gaps: a horse
 * rated 8 points above the field average gets roughly twice the weight of an
 * average horse, while one rated 8 points below gets roughly half — producing
 * a realistic market spread from ~2/1 for the favourite to 25/1+ for long shots.
 *
 * SHARPNESS controls the steepness of the curve.  8 is calibrated for ADATR
 * rating ranges (flat 107–130, hurdle 108–124, chase 110–128).  Lower values
 * widen the spread; higher values flatten it back towards equal odds.
 *
 * Algorithm is identical to calculateOdds() in src/common.js so that odds
 * displayed in the race card always match what the race engine uses.
 *
 * @param {object[]} horses   - horse objects containing rating fields
 * @param {string}   raceover - 'flat' | 'chase' | 'hurdle'
 * @returns {object[]} horses with probability, decimalOdds, and odds fields added
 */
export function calculateOdds(horses, raceover) {
  const key       = `horse${capitalizeFirstLetter(raceover)}Rating`;
  const SHARPNESS = 8;

  const ratings   = horses.map(h => Number(h[key]));
  const avgRating = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  // Each horse's weight grows exponentially with its distance above the average
  const weights     = ratings.map(r => Math.exp((r - avgRating) / SHARPNESS));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const withOdds = horses.map((horse, i) => {
    const prob = weights[i] / totalWeight;
    const dec  = (1 - prob) / prob;
    return {
      ...horse,
      probability: (prob * 100).toFixed(2) + '%',
      decimalOdds: dec.toFixed(2),
      odds:        snapOdds(dec),
    };
  });

  // Favourite (highest probability) first
  withOdds.sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));
  return withOdds;
}
