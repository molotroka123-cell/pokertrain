// solverRanges.js — Nash ICM push/fold ranges from HoldemResources.net
// 6-max, ante 12.5% BB, push-or-fold only
// 7 stack depths × 5 positions for push, 7 × 5 for call

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const R = Object.fromEntries(RANKS.map((r,i) => [r, i])); // rank→index

// ═══ PUSH RANGES (open shove, folded to you) ═══
export const PUSH_RANGES = {
  3: {
    UTG: "22+, A2s+, A2o+, K2s+, K5o+, Q4s+, Q8o+, J6s+, J9o+, T7s+, T9o, 97s+, 87s, 76s, 65s",
    HJ:  "22+, A2s+, A2o+, K2s+, K4o+, Q2s+, Q7o+, J4s+, J8o+, T6s+, T8o+, 96s+, 98o, 86s+, 75s+, 65s, 54s",
    CO:  "22+, A2s+, A2o+, K2s+, K2o+, Q2s+, Q5o+, J2s+, J7o+, T4s+, T7o+, 95s+, 97o+, 84s+, 87o, 74s+, 63s+, 53s+, 43s",
    BTN: "22+, A2s+, A2o+, K2s+, K2o+, Q2s+, Q3o+, J2s+, J5o+, T2s+, T6o+, 93s+, 96o+, 83s+, 86o, 73s+, 76o, 63s+, 52s+, 43s",
    SB:  "22+, A2s+, A2o+, K2s+, K2o+, Q2s+, Q2o+, J2s+, J3o+, T2s+, T5o+, 92s+, 95o+, 82s+, 85o+, 72s+, 75o+, 62s+, 65o, 52s+, 42s+, 32s",
  },
  5: {
    UTG: "22+, A2s+, A3o+, K5s+, K9o+, Q8s+, QTo+, J8s+, JTo, T8s+, 98s, 87s",
    HJ:  "22+, A2s+, A2o+, K2s+, K7o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, T9o, 96s+, 86s+, 76s, 65s, 54s",
    CO:  "22+, A2s+, A2o+, K2s+, K5o+, Q3s+, Q8o+, J5s+, J8o+, T6s+, T9o, 96s+, 85s+, 75s+, 64s+, 54s",
    BTN: "22+, A2s+, A2o+, K2s+, K3o+, Q2s+, Q5o+, J3s+, J7o+, T5s+, T8o+, 95s+, 97o, 84s+, 74s+, 63s+, 53s+, 43s",
    SB:  "22+, A2s+, A2o+, K2s+, K2o+, Q2s+, Q3o+, J2s+, J5o+, T2s+, T7o+, 94s+, 96o+, 84s+, 73s+, 76o, 63s+, 52s+, 43s",
  },
  7: {
    UTG: "44+, A2s+, A7o+, K9s+, KJo+, QTs+, JTs, T9s",
    HJ:  "22+, A2s+, A4o+, K6s+, K9o+, Q8s+, QTo+, J8s+, JTo, T8s+, 97s+, 87s, 76s",
    CO:  "22+, A2s+, A2o+, K4s+, K7o+, Q6s+, Q9o+, J7s+, J9o+, T7s+, T9o, 96s+, 86s+, 75s+, 65s, 54s",
    BTN: "22+, A2s+, A2o+, K2s+, K5o+, Q4s+, Q8o+, J6s+, J8o+, T6s+, T9o, 95s+, 85s+, 75s+, 64s+, 54s, 43s",
    SB:  "22+, A2s+, A2o+, K2s+, K3o+, Q2s+, Q6o+, J4s+, J8o+, T5s+, T8o+, 95s+, 97o, 84s+, 74s+, 63s+, 53s+, 43s",
  },
  10: {
    UTG: "66+, A4s+, ATo+, KTs+, KQo, QTs+, JTs",
    HJ:  "44+, A2s+, A8o+, K8s+, KTo+, Q9s+, QJo, J9s+, T9s, 98s",
    CO:  "22+, A2s+, A5o+, K5s+, K9o+, Q7s+, QTo+, J8s+, JTo, T8s+, 97s+, 87s, 76s, 65s",
    BTN: "22+, A2s+, A2o+, K2s+, K7o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, T9o, 96s+, 86s+, 75s+, 65s, 54s",
    SB:  "22+, A2s+, A2o+, K2s+, K5o+, Q4s+, Q8o+, J6s+, J9o+, T6s+, T9o, 96s+, 85s+, 75s+, 65s, 54s",
  },
  13: {
    UTG: "77+, A8s+, AJo+, KTs+, KQo, QJs",
    HJ:  "55+, A4s+, ATo+, K9s+, KJo+, QTs+, QJo, JTs",
    CO:  "33+, A2s+, A7o+, K7s+, KTo+, Q8s+, QTo+, J9s+, JTo, T8s+, 98s, 87s",
    BTN: "22+, A2s+, A3o+, K4s+, K8o+, Q6s+, Q9o+, J7s+, JTo, T7s+, T9o, 97s+, 86s+, 76s, 65s, 54s",
    SB:  "22+, A2s+, A2o+, K2s+, K7o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, 96s+, 86s+, 75s+, 65s, 54s",
  },
  15: {
    UTG: "88+, ATs+, AJo+, KJs+, KQo",
    HJ:  "66+, A7s+, ATo+, KTs+, KQo, QTs+, JTs",
    CO:  "44+, A2s+, A8o+, K8s+, KTo+, Q9s+, QJo, J9s+, T9s, 98s",
    BTN: "22+, A2s+, A4o+, K5s+, K9o+, Q7s+, QTo+, J8s+, JTo, T7s+, 97s+, 87s, 76s, 65s",
    SB:  "22+, A2s+, A3o+, K3s+, K8o+, Q6s+, QTo+, J7s+, JTo, T7s+, T9o, 96s+, 86s+, 76s, 65s, 54s",
  },
  20: {
    UTG: "99+, ATs+, AQo+, KQs",
    HJ:  "77+, A9s+, AJo+, KTs+, KQo, QJs",
    CO:  "55+, A4s+, ATo+, K9s+, KJo+, QTs+, QJo, JTs, T9s",
    BTN: "22+, A2s+, A7o+, K6s+, KTo+, Q8s+, QTo+, J8s+, JTo, T8s+, 97s+, 87s, 76s",
    SB:  "22+, A2s+, A5o+, K4s+, K9o+, Q7s+, QTo+, J8s+, JTo, T7s+, 97s+, 86s+, 76s, 65s",
  },
};

// ═══ CALL RANGES (BB vs push from each position) ═══
export const CALL_RANGES = {
  3: {
    vs_UTG: "22+, A2s+, A5o+, K8s+, KTo+, QTs+, JTs",
    vs_HJ:  "22+, A2s+, A3o+, K5s+, K9o+, Q8s+, QTo+, J9s+, T9s",
    vs_CO:  "22+, A2s+, A2o+, K2s+, K7o+, Q6s+, Q9o+, J8s+, JTo, T8s+, 98s",
    vs_BTN: "22+, A2s+, A2o+, K2s+, K5o+, Q4s+, Q8o+, J7s+, J9o+, T7s+, 97s+, 87s, 76s",
    vs_SB:  "22+, A2s+, A2o+, K2s+, K3o+, Q3s+, Q7o+, J5s+, J8o+, T6s+, T9o, 96s+, 85s+, 75s+, 65s, 54s",
  },
  5: {
    vs_UTG: "55+, A8s+, ATo+, KTs+, KQo",
    vs_HJ:  "33+, A4s+, A8o+, K8s+, KTo+, QTs+, JTs",
    vs_CO:  "22+, A2s+, A5o+, K6s+, K9o+, Q9s+, QJo, J9s+, T9s",
    vs_BTN: "22+, A2s+, A3o+, K4s+, K8o+, Q7s+, QTo+, J8s+, JTo, T8s+, 98s",
    vs_SB:  "22+, A2s+, A2o+, K2s+, K6o+, Q5s+, Q9o+, J7s+, J9o+, T7s+, 97s+, 86s+, 76s",
  },
  7: {
    vs_UTG: "77+, ATs+, AJo+, KQs",
    vs_HJ:  "55+, A7s+, ATo+, KTs+, KQo, QJs, JTs",
    vs_CO:  "33+, A2s+, A7o+, K7s+, KTo+, Q9s+, QJo, J9s+, T9s",
    vs_BTN: "22+, A2s+, A4o+, K5s+, K9o+, Q8s+, QTo+, J8s+, JTo, T8s+, 98s",
    vs_SB:  "22+, A2s+, A3o+, K3s+, K8o+, Q6s+, Q9o+, J8s+, JTo, T7s+, 97s+, 87s, 76s",
  },
  10: {
    vs_UTG: "88+, AJs+, AQo+",
    vs_HJ:  "66+, A9s+, AJo+, KTs+, KQo",
    vs_CO:  "55+, A5s+, ATo+, K9s+, KJo+, QTs+, JTs",
    vs_BTN: "33+, A2s+, A7o+, K7s+, KTo+, Q9s+, QJo, J9s+, T9s, 98s",
    vs_SB:  "22+, A2s+, A5o+, K5s+, K9o+, Q8s+, QTo+, J8s+, JTo, T8s+, 97s+, 87s",
  },
  15: {
    vs_UTG: "TT+, AQs+, AKo",
    vs_HJ:  "88+, ATs+, AQo+, KQs",
    vs_CO:  "66+, A8s+, AJo+, KTs+, KQo, QJs",
    vs_BTN: "44+, A4s+, ATo+, K8s+, KJo+, QTs+, QJo, JTs",
    vs_SB:  "33+, A2s+, A8o+, K7s+, KTo+, Q9s+, QJo, J9s+, T9s, 98s",
  },
  20: {
    vs_UTG: "JJ+, AKs, AKo",
    vs_HJ:  "99+, AJs+, AQo+, KQs",
    vs_CO:  "77+, ATs+, AJo+, KTs+, KQo, QJs",
    vs_BTN: "55+, A5s+, ATo+, K9s+, KJo+, QTs+, JTs",
    vs_SB:  "44+, A3s+, A9o+, K8s+, KTo+, Q9s+, QJo, J9s+, T9s",
  },
};

// ═══ WEAK SPOTS — hands the player frequently misplays ═══
export const WEAK_SPOTS = [
  { hand: 'A5o', pos: 'SB', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'A5o', pos: 'BTN', bb: 3, mode: 'push', correct: 'push' },
  { hand: 'QTo', pos: 'SB', bb: 3, mode: 'push', correct: 'push' },
  { hand: 'QTo', pos: 'SB', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'T9s', pos: 'SB', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'JTs', pos: 'CO', bb: 7, mode: 'push', correct: 'push' },
  { hand: '98s', pos: 'SB', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'K7o', pos: 'BTN', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'K7o', pos: 'SB', bb: 3, mode: 'push', correct: 'push' },
  { hand: 'A4o', pos: 'BTN', bb: 5, mode: 'push', correct: 'push' },
  { hand: 'J9s', pos: 'CO', bb: 10, mode: 'push', correct: 'push' },
  { hand: '76s', pos: 'BTN', bb: 7, mode: 'push', correct: 'push' },
  { hand: 'Q9s', pos: 'CO', bb: 10, mode: 'push', correct: 'push' },
  { hand: 'K5s', pos: 'CO', bb: 10, mode: 'push', correct: 'push' },
  { hand: '87s', pos: 'HJ', bb: 7, mode: 'push', correct: 'push' },
  // Call spots
  { hand: 'A9o', pos: 'vs_BTN', bb: 10, mode: 'call', correct: 'call' },
  { hand: 'KTs', pos: 'vs_CO', bb: 7, mode: 'call', correct: 'call' },
  { hand: '66',  pos: 'vs_HJ', bb: 10, mode: 'call', correct: 'call' },
  { hand: 'QJs', pos: 'vs_CO', bb: 7, mode: 'call', correct: 'call' },
  { hand: 'ATo', pos: 'vs_BTN', bb: 15, mode: 'call', correct: 'call' },
  // From GTO Wizard analysis (real tournament mistakes)
  { hand: 'AQo', pos: 'CO', bb: 15, mode: 'push', correct: 'call' },   // Must call HJ all-in with AQo
  { hand: '86o', pos: 'vs_CO', bb: 16, mode: 'call', correct: 'call' }, // BB defend vs CO
  { hand: 'QJo', pos: 'SB', bb: 18, mode: 'push', correct: 'push' },   // SB 3-bet or fold, QJo = 3-bet
  { hand: 'Q9o', pos: 'SB', bb: 12, mode: 'push', correct: 'call' },   // SB multiway, should call
  { hand: 'A5o', pos: 'BTN', bb: 17, mode: 'push', correct: 'push' },  // BTN open, don't fold vs 3-bet shove
  // New batch from GTO Wizard (April 2026)
  { hand: 'A7o', pos: 'SB', bb: 24, mode: 'call', correct: 'call' },   // SB defend vs HJ all-in 6.5bb
  { hand: '33',  pos: 'LJ', bb: 23, mode: 'open', correct: 'fold' },   // Small pairs fold from early pos ~23bb
  { hand: 'ATo', pos: 'BTN', bb: 26, mode: 'vs_open', correct: 'call' }, // BTN vs UTG1 3x = call (not fold)
  { hand: '94o', pos: 'BB', bb: 21, mode: 'defend_mw', correct: 'fold' }, // BB don't defend trash multiway
];

// ═══ RANGE PARSER ═══

// Parse "22+, A2s+, K9o+" into a Set of hand keys like "AA", "A5s", "K9o"
const _cache = {};
export function parseRange(rangeStr) {
  if (_cache[rangeStr]) return _cache[rangeStr];
  const hands = new Set();
  if (!rangeStr) return hands;
  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (!part) continue;

    // Pair: "22+" or "77+" or "AA"
    const pairMatch = part.match(/^([2-9TJQKA])([2-9TJQKA])(\+?)$/);
    if (pairMatch && pairMatch[1] === pairMatch[2]) {
      const startIdx = R[pairMatch[1]];
      if (pairMatch[3] === '+') {
        for (let i = startIdx; i < 13; i++) hands.add(RANKS[i] + RANKS[i]);
      } else {
        hands.add(pairMatch[1] + pairMatch[2]);
      }
      continue;
    }

    // Suited/offsuit: "A2s+", "K9o+", "JTs", "QJo"
    const hMatch = part.match(/^([2-9TJQKA])([2-9TJQKA])([so])(\+?)$/);
    if (hMatch) {
      const hi = R[hMatch[1]], lo = R[hMatch[2]], type = hMatch[3], plus = hMatch[4] === '+';
      const highR = Math.max(hi, lo), lowR = Math.min(hi, lo);
      if (plus) {
        // e.g. K9o+ → K9o, KTo, KJo, KQo (low rank goes up to highR-1)
        for (let i = lowR; i < highR; i++) {
          hands.add(RANKS[highR] + RANKS[i] + type);
        }
      } else {
        hands.add(RANKS[highR] + RANKS[lowR] + type);
      }
      continue;
    }
  }

  _cache[rangeStr] = hands;
  return hands;
}

// Convert two card strings (e.g. "Ah", "5d") to hand key (e.g. "A5o")
export function cardsToHandKey(c1, c2) {
  const r1 = R[c1[0]], r2 = R[c2[0]];
  const suited = c1[1] === c2[1];
  if (r1 === r2) return c1[0] + c2[0]; // pair
  const hi = r1 > r2 ? c1[0] : c2[0];
  const lo = r1 > r2 ? c2[0] : c1[0];
  return hi + lo + (suited ? 's' : 'o');
}

// Check if a hand is in a range string
export function isInRange(handKey, rangeStr) {
  return parseRange(rangeStr).has(handKey);
}

// Get the closest BB level for a given stack
export function closestBB(bb) {
  const levels = [3, 5, 7, 10, 13, 15, 20];
  let best = 3, bestDist = Infinity;
  for (const l of levels) {
    const d = Math.abs(l - bb);
    if (d < bestDist) { bestDist = d; best = l; }
  }
  return best;
}

// All available BB levels
export const BB_LEVELS = [3, 5, 7, 10, 13, 15, 20];
export const PUSH_POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
export const CALL_POSITIONS = ['vs_UTG', 'vs_HJ', 'vs_CO', 'vs_BTN', 'vs_SB'];
