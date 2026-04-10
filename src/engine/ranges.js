// ranges.js — GTO 13x13 preflop range grid with positional thresholds

// 13x13 grid: rows = first card rank, cols = second card rank
// Upper triangle = suited, lower triangle = offsuit, diagonal = pairs
// Values 0-1: threshold for playing (lower = tighter position needed)
// 0.0 = always play, 1.0 = never play

const RANKS_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Base hand strength grid (0 = strongest, 1 = weakest)
// Suited hands in upper triangle, offsuit in lower
const HAND_GRID = [
  //  A     K     Q     J     T     9     8     7     6     5     4     3     2
  [0.02, 0.05, 0.08, 0.10, 0.12, 0.18, 0.22, 0.25, 0.28, 0.20, 0.30, 0.32, 0.34], // A
  [0.10, 0.04, 0.12, 0.15, 0.18, 0.25, 0.35, 0.40, 0.45, 0.48, 0.50, 0.52, 0.55], // K
  [0.16, 0.20, 0.06, 0.18, 0.22, 0.30, 0.42, 0.48, 0.55, 0.58, 0.60, 0.62, 0.65], // Q
  [0.22, 0.28, 0.30, 0.08, 0.22, 0.32, 0.45, 0.52, 0.60, 0.62, 0.65, 0.68, 0.70], // J
  [0.28, 0.32, 0.35, 0.35, 0.10, 0.30, 0.42, 0.50, 0.58, 0.60, 0.65, 0.70, 0.72], // T
  [0.42, 0.48, 0.52, 0.55, 0.45, 0.15, 0.38, 0.45, 0.52, 0.55, 0.65, 0.70, 0.75], // 9
  [0.50, 0.58, 0.62, 0.65, 0.60, 0.55, 0.18, 0.42, 0.48, 0.55, 0.62, 0.70, 0.78], // 8
  [0.55, 0.62, 0.68, 0.70, 0.68, 0.62, 0.58, 0.20, 0.45, 0.50, 0.58, 0.65, 0.75], // 7
  [0.60, 0.68, 0.72, 0.75, 0.72, 0.68, 0.65, 0.62, 0.25, 0.48, 0.55, 0.65, 0.72], // 6
  [0.48, 0.70, 0.75, 0.78, 0.75, 0.72, 0.70, 0.65, 0.62, 0.28, 0.50, 0.58, 0.68], // 5
  [0.62, 0.72, 0.78, 0.80, 0.80, 0.78, 0.75, 0.72, 0.68, 0.65, 0.32, 0.55, 0.65], // 4
  [0.65, 0.75, 0.80, 0.82, 0.82, 0.82, 0.80, 0.78, 0.75, 0.72, 0.70, 0.35, 0.62], // 3
  [0.68, 0.78, 0.82, 0.85, 0.85, 0.85, 0.85, 0.82, 0.80, 0.78, 0.75, 0.72, 0.38], // 2
];

// Position thresholds: the cutoff value for opening in each position
// A hand is playable if HAND_GRID[r1][r2] <= threshold
const POSITION_THRESHOLDS = {
  UTG:    0.15,  // ~13% of hands
  'UTG+1': 0.18,
  MP:     0.22,  // ~18%
  HJ:     0.30,  // ~24%
  CO:     0.42,  // ~32%
  BTN:    0.55,  // ~42%
  SB:     0.45,  // ~36%
  BB:     0.60,  // ~48% (defending)
};

// 3-bet thresholds (tighter than opening)
const THREEBET_THRESHOLDS = {
  UTG:    0.06,
  'UTG+1': 0.08,
  MP:     0.10,
  HJ:     0.14,
  CO:     0.20,
  BTN:    0.28,
  SB:     0.22,
  BB:     0.18,
};

// Convert card ranks to grid indices
function rankIndex(rank) {
  return RANKS_ORDER.indexOf(rank);
}

// Get hand strength value from grid
export function getHandValue(card1, card2) {
  const r1 = rankIndex(card1[0]);
  const r2 = rankIndex(card2[0]);
  const suited = card1[1] === card2[1];

  if (r1 === r2) return HAND_GRID[r1][r2]; // Pair
  if (suited) return HAND_GRID[Math.min(r1, r2)][Math.max(r1, r2)]; // Upper triangle
  return HAND_GRID[Math.max(r1, r2)][Math.min(r1, r2)]; // Lower triangle
}

// Check if hand is in opening range for position
export function isInOpenRange(card1, card2, position) {
  const threshold = POSITION_THRESHOLDS[position] || 0.30;
  return getHandValue(card1, card2) <= threshold;
}

// Check if hand is in 3-bet range for position
export function isIn3BetRange(card1, card2, position) {
  const threshold = THREEBET_THRESHOLDS[position] || 0.12;
  return getHandValue(card1, card2) <= threshold;
}

// Get the full range grid for a position (for display)
export function getPositionRange(position) {
  const threshold = POSITION_THRESHOLDS[position] || 0.30;
  const grid = [];
  for (let r = 0; r < 13; r++) {
    const row = [];
    for (let c = 0; c < 13; c++) {
      const val = HAND_GRID[r][c];
      let label;
      if (r === c) label = RANKS_ORDER[r] + RANKS_ORDER[r];
      else if (r < c) label = RANKS_ORDER[r] + RANKS_ORDER[c] + 's';
      else label = RANKS_ORDER[c] + RANKS_ORDER[r] + 'o';
      row.push({ label, value: val, inRange: val <= threshold });
    }
    grid.push(row);
  }
  return grid;
}

// Hand category: premium, strong, medium, marginal, trash
export function handCategory(card1, card2) {
  const val = getHandValue(card1, card2);
  if (val <= 0.08) return 'premium';
  if (val <= 0.20) return 'strong';
  if (val <= 0.40) return 'medium';
  if (val <= 0.60) return 'marginal';
  return 'trash';
}

// Get hand name string (e.g., "AKs", "QJo", "TT")
export function handString(card1, card2) {
  const r1 = rankIndex(card1[0]);
  const r2 = rankIndex(card2[0]);
  const suited = card1[1] === card2[1];

  if (r1 === r2) return RANKS_ORDER[r1] + RANKS_ORDER[r2];
  const hi = Math.min(r1, r2);
  const lo = Math.max(r1, r2);
  return RANKS_ORDER[hi] + RANKS_ORDER[lo] + (suited ? 's' : 'o');
}

export { POSITION_THRESHOLDS, THREEBET_THRESHOLDS, RANKS_ORDER, HAND_GRID };
