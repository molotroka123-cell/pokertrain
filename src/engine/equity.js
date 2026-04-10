// equity.js — Monte Carlo equity calculator

import { createDeck, shuffle } from './deck.js';
import { evaluateHand, compareHands } from './evaluator.js';

// Calculate equity of holeCards vs numOpponents via Monte Carlo
// holeCards: ['Ah','Kd'], community: ['Js','Ts','4c'] or [], iterations: number
export function calculateEquity(holeCards, community = [], numOpponents = 1, iterations = 5000) {
  let wins = 0;
  let ties = 0;

  // Cards already in play
  const used = new Set([...holeCards, ...community]);
  const remaining = createDeck().filter(c => !used.has(c));
  const boardCardsNeeded = 5 - community.length;

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffle(remaining);
    let idx = 0;

    // Complete the board
    const board = [...community];
    for (let b = 0; b < boardCardsNeeded; b++) {
      board.push(shuffled[idx++]);
    }

    // Evaluate hero
    const heroHand = evaluateHand(holeCards, board);

    // Evaluate opponents (random hands)
    let heroBest = true;
    let isTie = false;
    for (let o = 0; o < numOpponents; o++) {
      const oppCards = [shuffled[idx++], shuffled[idx++]];
      const oppHand = evaluateHand(oppCards, board);
      const cmp = compareHands(heroHand, oppHand);
      if (cmp < 0) {
        heroBest = false;
        break;
      } else if (cmp === 0) {
        isTie = true;
      }
    }

    if (heroBest && !isTie) wins++;
    else if (heroBest && isTie) ties++;
  }

  return {
    equity: (wins + ties * 0.5) / iterations,
    wins,
    ties,
    losses: iterations - wins - ties,
    iterations,
  };
}

// Quick preflop equity estimate (faster, less accurate)
export function quickPreflopEquity(holeCards, numOpponents = 1) {
  return calculateEquity(holeCards, [], numOpponents, 2000);
}

// Calculate pot odds
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
