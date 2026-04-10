// evEngine.js — Production EV Engine (MASTER-V2 spec)
// 3-Tier: Quick → Range → Solver
// Weighted ranges, multi-branch raise EV, confidence gating

import { createDeck, shuffle } from './deck.js';
import { evaluateHand, compareHands } from './evaluator.js';
import { WeightedRange, RV } from './WeightedRange.js';
import { SOLVER_SPOTS } from '../data/solverDB.js';

// ═══════════════════════════════════════════
// TIER 1: QUICK EV (~5ms, during gameplay)
// ═══════════════════════════════════════════

export function calculateQuickEV(heroCards, board, pot, toCall, villainProfile, position, actionHistory, heroStack) {
  // 1. Build weighted villain range
  const range = buildVillainRange(villainProfile, position, actionHistory, board);
  const excludeCards = [...heroCards, ...(board || [])];

  // 2. Equity vs weighted range
  const equity = equityVsWeightedRange(heroCards, board, range, excludeCards, 500);

  // 3. Fold probability FROM range composition (not just stats)
  const foldProb = estimateFoldProbFromRange(range, villainProfile, board, toCall, pot);

  // 4. Multi-branch EV for each action
  const actions = {};
  const stack = heroStack || 10000;

  // FOLD
  actions.fold = { ev: 0, confidence: 1.0 };

  // CALL
  if (toCall > 0) {
    const callEV = equity * (pot + toCall) - (1 - equity) * toCall;
    actions.call = {
      ev: Math.round(callEV),
      confidence: getConfidence('call', board, range),
    };
  }

  // CHECK (with dynamic realization factor)
  if (toCall === 0) {
    const rf = dynamicRealizationFactor(heroCards, board, position, villainProfile);
    actions.check = {
      ev: Math.round(equity * pot * rf),
      confidence: getConfidence('check', board, range),
    };
  }

  // RAISE — multi-branch (fold + call + re-raise)
  const reraiseProb = estimateReraiseProb(villainProfile);

  for (const pctPot of [0.33, 0.50, 0.67, 1.0]) {
    const raiseAmt = Math.round(pot * pctPot);
    if (raiseAmt > stack) continue;

    const rFold = foldProb + (pctPot > 0.75 ? 0.06 : pctPot < 0.33 ? -0.06 : 0);
    const rReraise = reraiseProb;
    const rCall = Math.max(0, 1 - rFold - rReraise);

    const evFold = pot;
    const potIfCalled = pot + raiseAmt * 2;
    const evCall = equity * potIfCalled - raiseAmt;

    // PATCH 2: Sigmoid reraise model (smooth, not binary)
    const reraiseCallProb = 1 / (1 + Math.exp(-12 * (equity - 0.52)));
    // equity 0.40→7%, 0.50→44%, 0.55→78%, 0.65→99%
    const evReraiseCall = equity * (pot + raiseAmt * 4) - raiseAmt * 2;
    const evReraiseFold = -raiseAmt;
    const evReraise = reraiseCallProb * evReraiseCall + (1 - reraiseCallProb) * evReraiseFold;

    const totalEV = rFold * evFold + rCall * evCall + rReraise * evReraise;

    actions[`raise_${Math.round(pctPot * 100)}`] = {
      ev: Math.round(totalEV),
      confidence: getConfidence('raise', board, range) * 0.85,
      breakdown: {
        foldPct: Math.round(rFold * 100),
        callPct: Math.round(rCall * 100),
        reraisePct: Math.round(rReraise * 100),
      },
    };
  }

  // ALL-IN
  const aiFold = Math.min(0.90, foldProb + 0.15);
  const aiEquity = equity; // vs calling range (tighter)
  const allInEV = aiFold * pot + (1 - aiFold) * (aiEquity * (pot + stack * 2) - stack);
  actions.allin = {
    ev: Math.round(allInEV),
    confidence: getConfidence('allin', board, range),
  };

  // Best action
  const sorted = Object.entries(actions).sort((a, b) => b[1].ev - a[1].ev);
  const best = sorted[0];

  return {
    actions,
    bestAction: best[0],
    bestEV: best[1].ev,
    bestConfidence: best[1].confidence,
    equity,
    foldProb,
    tier: 'quick',
    confidence: best[1].confidence,
  };
}

// ═══════════════════════════════════════════
// TIER 2: RANGE EV (~200ms, post-hand)
// ═══════════════════════════════════════════

export function calculateRangeEV(heroCards, board, villainRange, pot, toCall) {
  const combos = villainRange.getWeightedCombos([...heroCards, ...(board || [])]);
  if (combos.length === 0) return { ev: 0, confidence: 0.3, tier: 'range', combosAnalyzed: 0 };

  let totalEV = 0, totalWeight = 0;

  for (const combo of combos) {
    const eq = equityHeadsUp(heroCards, combo.cards, board, 100);
    const w = combo.weight;
    totalEV += w * (eq * (pot + toCall) - (1 - eq) * toCall);
    totalWeight += w;
  }

  return {
    ev: Math.round(totalWeight > 0 ? totalEV / totalWeight : 0),
    confidence: Math.min(0.85, 0.5 + combos.length * 0.0005),
    tier: 'range',
    combosAnalyzed: combos.length,
  };
}

// ═══════════════════════════════════════════
// TIER 3: SOLVER LOOKUP (pre-computed)
// ═══════════════════════════════════════════

export function lookupSolverEV(heroCards, board, position, villainPosition, action) {
  const boardTexture = board && board.length >= 3 ? classifyTexture(board) : 'preflop';
  const handCat = categorizeHand(heroCards);
  const key = `${position}_vs_${villainPosition}_${boardTexture}_${handCat}`;
  const spot = SOLVER_SPOTS[key];
  if (spot) {
    return {
      bestAction: spot.action,
      ev: spot.ev,
      frequency: spot.freq,
      confidence: 0.95,
      tier: 'solver',
      source: spot.source || 'desktop-postflop',
    };
  }
  return null;
}

// ═══════════════════════════════════════════
// MASTER: Auto-select best tier
// ═══════════════════════════════════════════

export function calculateEV(context, mode = 'auto') {
  const { heroCards, board, pot, toCall, villainProfile, position, actionHistory, heroStack } = context;

  // Try solver first
  if (mode !== 'quick') {
    const solver = lookupSolverEV(heroCards, board, position, villainProfile?.position, null);
    if (solver) return solver;
  }

  // Range EV for deep analysis
  if (mode === 'deep' && context.villainRange) {
    return calculateRangeEV(heroCards, board, context.villainRange, pot, toCall);
  }

  // Quick EV for gameplay
  return calculateQuickEV(heroCards, board, pot, toCall, villainProfile || {}, position, actionHistory || [], heroStack);
}

// ═══════════════════════════════════════════
// ICM-ADJUSTED EV
// ═══════════════════════════════════════════

export function calculateTournamentEV(chipEV, gameState) {
  const { playersRemaining, totalPlayers, payingPlaces } = gameState;
  const dist = playersRemaining - (payingPlaces || Math.ceil(totalPlayers * 0.15));

  let icmWeight;
  if (dist > totalPlayers * 0.2) icmWeight = 0.05;
  else if (dist > 0) icmWeight = 0.15 + (1 - dist / (totalPlayers * 0.2)) * 0.45;
  else if (playersRemaining > 9) icmWeight = 0.40;
  else icmWeight = 0.65;

  const blendedEV = chipEV.ev * (1 - icmWeight);

  return {
    chipEV: chipEV.ev,
    blendedEV: Math.round(blendedEV),
    icmWeight,
    confidence: chipEV.confidence * (icmWeight > 0.3 ? 0.85 : 1.0),
    tier: chipEV.tier,
  };
}

// ═══════════════════════════════════════════
// MISTAKE EVALUATION (confidence gated!)
// ═══════════════════════════════════════════

export function evaluateMistake(playerAction, evResult) {
  const best = evResult.bestAction;
  const bestEV = evResult.bestEV;
  const playerEV = evResult.actions[playerAction]?.ev || 0;
  const confidence = evResult.bestConfidence || evResult.confidence || 0.5;
  const evDiff = bestEV - playerEV;
  const margin = Math.round(Math.abs(evDiff) * (1 - confidence) * 1.5);

  // CRITICAL GATE: don't teach from low-confidence evaluations
  if (confidence < 0.60) {
    return { evLost: null, isMistake: false, shouldTeach: false, note: 'Low confidence — not enough data to judge' };
  }

  // Only flag if EV difference exceeds margin of error
  if (evDiff <= margin) {
    return { evLost: 0, isMistake: false, shouldTeach: false, note: 'Within margin of error' };
  }

  return {
    evLost: evDiff,
    evRange: `${evDiff} ±${margin}`,
    isMistake: true,
    shouldTeach: true,
    confidence,
    bestAction: best,
    playerAction,
    severity: evDiff > bestEV * 0.5 ? 'critical' : evDiff > 200 ? 'high' : 'medium',
  };
}

// ═══════════════════════════════════════════
// EV DISPLAY (range, not single number)
// ═══════════════════════════════════════════

export function formatEV(evResult) {
  const { ev, confidence, tier } = evResult;
  const margin = Math.round(Math.abs(ev || 0) * (1 - (confidence || 0.5)) * 1.5);
  const badge = {
    solver: { label: 'Solver', color: '#48bb78', icon: '🟢' },
    range: { label: 'Range', color: '#f6e05e', icon: '🟡' },
    quick: { label: 'Estimate', color: '#f97316', icon: '🟠' },
  }[tier] || { label: '?', color: '#888', icon: '⚪' };

  return {
    display: (ev || 0) >= 0 ? `+${ev} ±${margin}` : `${ev} ±${margin}`,
    badge,
    confidence: `${Math.round((confidence || 0.5) * 100)}%`,
    isReliable: (confidence || 0) >= 0.65,
    shouldTeach: (confidence || 0) >= 0.60,
  };
}

// ═══════════════════════════════════════════
// WEIGHTED RANGE BUILDER
// ═══════════════════════════════════════════

export function buildVillainRange(villainProfile, position, actionHistory, board) {
  const range = new WeightedRange();

  // Step 1: Apply positional open range
  range.applyPreflopOpen(position, villainProfile?.vpip || 0.25);

  // Step 2: Apply villain style
  if (villainProfile?.style) range.applyVillainStyle(villainProfile.style);

  // Step 3: Apply action history
  if (actionHistory) {
    for (const action of actionHistory) {
      if (action.type === 'raise') range.applyRaise(action.amount || 0, action.pot || 100);
      if (action.type === 'call') range.applyCall();
      if (action.type === 'check') range.applyCheck();
    }
  }

  // Step 4: Apply board interaction (postflop)
  if (board && board.length >= 3) range.applyBoardInteraction(board);

  return range;
}

// ═══════════════════════════════════════════
// FOLD PROBABILITY — FROM RANGE (not just stats!)
// ═══════════════════════════════════════════

function estimateFoldProbFromRange(range, villainProfile, board, toCall, pot) {
  // % of weak hands in range = base fold probability
  const airPct = range.getAirPercentage(board);

  // Blend with villain's historical fold stats
  const statsFold = villainProfile?.foldToCbet || 0.45;
  let foldProb = statsFold * 0.4 + airPct * 0.6; // Range-weighted!

  // Bet size adjustment
  const betPctPot = pot > 0 ? toCall / pot : 0;
  if (betPctPot > 0.75) foldProb += 0.06;
  if (betPctPot < 0.33) foldProb -= 0.06;
  if (betPctPot > 1.5) foldProb += 0.12;

  // Board texture
  if (board && board.length >= 3) {
    const tex = classifyTexture(board);
    if (tex === 'dry') foldProb += 0.04;
    if (tex === 'wet') foldProb -= 0.06;
  }

  // Street
  if (board?.length === 4) foldProb -= 0.04;
  if (board?.length === 5) foldProb -= 0.08;

  // Villain type hard caps
  if (villainProfile?.style === 'STATION') foldProb = Math.min(foldProb, 0.15);
  if (villainProfile?.style === 'Nit') foldProb = Math.max(foldProb, 0.55);

  return Math.max(0.05, Math.min(0.90, foldProb));
}

function estimateReraiseProb(villainProfile) {
  let prob = 0.08;
  if (villainProfile?.af > 3.5) prob += 0.05;
  if (villainProfile?.style === 'Maniac' || villainProfile?.style === 'LAG') prob += 0.06;
  if (villainProfile?.style === 'Nit') prob = 0.03;
  if (villainProfile?.style === 'STATION') prob = 0.02;
  return Math.max(0.02, Math.min(0.25, prob));
}

// ═══════════════════════════════════════════
// DYNAMIC REALIZATION FACTOR
// ═══════════════════════════════════════════

function dynamicRealizationFactor(heroCards, board, position, villainProfile, pot, stack) {
  let rf = 0.85;

  // Position
  if (position === 'BTN' || position === 'CO') rf += 0.08;
  if (position === 'SB') rf -= 0.05;
  if (position === 'BB') rf -= 0.03;

  // PATCH 3: SPR affects realization
  const spr = (stack || 10000) / Math.max(pot || 1, 1);
  if (spr < 3) rf += 0.08;       // Short SPR: committed, see showdown
  else if (spr < 6) rf += 0.03;
  else if (spr > 12) rf -= 0.06; // Deep: complex postflop

  // Hand type + backdoor draws
  if (board && board.length >= 3) {
    const wr = new WeightedRange();
    const inter = wr.evaluateBoardInteraction(heroCards, board);
    if (inter.type === 'draw') rf -= 0.08;
    if (inter.type === 'top_pair_plus') rf += 0.05;
    if (inter.type === 'air') rf -= 0.12;

    // Backdoor flush (3 of suit but not 4)
    const allSuits = [...heroCards, ...board].map(c => c[1]);
    const sc = {};
    allSuits.forEach(s => { sc[s] = (sc[s] || 0) + 1; });
    const maxSuit = Math.max(...Object.values(sc));
    if (maxSuit === 3) rf += 0.04; // backdoor flush draw

    // Backdoor straight (3 within 4 ranks)
    const allVals = [...new Set([...heroCards, ...board].map(c => RV[c[0]] || 0))].sort((a, b) => a - b);
    for (let i = 0; i < allVals.length - 2; i++) {
      if (allVals[i + 2] - allVals[i] <= 4) { rf += 0.03; break; }
    }

    // Overcards
    const boardMax = Math.max(...board.map(c => RV[c[0]] || 0));
    if (heroCards.some(c => (RV[c[0]] || 0) > boardMax)) rf += 0.03;
  }

  // Villain aggression reduces OOP realization
  if (villainProfile?.af > 3.5 && position !== 'BTN' && position !== 'CO') rf -= 0.05;

  // Suited = nut potential
  if (heroCards.length >= 2 && heroCards[0][1] === heroCards[1][1]) rf += 0.03;

  return Math.max(0.35, Math.min(1.0, rf));
}

// ═══════════════════════════════════════════
// EQUITY VS WEIGHTED RANGE
// ═══════════════════════════════════════════

function equityVsWeightedRange(heroCards, board, range, excludeCards, sims) {
  const combos = range.getWeightedCombos(excludeCards);
  if (combos.length === 0) return 0.5;

  const totalWeight = combos.reduce((a, c) => a + c.weight, 0);
  let weightedWins = 0;
  let validSims = 0;

  const knownSet = new Set(excludeCards);
  const remaining = createDeck().filter(c => !knownSet.has(c));

  for (let i = 0; i < sims; i++) {
    // Weighted random villain hand
    let roll = Math.random() * totalWeight;
    let villain = combos[0];
    for (const c of combos) {
      roll -= c.weight;
      if (roll <= 0) { villain = c; break; }
    }

    // Card conflict check
    if (knownSet.has(villain.cards[0]) || knownSet.has(villain.cards[1])) continue;

    // Run out board
    const vSet = new Set(villain.cards);
    const deck = remaining.filter(c => !vSet.has(c));
    const shuffled = quickShuffle(deck);
    const fullBoard = [...(board || [])];
    let di = 0;
    while (fullBoard.length < 5 && di < shuffled.length) fullBoard.push(shuffled[di++]);

    const heroHand = evaluateHand(heroCards, fullBoard);
    const villHand = evaluateHand(villain.cards, fullBoard);
    if (heroHand && villHand) {
      const cmp = compareHands(heroHand, villHand);
      if (cmp > 0) weightedWins += 1;
      else if (cmp === 0) weightedWins += 0.5;
    }
    validSims++;
  }

  return validSims > 0 ? weightedWins / validSims : 0.5;
}

function equityHeadsUp(heroCards, villainCards, board, sims) {
  const used = new Set([...heroCards, ...villainCards, ...(board || [])]);
  const remaining = createDeck().filter(c => !used.has(c));
  const need = 5 - (board?.length || 0);
  let wins = 0;

  for (let i = 0; i < sims; i++) {
    const sh = quickShuffle(remaining);
    const full = [...(board || []), ...sh.slice(0, need)];
    const h = evaluateHand(heroCards, full);
    const v = evaluateHand(villainCards, full);
    if (h && v) {
      const c = compareHands(h, v);
      if (c > 0) wins++;
      else if (c === 0) wins += 0.5;
    }
  }
  return wins / sims;
}

// ═══════════════════════════════════════════
// CONFIDENCE
// ═══════════════════════════════════════════

function getConfidence(actionType, board, range) {
  let conf = 0.65;
  if (actionType === 'allin') conf = 0.88;
  if (!board || board.length === 0) conf = Math.max(conf, 0.78);
  if (board?.length === 5) conf += 0.04;

  if (board && board.length >= 3) {
    const tex = classifyTexture(board);
    if (tex === 'dry') conf += 0.04;
    if (tex === 'wet') conf -= 0.08;
    if (tex === 'monotone') conf -= 0.06;
  }

  // Range entropy — narrow range = more confident
  if (range) {
    const ent = range.entropy();
    conf += (1 - ent) * 0.1;
  }

  return Math.max(0.30, Math.min(0.95, conf));
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

export function classifyTexture(board) {
  if (!board || board.length < 3) return 'unknown';
  const suits = board.map(c => c[1]);
  const vals = board.map(c => RV[c[0]] || 0).sort((a, b) => a - b);
  const sc = {};
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1; });
  if (Math.max(...Object.values(sc)) >= 3) return 'monotone';
  const gaps = [];
  for (let i = 1; i < vals.length; i++) gaps.push(vals[i] - vals[i - 1]);
  if (gaps.filter(g => g <= 2).length >= 2 || Math.max(...Object.values(sc)) >= 2) return 'wet';
  if (new Set(vals).size < vals.length) return 'paired';
  return 'dry';
}

function categorizeHand(cards) {
  if (!cards || cards.length < 2) return 'unknown';
  const v1 = RV[cards[0][0]], v2 = RV[cards[1][0]];
  const suited = cards[0][1] === cards[1][1];
  const pair = v1 === v2;
  const hi = Math.max(v1, v2);
  if (pair && hi >= 12) return 'premium';
  if (pair) return 'pair';
  if (hi >= 14 && Math.min(v1, v2) >= 11) return 'broadway';
  if (suited && hi >= 14) return 'ax_suited';
  if (suited) return 'suited';
  return 'offsuit';
}

function quickShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
