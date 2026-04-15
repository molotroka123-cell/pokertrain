// gtoRanges.js — Exact GTO ranges for all drills
// Source: GTO Wizard / HoldemResources.net
// Format: 6-max NLH, 100BB deep (except push/fold)

import { parseRange, isInRange, cardsToHandKey } from './solverRanges.js';

// ═══ RFI RANGES (Open Raise First In) ═══
export const RFI_RANGES = {
  UTG: "66+, A5s, A9s+, KTs+, QTs+, JTs, T9s, 98s, AQo+",
  HJ:  "22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+",
  CO:  "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s, A9o+, KTo+, QJo, QTo, JTo",
  BTN: "22+, A2s+, K2s+, Q5s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o",
  SB:  "44+, A2s+, K6s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, A9o+, KTo+, QJo",
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
