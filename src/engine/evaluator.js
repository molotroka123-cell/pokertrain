// evaluator.js — 5/7 card hand evaluation
// Hand ranks: 1=High Card, 2=Pair, 3=Two Pair, 4=Three of a Kind,
//             5=Straight, 6=Flush, 7=Full House, 8=Four of a Kind,
//             9=Straight Flush, 10=Royal Flush

import { parseCard, rankValue } from './deck.js';

const HAND_NAMES = [
  '', 'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind',
  'Straight Flush', 'Royal Flush'
];

export function handName(rank) {
  return HAND_NAMES[rank] || 'Unknown';
}

// Evaluate exactly 5 cards → { rank, value, name, kickers }
// value is a comparable number: higher = better hand
export function evaluate5(cards) {
  const parsed = cards.map(c => typeof c === 'string' ? parseCard(c) : c);
  const ranks = parsed.map(c => rankValue(c.rank)).sort((a, b) => b - a);
  const suits = parsed.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  // Normal straight
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  }
  // Wheel (A-2-3-4-5)
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Count ranks
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Determine hand rank
  let handRank, value;

  if (isStraight && isFlush) {
    handRank = straightHigh === 14 ? 10 : 9; // Royal or Straight Flush
    value = handRank * 1e10 + straightHigh;
  } else if (groups[0].count === 4) {
    handRank = 8; // Four of a Kind
    value = handRank * 1e10 + groups[0].rank * 1e6 + groups[1].rank;
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    handRank = 7; // Full House
    value = handRank * 1e10 + groups[0].rank * 1e6 + groups[1].rank;
  } else if (isFlush) {
    handRank = 6; // Flush
    value = handRank * 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
  } else if (isStraight) {
    handRank = 5; // Straight
    value = handRank * 1e10 + straightHigh;
  } else if (groups[0].count === 3) {
    handRank = 4; // Three of a Kind
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank);
    value = handRank * 1e10 + groups[0].rank * 1e6 + kickers[0] * 1e4 + kickers[1] * 1e2;
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    handRank = 3; // Two Pair
    const pairs = groups.filter(g => g.count === 2).map(g => g.rank).sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1).rank;
    value = handRank * 1e10 + pairs[0] * 1e6 + pairs[1] * 1e4 + kicker * 1e2;
  } else if (groups[0].count === 2) {
    handRank = 2; // Pair
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank).sort((a, b) => b - a);
    value = handRank * 1e10 + groups[0].rank * 1e6 + kickers[0] * 1e4 + kickers[1] * 1e2 + kickers[2];
  } else {
    handRank = 1; // High Card
    value = handRank * 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 1e2 + ranks[4];
  }

  return {
    rank: handRank,
    value,
    name: handName(handRank),
    cards: cards.slice(),
  };
}

// Generate all C(n, 5) combinations
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result = [];
  const first = arr[0];
  const rest = arr.slice(1);
  // Combos that include first
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  // Combos that don't include first
  for (const combo of combinations(rest, k)) {
    result.push(combo);
  }
  return result;
}

// Evaluate best 5 from 7 cards (Texas Hold'em)
export function evaluate7(sevenCards) {
  const combos = combinations(sevenCards, 5);
  let best = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.value > best.value) {
      best = result;
    }
  }
  return best;
}

// Evaluate best hand from hole cards + community
export function evaluateHand(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length < 5) return null;
  if (all.length === 5) return evaluate5(all);
  return evaluate7(all);
}

// Compare two evaluated hands. Returns >0 if a wins, <0 if b wins, 0 if tie
export function compareHands(a, b) {
  return a.value - b.value;
}
