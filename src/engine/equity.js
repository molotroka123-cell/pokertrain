// equity.js — Monte Carlo equity calculator

import { createDeck, cryptoRandom, makeRng } from './deck.js';
import { evaluateHand, compareHands } from './evaluator.js';

// Calculate equity of holeCards vs numOpponents RANDOM hands via Monte Carlo.
// holeCards: ['Ah','Kd'], community: ['Js','Ts','4c'] or [], iterations: number
// opts.seed: makes the estimate reproducible (local PRNG, independent of the global RNG).
// Ties are split pro-rata (1/k for a k-way tie), and the result carries a standard error and
// 95% confidence interval: this is an ESTIMATE against random hands, not against a realistic range.
export function calculateEquity(holeCards, community = [], numOpponents = 1, iterations = 5000, opts = {}) {
  const next32 = opts.seed != null ? makeRng(opts.seed) : null;
  const rnd = (n) => {
    if (!next32) return cryptoRandom(n);
    const limit = Math.floor(4294967296 / n) * n;
    let v;
    do { v = next32(); } while (v >= limit);
    return v % n;
  };

  let wins = 0;
  let ties = 0;
  let share = 0;      // sum of pot shares
  let shareSq = 0;    // for the variance

  const used = new Set([...holeCards, ...community]);
  const remaining = createDeck().filter(c => !used.has(c));
  const boardCardsNeeded = 5 - community.length;
  const need = boardCardsNeeded + 2 * numOpponents;
  if (need > remaining.length) throw new Error('not enough cards for this many opponents');

  for (let i = 0; i < iterations; i++) {
    // partial Fisher-Yates: only the cards we need
    const deck = remaining.slice();
    for (let k = 0; k < need; k++) {
      const j = k + rnd(deck.length - k);
      const t = deck[k]; deck[k] = deck[j]; deck[j] = t;
    }
    let idx = 0;
    const board = [...community];
    for (let b = 0; b < boardCardsNeeded; b++) board.push(deck[idx++]);

    const heroHand = evaluateHand(holeCards, board);
    let heroBest = true;
    let tied = 0;
    for (let o = 0; o < numOpponents; o++) {
      const oppHand = evaluateHand([deck[idx++], deck[idx++]], board);
      const cmp = compareHands(heroHand, oppHand);
      if (cmp < 0) { heroBest = false; break; }
      if (cmp === 0) tied++;
    }
    let s = 0;
    if (heroBest) {
      if (tied === 0) { wins++; s = 1; } else { ties++; s = 1 / (tied + 1); }
    }
    share += s;
    shareSq += s * s;
  }

  const mean = share / iterations;
  const variance = iterations > 1 ? Math.max(0, (shareSq - iterations * mean * mean) / (iterations - 1)) : 0;
  const stdErr = Math.sqrt(variance / iterations);
  return {
    equity: mean,
    wins,
    ties,
    losses: iterations - wins - ties,
    iterations,
    stdErr,
    ci95: [Math.max(0, mean - 1.96 * stdErr), Math.min(1, mean + 1.96 * stdErr)],
    assumption: 'opponents hold uniformly random hands',
  };
}

// Quick preflop equity estimate (faster, less accurate)
export function quickPreflopEquity(holeCards, numOpponents = 1) {
  return calculateEquity(holeCards, [], numOpponents, 2000);
}

// Calculate pot odds
// EV of calling vs folding (fold = 0). `pot` ALREADY contains the opponent's bet (GameEngine adds every bet to
// this.pot at once), so a won call wins `pot` and a lost call loses `toCall`:
//   EV = equity * pot - (1 - equity) * toCall   -> break-even equity = toCall / (pot + toCall) = potOdds().
// The old copies used equity * (pot + toCall) - (1 - equity) * toCall, which counted the hero's own call as a win
// and overstated every call by equity * toCall (pot 2300 / call 2000: break-even 31.7% instead of 46.5%).
export function callEV(equity, pot, toCall) {
  if (!(toCall > 0)) return 0;
  return equity * pot - (1 - equity) * toCall;
}

export function potOdds(toCall, potSize) {
  if (toCall <= 0) return 1;
  return toCall / (potSize + toCall);
}

// Calculate hand strength as [0,1] relative score
// Uses equity vs 1 random opponent
export function handStrength(holeCards, community = []) {
  const result = calculateEquity(holeCards, community, 1, 1000);
  return result.equity;
}

// Stack-to-pot ratio
export function spr(stack, pot) {
  if (pot <= 0) return Infinity;
  return stack / pot;
}

// M-ratio (how many orbits you can survive)
export function mRatio(stack, sb, bb, ante, playersAtTable) {
  const orbitCost = sb + bb + ante * playersAtTable;
  if (orbitCost <= 0) return Infinity;
  return stack / orbitCost;
}
