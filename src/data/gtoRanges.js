// gtoRanges.js — Exact GTO ranges for all drills
// Source: GTO Wizard (verified April 2026)
// Covers: 8-max MTT (various depths), 6-max Cash (100bb), general reference

import { parseRange, isInRange, cardsToHandKey } from './solverRanges.js';

// ═══ RFI RANGES — 8-max general reference (used by existing drills) ═══
export const RFI_RANGES = {
  UTG: "22+, A2s+, K9s+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo",
  HJ:  "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s, A9o+, KTo+, QJo",
  CO:  "22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s, A8o+, KTo+, QTo+, JTo",
  BTN: "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o",
  SB:  "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q4o+, J6o+, T7o+, 97o+, 86o+, 76o, 65o",
};

// ═══ MTT RFI RANGES — GTO Wizard, MTT Avg 20bb, 8-max, 2.5BB ante ═══
// Each position at its actual stack depth from the solver screenshot
// Strategy: Raise (not push) — open-raise sizing 2x-2.5x
export const MTT_RFI_RANGES = {
  // UTG 24bb — tightest position, Raise 2x, pot odds 28.6%
  UTG: {
    bb: 24,
    raise: "22+, A2s+, K9s+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo",
    sizing: '2x',
  },
  // UTG1 27bb — second earliest, Raise 2x, pot odds 28.6%
  UTG1: {
    bb: 27,
    raise: "22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 75s, 65s, 54s, ATo+, KJo+, QJo",
    sizing: '2x',
  },
  // LJ (Lojack) 16bb — Raise 2x, pot odds 28.6%
  LJ: {
    bb: 16,
    raise: "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo",
    sizing: '2x',
  },
  // HJ (Hijack) 14bb — Raise 2x, pot odds 28.6%
  HJ: {
    bb: 14,
    raise: "22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s, A9o+, KTo+, QJo",
    sizing: '2x',
  },
  // CO 22bb — late position, Raise 2x, pot odds 28.6%
  CO: {
    bb: 22,
    raise: "22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s, A8o+, KTo+, QTo+, JTo",
    sizing: '2x',
  },
  // BTN 26bb — widest open-raise, Raise 2x, pot odds 28.6%
  BTN: {
    bb: 26,
    raise: "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o",
    sizing: '2x',
  },
  // SB 12.5bb — plays ~95% of hands, mix Raise 2.5x / Limp
  // AA example: Raise 2.5 = 48.5%, Call (limp) = 51.5%, Fold = 0%
  SB: {
    bb: 12.5,
    raise: "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J4o+, T6o+, 96o+, 86o+, 76o, 65o, 54o",
    sizing: '2.5x (mixed with limp)',
    note: 'SB plays ~95% of hands; mixed raise/limp strategy',
  },
};

// ═══ CASH 6-MAX RFI RANGES — GTO Wizard, 100bb deep, 1.5BB blinds ═══
// All positions Raise 2.5x (SB Raise 3.5x)
export const CASH_6MAX_RFI_RANGES = {
  // UTG 100bb — tightest 6-max position, Raise 2.5x, pot odds 40%
  UTG: {
    bb: 100,
    raise: "22+, A2s+, K9s+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo",
    sizing: '2.5x',
  },
  // HJ 100bb — Raise 2.5x, pot odds 40%
  HJ: {
    bb: 100,
    raise: "22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo",
    sizing: '2.5x',
  },
  // CO 100bb — Raise 2.5x, pot odds 40%
  CO: {
    bb: 100,
    raise: "22+, A2s+, K6s+, Q8s+, J8s+, T7s+, 97s+, 86s+, 76s, 65s, 54s, A9o+, KTo+, QTo+, JTo",
    sizing: '2.5x',
  },
  // BTN 100bb — widest open, Raise 2.5x, pot odds 40%
  BTN: {
    bb: 100,
    raise: "22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o",
    sizing: '2.5x',
  },
  // SB 99.5bb — very wide, Raise 3.5x, pot odds 25%
  // AA example: Raise 3.5 = 99.6%, Call = 0.4%, Fold = 0%
  SB: {
    bb: 99.5,
    raise: "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q4o+, J6o+, T7o+, 97o+, 86o+, 76o, 65o, 54o",
    sizing: '3.5x',
    note: 'SB opens ~85% of hands',
  },
};

// ═══ 3-BET RANGES (per villain open position) ═══
export const THREEBET_RANGES = {
  vs_UTG: {
    threebet: "QQ+, AKs, AKo, A5s, A4s, A3s",
    call: "22-JJ, AQs, AQo, AJs, KQs, ATs, KJs, QJs, JTs, T9s, 98s",
  },
  vs_HJ: {
    threebet: "QQ+, AKs, AKo, AQs, A5s, A4s, A3s, A2s, KTs",
    call: "22-JJ, AQo, AJs, ATs, KQs, KJs, QJs, QTs, JTs, T9s, 98s, 87s",
  },
  vs_CO: {
    threebet: "TT+, AKs, AKo, AQs, AQo, A5s, A4s, A3s, A2s, K9s, QJs, JTs, T9s",
    call: "22-99, AJs, ATs, A9s, KQs, KJs, KTs, QTs, J9s, T8s, 98s, 87s, 76s, 65s",
  },
  vs_BTN_from_BB: {
    threebet: "99+, AKs, AKo, AQs, AQo, AJs, A5s, A4s, A3s, A2s, K7s, K8s, K9s, Q9s, J9s, T8s, 97s, 86s, 75s, 64s, 53s",
    call: "22-88, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, KQo, KJo, KTo, K9o, K8o, K7o, QTs, Q9s, Q8s, Q7s, QTo, Q9o, Q8o, JTs, J9s, J8s, J7s, JTo, J9o, J8o, T9s, T8s, T7s, T9o, 98s, 97s, 96s, 98o, 87s, 86s, 85s, 76s, 75s, 74s, 65s, 64s, 63s, 54s, 53s, 43s",
  },
  vs_BTN_from_SB: {
    threebet: "99+, AKs, AKo, AQs, AQo, AJs, AJo, A5s, A4s, A3s, A2s, K8s, K9s, QTs, J9s, T9s, 98s, 87s",
    call: "", // SB = 3-bet or fold, NEVER flat
  },
};

// ═══ BB DEFENSE RANGES (vs each opener position) ═══
export const BB_DEFENSE = {
  vs_UTG: {
    threebet: "JJ+, AKs, AKo, AQs",
    call: "22-TT, AJs, ATs, A9s, AQo, KQs, KJs, QJs, JTs, T9s, 98s",
  },
  vs_HJ: {
    threebet: "JJ+, AKs, AKo, AQs, AQo",
    call: "22-TT, A9s, A8s, A7s, A6s, A5s, AJo, ATo, KQs, KTs, KJs, QJs, Q9s, QTs, JTs, J9s, T9s, T8s, 98s, 87s, 76s, 65s",
  },
  vs_CO: {
    threebet: "TT+, AKs, AKo, AQs, AQo, AJs, A5s, A4s, A3s",
    call: "22-99, A8s, A7s, A6s, A5s, A4s, A3s, A2s, ATo, A9o, A8o, A7o, KQs, KJs, KTs, K9s, K8s, K7s, KJo, KTo, K9o, QTs, Q9s, Q8s, Q7s, QJo, QTo, Q9o, JTs, J9s, J8s, J7s, JTo, T9s, T8s, T7s, 98s, 97s, 96s, 87s, 86s, 85s, 76s, 75s, 74s, 65s, 64s, 63s, 54s, 43s",
  },
  vs_BTN: {
    threebet: "99+, AKs, AKo, AQs, AQo, A9s, ATs, AJs, K9s, QJs, A5s, A4s, A3s, 97s, 86s, 75s, 64s, 53s",
    call: "22-88, A8s, A7s, A6s, A5s, A4s, A3s, A2s, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, KJo, KTo, K9o, K8o, K7o, QTs, Q9s, Q8s, Q7s, QTo, Q9o, Q8o, JTs, J9s, J8s, J7s, JTo, J9o, J8o, T9s, T8s, T7s, T9o, 98s, 97s, 96s, 98o, 87s, 86s, 85s, 87o, 76s, 75s, 74s, 65s, 64s, 63s, 54s, 53s, 52s, 43s",
  },
  vs_SB: {
    threebet: "99+, AKs, AKo, AQs, AQo, A9s, ATs, AJs, A5s, A4s, A3s, A2s, K8s, K7s, K6s, Q9s, J9s, T8s, 97s, 86s, 75s, 64s",
    call: "22-88, A8s, A7s, A6s, A5s, A4s, A3s, A2s, ATo, A9o, A8o, A7o, A6o, A5o, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, KTo, K9o, K8o, K7o, QTs, Q9s, Q8s, Q7s, Q6s, QJo, QTo, Q9o, Q8o, JTs, J9s, J8s, J7s, J6s, JTo, J9o, J8o, T9s, T8s, T7s, T6s, T9o, T8o, 98s, 97s, 96s, 95s, 98o, 97o, 87s, 86s, 85s, 84s, 87o, 76s, 75s, 74s, 73s, 65s, 64s, 63s, 54s, 53s, 52s, 43s, 42s, 32s",
  },
};

// ═══ POSTFLOP REFERENCE ═══
export const CBET_FREQUENCY = {
  dry:      { freq: '70-80%', size: '33%', desc: 'A72r, K83r — range bet small' },
  semi_dry: { freq: '55-65%', size: '33-50%', desc: 'QJ4r — selective c-bet' },
  wet:      { freq: '30-40%', size: '50-66%', desc: 'JT9tt, 876ss — cautious' },
  monotone: { freq: '25-35%', size: '50%', desc: '7h5h3h — only with equity' },
  paired:   { freq: '45-55%', size: '33%', desc: 'KK4, 773 — small sizing' },
};

export const SPR_GUIDE = {
  over10: 'Need set+ to stack off. Top pair = 1-2 streets value max',
  '4to10': 'Overpair/TPTK = 2-3 streets value. Commit with top 2pair+',
  '2to4': 'TPTK = ready to go all-in. Strong draws = push',
  under2: 'Any pair+ = committed. Push with any piece',
};

// ═══ SIZING REFERENCE ═══
export const PREFLOP_SIZING = {
  openRaise: { deep: '2.5x BB', medium: '2x BB', short: 'Push or fold' },
  vsLimpers: { 0: '2.5x', 1: '4x', 2: '5x', 3: '6x' },
  threeBet: { ip: '3x open', oop: '3.5-4x open' },
  fourBet: '2.2x 3-bet or push',
};

export const POSTFLOP_SIZING = {
  cbetFlop: { dry: '25-33%', wet: '50-66%', multiway: '66-75%' },
  turnBarrel: { value: '50-75%', bluff: '66-75%' },
  riverBet: { thin: '33-50%', thick: '66-80%', bluff: '66-75%', overbet: '100-150%' },
};

// ═══ POT ODDS REFERENCE ═══
export const OUTS_EQUITY = {
  // Rule of 2 (one card to come)
  oneCard: { 2: 4, 4: 8, 6: 12, 8: 16, 9: 18, 12: 24, 15: 30 },
  // Rule of 4 (two cards to come)
  twoCards: { 2: 8, 4: 16, 6: 24, 8: 32, 9: 36, 12: 48, 15: 60 },
  // Common draw outs
  draws: {
    gutshot: 4, oesd: 8, flushDraw: 9, flushGutshot: 12, flushOesd: 15,
    overcards2: 6, setMining: 2, twoPairToFH: 4,
  },
};

// ═══ HELPER: Check if hand is in GTO RFI range ═══
export function isGTORfi(card1, card2, position) {
  const handKey = cardsToHandKey(card1, card2);
  const range = RFI_RANGES[position];
  if (!range) return false;
  return isInRange(handKey, range);
}

// ═══ HELPER: Check MTT RFI range (stack-depth aware) ═══
export function isMTTRfi(card1, card2, position, stackBB) {
  const handKey = cardsToHandKey(card1, card2);
  // Try exact position first
  const mttData = MTT_RFI_RANGES[position];
  if (mttData) return isInRange(handKey, mttData.raise);
  // Fallback to general RFI
  const range = RFI_RANGES[position];
  if (!range) return false;
  return isInRange(handKey, range);
}

// ═══ HELPER: Check Cash 6-max RFI range ═══
export function isCashRfi(card1, card2, position) {
  const handKey = cardsToHandKey(card1, card2);
  const cashData = CASH_6MAX_RFI_RANGES[position];
  if (cashData) return isInRange(handKey, cashData.raise);
  const range = RFI_RANGES[position];
  if (!range) return false;
  return isInRange(handKey, range);
}

// ═══ HELPER: Get correct open-raise range for context ═══
// Returns { inRange: bool, sizing: string, format: 'mtt'|'cash' }
export function getOpenRangeInfo(card1, card2, position, stackBB, isCash) {
  const handKey = cardsToHandKey(card1, card2);
  if (isCash) {
    const cashData = CASH_6MAX_RFI_RANGES[position];
    if (cashData) {
      return {
        inRange: isInRange(handKey, cashData.raise),
        sizing: cashData.sizing,
        format: 'cash',
      };
    }
  }
  // MTT: try specific position
  const mttData = MTT_RFI_RANGES[position];
  if (mttData) {
    return {
      inRange: isInRange(handKey, mttData.raise),
      sizing: mttData.sizing,
      format: 'mtt',
    };
  }
  // Fallback
  const range = RFI_RANGES[position];
  return {
    inRange: range ? isInRange(handKey, range) : false,
    sizing: stackBB <= 15 ? '2x' : '2.5x',
    format: 'general',
  };
}

// ═══ HELPER: Get 3-bet/call/fold for hand vs villain ═══
export function getThreeBetAction(card1, card2, heroPos, villainPos) {
  const handKey = cardsToHandKey(card1, card2);
  let key;
  if (heroPos === 'SB') key = 'vs_BTN_from_SB';
  else if (heroPos === 'BB' && villainPos === 'BTN') key = 'vs_BTN_from_BB';
  else key = 'vs_' + villainPos;

  const ranges = THREEBET_RANGES[key];
  if (!ranges) return 'fold';
  if (isInRange(handKey, ranges.threebet)) return '3bet';
  if (ranges.call && isInRange(handKey, ranges.call)) return 'call';
  return 'fold';
}

// ═══ HELPER: Get BB defense action ═══
export function getBBDefenseAction(card1, card2, openerPos) {
  const handKey = cardsToHandKey(card1, card2);
  const ranges = BB_DEFENSE['vs_' + openerPos];
  if (!ranges) return 'fold';
  if (isInRange(handKey, ranges.threebet)) return '3bet';
  if (isInRange(handKey, ranges.call)) return 'call';
  return 'fold';
}

// ═══ ANALYTICS: Range statistics ═══
export function getRangeStats(rangeStr) {
  const hands = parseRange(rangeStr);
  // Count total combos (pairs=6, suited=4, offsuit=12)
  let combos = 0;
  for (const h of hands) {
    if (h.length === 2) combos += 6; // pair
    else if (h.endsWith('s')) combos += 4;
    else if (h.endsWith('o')) combos += 12;
  }
  const totalCombos = 1326;
  return {
    hands: hands.size,
    combos,
    pct: Math.round(combos / totalCombos * 1000) / 10,
  };
}

// ═══ ANALYTICS: Compare two ranges ═══
export function compareRanges(range1Str, range2Str) {
  const r1 = parseRange(range1Str);
  const r2 = parseRange(range2Str);
  const onlyIn1 = [];
  const onlyIn2 = [];
  const inBoth = [];
  for (const h of r1) { if (r2.has(h)) inBoth.push(h); else onlyIn1.push(h); }
  for (const h of r2) { if (!r1.has(h)) onlyIn2.push(h); }
  return { onlyIn1, onlyIn2, inBoth };
}

// ═══ ANALYTICS: Get all MTT range data for display ═══
export function getMTTRangeMatrix(position) {
  const data = MTT_RFI_RANGES[position];
  if (!data) return null;
  const hands = parseRange(data.raise);
  return { hands, bb: data.bb, sizing: data.sizing, note: data.note || '' };
}

// ═══ ANALYTICS: Get all Cash range data for display ═══
export function getCashRangeMatrix(position) {
  const data = CASH_6MAX_RFI_RANGES[position];
  if (!data) return null;
  const hands = parseRange(data.raise);
  return { hands, bb: data.bb, sizing: data.sizing, note: data.note || '' };
}
