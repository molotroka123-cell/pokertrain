// rangeEstimator.js — Estimate villain's range from position + actions
// Narrows range through streets like real range analysis

import { HAND_GRID, POSITION_THRESHOLDS, THREEBET_THRESHOLDS, RANKS_ORDER } from './ranges.js';

// Convert threshold to percentage of hands
function thresholdToPct(threshold) {
  let count = 0;
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      if (HAND_GRID[r][c] <= threshold) count++;
    }
  }
  return count / 169;
}

// Get all hands in range as array of { hand, weight }
// hand format: "AKs", "QJo", "TT" etc.
export function getRangeFromThreshold(threshold) {
  const hands = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const val = HAND_GRID[r][c];
      if (val <= threshold) {
        const isPair = r === c;
        const isSuited = r < c;
        let hand;
        if (isPair) hand = RANKS_ORDER[r] + RANKS_ORDER[r];
        else if (isSuited) hand = RANKS_ORDER[r] + RANKS_ORDER[c] + 's';
        else hand = RANKS_ORDER[c] + RANKS_ORDER[r] + 'o';

        // Weight: hands closer to threshold = weaker, less weight
        const weight = 1.0 - (val / Math.max(threshold, 0.01)) * 0.3;
        hands.push({ hand, weight: Math.max(0.1, weight), value: val });
      }
    }
  }
  return hands;
}

// Estimate villain's preflop range based on position + action
export function estimatePreflopRange(villainPosition, action) {
  let threshold;

  switch (action) {
    case 'open':
    case 'raise':
      threshold = POSITION_THRESHOLDS[villainPosition] || 0.30;
      break;
    case '3bet':
      threshold = THREEBET_THRESHOLDS[villainPosition] || 0.12;
      break;
    case 'call':
      // Calling range: between open and 3-bet thresholds
      threshold = POSITION_THRESHOLDS[villainPosition] || 0.30;
      break;
    case 'limp':
      threshold = 0.50; // Limpers have wide, passive ranges
      break;
    default:
      threshold = 0.30;
  }

  return { hands: getRangeFromThreshold(threshold), threshold, pct: thresholdToPct(threshold) };
}

// Narrow range through postflop actions
// Each action removes a portion of the range
export function narrowRange(preflopRange, street, action, betSizePotFraction) {
  const hands = [...preflopRange.hands];

  switch (action) {
    case 'bet':
    case 'raise': {
      // Betting range is polarized: strong hands + bluffs
      // Remove medium-strength hands (they check)
      const sizeFactor = betSizePotFraction || 0.5;
      // Larger bet = more polarized
      const keepTop = sizeFactor > 0.75 ? 0.40 : sizeFactor > 0.5 ? 0.50 : 0.60;
      const keepBluffs = sizeFactor > 0.75 ? 0.15 : 0.10;

      // Sort by value (lower = stronger)
      hands.sort((a, b) => a.value - b.value);
      const topCount = Math.ceil(hands.length * keepTop);
      const bluffCount = Math.ceil(hands.length * keepBluffs);

      // Keep top hands + some bottom (bluffs)
      const result = [];
      for (let i = 0; i < hands.length; i++) {
        if (i < topCount) {
          result.push({ ...hands[i], weight: hands[i].weight * 1.2 }); // Value hands
        } else if (i >= hands.length - bluffCount) {
          result.push({ ...hands[i], weight: hands[i].weight * 0.5 }); // Bluffs
        }
        // Middle hands removed (would check)
      }
      return { hands: result, threshold: preflopRange.threshold };
    }

    case 'call': {
      // Calling range: medium-strength hands + draws
      // Remove very strong (would raise) and very weak (would fold)
      hands.sort((a, b) => a.value - b.value);
      const result = [];
      for (let i = 0; i < hands.length; i++) {
        const pct = i / hands.length;
        if (pct < 0.15) {
          // Top 15% might slow-play, keep with reduced weight
          result.push({ ...hands[i], weight: hands[i].weight * 0.4 });
        } else if (pct < 0.70) {
          // Core calling range
          result.push({ ...hands[i], weight: hands[i].weight * 1.0 });
        }
        // Bottom 30% folds
      }
      return { hands: result, threshold: preflopRange.threshold };
    }

    case 'check': {
      // Checking range: medium hands, some traps, no bluffs
      hands.sort((a, b) => a.value - b.value);
      const result = [];
      for (let i = 0; i < hands.length; i++) {
        const pct = i / hands.length;
        if (pct < 0.10) {
          // Traps (slow-play strong hands)
          result.push({ ...hands[i], weight: hands[i].weight * 0.3 });
        } else if (pct < 0.75) {
          // Medium range that checks
          result.push({ ...hands[i], weight: hands[i].weight * 0.8 });
        } else {
          // Weak hands that check (give up)
          result.push({ ...hands[i], weight: hands[i].weight * 0.6 });
        }
      }
      return { hands: result, threshold: preflopRange.threshold };
    }

    default:
      return preflopRange;
  }
}

// Get range strength estimate (0-1, 0=very strong, 1=very weak)
export function getRangeStrength(range) {
  if (!range?.hands?.length) return 0.5;
  const totalWeight = range.hands.reduce((a, h) => a + h.weight, 0);
  const weightedValue = range.hands.reduce((a, h) => a + h.value * h.weight, 0);
  return totalWeight > 0 ? weightedValue / totalWeight : 0.5;
}

// Build villain range from full action sequence
export function buildVillainRangeFromActions(villainPosition, actions) {
  // Start with preflop range
  const preflopAction = actions.find(a => a.street === 'preflop');
  let range = estimatePreflopRange(villainPosition, preflopAction?.action || 'open');

  // Narrow through each postflop action
  const streets = ['flop', 'turn', 'river'];
  for (const street of streets) {
    const streetAction = actions.find(a => a.street === street);
    if (streetAction) {
      range = narrowRange(range, street, streetAction.action, streetAction.betSizePotFraction);
    }
  }

  return range;
}
