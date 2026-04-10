// evEngine.js — THE most important file (per MASTER spec)
// 3-Tier EV: Quick (gameplay) → Range (post-hand) → Solver (pre-computed)
// Every feature depends on EV accuracy.

import { evaluateHand, evaluate5, compareHands } from './evaluator.js';
import { createDeck, shuffle, parseCard, rankValue } from './deck.js';
import { getHandValue, POSITION_THRESHOLDS } from './ranges.js';

// ═══════════════════════════════════════
// TIER 1: REAL-TIME EV (during gameplay)
// Fast. Runs every decision. ~5ms.
// ═══════════════════════════════════════

export function calculateQuickEV(heroCards, board, pot, toCall, villainProfile, position, actionHistory) {
  // 1. Estimate villain range from profile + actions
  const villainRange = estimateRange(villainProfile, position, actionHistory, board);

  // 2. Quick equity vs that range
  const equity = equityVsRange(heroCards, board, villainRange, 400);

  // 3. Estimate fold probability
  const foldProb = estimateFoldProb(villainProfile, pot, toCall, board);

  // 4. EV for each action
  const actions = {};

  // FOLD: EV = 0 (reference point)
  actions.fold = { ev: 0, confidence: 1.0 };

  // CALL
  if (toCall > 0) {
    const callEV = equity * (pot + toCall) - (1 - equity) * toCall;
    actions.call = {
      ev: Math.round(callEV),
      confidence: getConfidence('call', board, villainRange),
    };
  }

  // CHECK
  if (toCall === 0) {
    const realizationFactor = getRealizationFactor(heroCards, board, position);
    actions.check = {
      ev: Math.round(equity * pot * realizationFactor),
      confidence: getConfidence('check', board, villainRange),
    };
  }

  // RAISE sizes
  for (const size of [0.33, 0.50, 0.67, 1.0]) {
    const raiseAmount = Math.round(pot * size);
    const totalPotIfCalled = pot + raiseAmount * 2;
    const raiseEV =
      foldProb * pot +
      (1 - foldProb) * (equity * totalPotIfCalled - raiseAmount);
    actions[`raise_${Math.round(size * 100)}`] = {
      ev: Math.round(raiseEV),
      confidence: getConfidence('raise', board, villainRange) * 0.9,
    };
  }

  // ALL-IN
  const allinEV =
    foldProb * pot +
    (1 - foldProb) * (equity * (pot + toCall * 2) - toCall);
  actions.allin = {
    ev: Math.round(allinEV),
    confidence: getConfidence('allin', board, villainRange),
  };

  // Best action
  const sorted = Object.entries(actions).sort((a, b) => b[1].ev - a[1].ev);
  const best = sorted[0];

  return {
    actions,
    bestAction: best[0],
    bestEV: best[1].ev,
    equity,
    foldProb,
    villainRangeSize: villainRange.length,
    tier: 'quick',
    confidence: best[1].confidence,
  };
}

// ═══════════════════════════════════════
// TIER 2: RANGE vs RANGE EV (post-hand)
// More accurate. ~200ms.
// ═══════════════════════════════════════

export function calculateRangeEV(heroCards, board, villainRange, pot, toCall) {
  let totalEV = 0;
  let totalWeight = 0;

  for (const combo of villainRange) {
    if (cardsConflict(combo.cards, heroCards, board)) continue;
    const weight = combo.weight || 1;
    const eq = equityHeadsUp(heroCards, combo.cards, board, 150);
    totalEV += weight * (eq * (pot + toCall) - (1 - eq) * toCall);
    totalWeight += weight;
  }

  const rangeEV = totalWeight > 0 ? totalEV / totalWeight : 0;

  return {
    ev: Math.round(rangeEV),
    confidence: Math.min(0.85, 0.5 + villainRange.length * 0.002),
    tier: 'range',
    combosAnalyzed: villainRange.length,
  };
}

// ═══════════════════════════════════════
// TIER 3: SOLVER LOOKUP (pre-computed)
// ═══════════════════════════════════════

const SOLVER_DB = {};

export function lookupSolverEV(spot) {
  const key = buildSpotKey(spot);
  const solved = SOLVER_DB[key];
  if (solved) {
    return { ev: solved.ev, confidence: 0.95, tier: 'solver', source: solved.source };
  }
  return null;
}

function buildSpotKey(spot) {
  return `${spot.heroPosition}_vs_${spot.villainPosition}_${spot.boardTexture}_${spot.action}`;
}

// ═══════════════════════════════════════
// MASTER: Auto-select best tier
// ═══════════════════════════════════════

export function calculateEV(context, mode = 'auto') {
  if (mode === 'auto' || mode === 'deep') {
    const solver = lookupSolverEV(context.spot || {});
    if (solver) return solver;
    if (mode === 'deep' && context.villainRange) {
      return calculateRangeEV(context.heroCards, context.board, context.villainRange, context.pot, context.toCall);
    }
  }
  return calculateQuickEV(
    context.heroCards, context.board, context.pot, context.toCall,
    context.villainProfile || {}, context.position, context.actionHistory || []
  );
}

// ═══════════════════════════════════════
// ICM-ADJUSTED EV (tournament-specific)
// ═══════════════════════════════════════

export function calculateTournamentEV(chipEV, gameState) {
  const { playersRemaining, totalPlayers, payingPlaces } = gameState;
  const bubbleDistance = playersRemaining - (payingPlaces || Math.ceil(totalPlayers * 0.15));

  let icmWeight;
  if (playersRemaining > (payingPlaces || 75) * 1.3) icmWeight = 0.05;
  else if (playersRemaining > (payingPlaces || 75)) icmWeight = 0.3 + Math.max(0, 1 - bubbleDistance / (totalPlayers * 0.15)) * 0.5;
  else if (playersRemaining > 9) icmWeight = 0.4;
  else icmWeight = 0.7;

  const blendedEV = chipEV.ev * (1 - icmWeight);

  return {
    chipEV: chipEV.ev,
    icmEV: Math.round(blendedEV * icmWeight),
    blendedEV: Math.round(blendedEV),
    icmWeight,
    confidence: chipEV.confidence * (icmWeight < 0.3 ? 1.0 : 0.85),
    tier: chipEV.tier,
  };
}

// ═══════════════════════════════════════
// EV DISPLAY (range, not single number)
// ═══════════════════════════════════════

export function formatEV(evResult) {
  const { ev, confidence, tier } = evResult;
  const margin = Math.round(Math.abs(ev) * (1 - confidence) * 1.5);

  const badge = {
    solver: { label: 'Solver', color: '#48bb78', icon: '🟢' },
    range:  { label: 'Range analysis', color: '#f6e05e', icon: '🟡' },
    quick:  { label: 'Estimate', color: '#f97316', icon: '🟠' },
  }[tier] || { label: 'Unknown', color: '#888', icon: '⚪' };

  return {
    display: ev >= 0 ? `+${ev} ±${margin}` : `${ev} ±${margin}`,
    badge,
    confidence: `${Math.round(confidence * 100)}%`,
    isReliable: confidence >= 0.65,
    shouldTeach: confidence >= 0.60,
    shouldHighlight: confidence >= 0.75 && Math.abs(ev) > 200,
  };
}

// ═══════════════════════════════════════
// CONFIDENCE SYSTEM
// ═══════════════════════════════════════

function getConfidence(actionType, board, villainRange) {
  let conf = 0.7;
  if (actionType === 'allin') conf = 0.90;
  if (!board || board.length === 0) conf = Math.max(conf, 0.80);
  if (board && board.length >= 3) {
    const texture = classifyTexture(board);
    if (texture === 'dry') conf += 0.05;
    if (texture === 'wet') conf -= 0.10;
    if (texture === 'monotone') conf -= 0.08;
  }
  if (board && board.length === 5) conf += 0.05;
  if (villainRange) {
    if (villainRange.length < 50) conf += 0.05;
    if (villainRange.length > 200) conf -= 0.05;
  }
  return Math.max(0.30, Math.min(0.95, conf));
}

// ═══════════════════════════════════════
// RANGE ESTIMATION
// ═══════════════════════════════════════

export function estimateRange(villainProfile, position, actionHistory, board) {
  const vpip = villainProfile?.vpip || 0.25;
  // Generate combos that fall within villain's VPIP threshold
  const threshold = vpip + 0.05;
  const combos = [];
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const suits = ['s','h','d','c'];

  for (let i = 0; i < ranks.length; i++) {
    for (let j = i; j < ranks.length; j++) {
      const suited = i !== j;
      for (const s1 of suits) {
        const s2Options = suited ? suits.filter(s => s === s1) : suits.filter(s => s !== s1);
        if (i === j) {
          // Pairs — use one combo representative
          const card1 = ranks[i] + 's';
          const card2 = ranks[j] + 'h';
          const val = getHandValue(card1, card2);
          if (val <= threshold) {
            combos.push({
              cards: [card1, card2],
              strength: 1 - val,
              weight: 6, // 6 combos for pairs
            });
          }
        } else {
          // Suited
          const sc1 = ranks[i] + 's';
          const sc2 = ranks[j] + 's';
          const sVal = getHandValue(sc1, sc2);
          if (sVal <= threshold) {
            combos.push({
              cards: [sc1, sc2],
              strength: 1 - sVal,
              weight: 4, // 4 suited combos
            });
          }
          // Offsuit
          const oc1 = ranks[i] + 's';
          const oc2 = ranks[j] + 'h';
          const oVal = getHandValue(oc1, oc2);
          if (oVal <= threshold) {
            combos.push({
              cards: [oc1, oc2],
              strength: 1 - oVal,
              weight: 12, // 12 offsuit combos
            });
          }
        }
      }
      if (i !== j) break; // only need one iteration for non-pair
    }
  }

  // Narrow by action history
  if (actionHistory) {
    for (const action of actionHistory) {
      if (action.type === 'raise') {
        const raiseThreshold = 0.6;
        return combos.filter(h => h.strength >= raiseThreshold);
      }
    }
  }

  return combos;
}

export function estimateFoldProb(villainProfile, pot, betSize, board) {
  let foldProb = villainProfile?.foldToCbet || 0.45;
  const potRatio = pot > 0 ? betSize / pot : 0;
  if (potRatio > 0.75) foldProb += 0.08;
  if (potRatio < 0.33) foldProb -= 0.08;

  if (board && board.length >= 3) {
    const texture = classifyTexture(board);
    if (texture === 'dry') foldProb += 0.05;
    if (texture === 'wet') foldProb -= 0.05;
  }
  if (board?.length === 4) foldProb -= 0.05;
  if (board?.length === 5) foldProb -= 0.10;

  const style = villainProfile?.style;
  if (style === 'STATION') foldProb = 0.15;
  if (style === 'Nit') foldProb += 0.10;
  if (style === 'Maniac') foldProb -= 0.10;

  return Math.max(0.05, Math.min(0.90, foldProb));
}

// ═══════════════════════════════════════
// EQUITY CALCULATIONS
// ═══════════════════════════════════════

function equityVsRange(heroCards, board, range, iterations) {
  if (range.length === 0) return 0.5;
  let totalWeight = 0;
  let totalEquity = 0;

  // Sample from range
  const sampleSize = Math.min(range.length, 20);
  const step = Math.max(1, Math.floor(range.length / sampleSize));

  for (let i = 0; i < range.length; i += step) {
    const combo = range[i];
    if (cardsConflict(combo.cards, heroCards, board)) continue;
    const eq = equityHeadsUp(heroCards, combo.cards, board, Math.floor(iterations / sampleSize));
    totalEquity += eq * (combo.weight || 1);
    totalWeight += combo.weight || 1;
  }

  return totalWeight > 0 ? totalEquity / totalWeight : 0.5;
}

function equityHeadsUp(heroCards, villainCards, board, sims) {
  const used = new Set([...heroCards, ...villainCards, ...(board || [])]);
  const remaining = createDeck().filter(c => !used.has(c));
  const boardNeeded = 5 - (board?.length || 0);
  let wins = 0;

  for (let i = 0; i < sims; i++) {
    const shuffled = shuffle(remaining);
    const fullBoard = [...(board || []), ...shuffled.slice(0, boardNeeded)];
    const heroHand = evaluateHand(heroCards, fullBoard);
    const villainHand = evaluateHand(villainCards, fullBoard);
    if (heroHand && villainHand) {
      const cmp = compareHands(heroHand, villainHand);
      if (cmp > 0) wins++;
      else if (cmp === 0) wins += 0.5;
    }
  }

  return wins / sims;
}

function cardsConflict(cards1, cards2, board) {
  const all = [...(cards2 || []), ...(board || [])];
  for (const c of cards1 || []) {
    if (all.includes(c)) return true;
  }
  return false;
}

// ═══════════════════════════════════════
// BOARD TEXTURE
// ═══════════════════════════════════════

export function classifyTexture(board) {
  if (!board || board.length < 3) return 'unknown';
  const suits = board.map(c => c[1]);
  const rv = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const vals = board.map(c => rv[c[0]] || 0).sort((a, b) => a - b);

  const suitCounts = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const maxSuit = Math.max(...Object.values(suitCounts));
  if (maxSuit >= 3) return 'monotone';

  const gaps = [];
  for (let i = 1; i < vals.length; i++) gaps.push(vals[i] - vals[i - 1]);
  const connected = gaps.filter(g => g <= 2).length;
  if (connected >= 2 || maxSuit >= 2) return 'wet';
  if (new Set(vals).size < vals.length) return 'paired';
  return 'dry';
}

// ═══════════════════════════════════════
// REALIZATION FACTOR
// ═══════════════════════════════════════

function getRealizationFactor(heroCards, board, position) {
  // In position = realize more equity
  const ipBonus = ['BTN', 'CO', 'HJ'].includes(position) ? 0.1 : 0;
  // Strong draws realize well
  const base = 0.7;
  return Math.min(1.0, base + ipBonus);
}
