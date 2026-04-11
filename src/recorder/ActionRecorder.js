// ActionRecorder.js — Records every decision with full context
// Per MASTER spec: every user action creates a complete record for AI analysis

import { getHandValue, handString, isInOpenRange, isIn3BetRange } from '../engine/ranges.js';
import { potOdds, mRatio, calculateEquity } from '../engine/equity.js';
import { classifyTexture, calculateQuickEV, calculateTournamentEV } from '../engine/evEngine.js';
import { evaluateHand } from '../engine/evaluator.js';
import { rankValue } from '../engine/deck.js';

// Draw detection: flush draw, OESD, gutshot, combo, backdoor
function detectDraws(hCards, board) {
  if (board.length < 3 || board.length >= 5 || hCards.length < 2) return null; // No draws on river
  const allCards = [...hCards, ...board];

  // Flush draw: 4 of same suit (hero must contribute at least 1)
  const suitCounts = {};
  allCards.forEach(c => { suitCounts[c[1]] = (suitCounts[c[1]] || 0) + 1; });
  const heroSuits = hCards.map(c => c[1]);
  const hasFlushDraw = Object.entries(suitCounts).some(
    ([suit, count]) => count === 4 && heroSuits.includes(suit)
  );
  const hasBackdoorFlush = !hasFlushDraw && board.length === 3 && Object.entries(suitCounts).some(
    ([suit, count]) => count === 3 && heroSuits.includes(suit)
  );

  // Straight draws: check all unique rank values
  const vals = [...new Set(allCards.map(c => rankValue(c[0])))].sort((a, b) => a - b);
  // Also check with Ace as 1 for wheel draws
  const valsWithLowAce = vals.includes(14) ? [1, ...vals].sort((a, b) => a - b) : vals;

  let hasStraightDraw = false; // OESD: 4 consecutive
  let hasGutshot = false;      // 4 within span of 5 (one gap)
  for (const v of [vals, valsWithLowAce]) {
    for (let i = 0; i <= v.length - 4; i++) {
      const span = v[i + 3] - v[i];
      if (span === 3) { hasStraightDraw = true; break; }
      if (span === 4 && !hasStraightDraw) { hasGutshot = true; }
    }
    if (hasStraightDraw) break;
  }

  const isCombo = hasFlushDraw && (hasStraightDraw || hasGutshot);
  const drawType = isCombo ? 'combo' :
    hasFlushDraw ? 'flush' :
    hasStraightDraw ? 'oesd' :
    hasGutshot ? 'gutshot' :
    hasBackdoorFlush ? 'backdoor_flush' : 'none';
  const outs = (hasFlushDraw ? 9 : 0) + (hasStraightDraw ? 8 : hasGutshot ? 4 : 0) - (isCombo ? 2 : 0);

  return { drawType, hasFlushDraw, hasStraightDraw, hasGutshot, hasBackdoorFlush, isCombo, outs };
}

let sessionId = null;
let records = [];
let handHistories = [];

let sessionFormat = null;

export function startSession(tournamentFormat) {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionFormat = tournamentFormat || null;
  records = [];
  handHistories = [];
  return sessionId;
}

export function getSessionId() { return sessionId; }
export function getRecords() { return records; }
export function getHandHistories() { return handHistories; }

// Record a single hero decision
export function recordDecision({
  handNumber, blindLevel, blinds, playersRemaining, totalPlayers,
  averageStack, isBubble, isFinalTable, tableId, playersAtTable,
  stage, position, holeCards, community, potSize, currentBet, toCall,
  myChips, myBet, opponents, action, raiseAmount, decisionTimeMs, tournamentFormat,
  facingAction,
}) {
  const hCards = holeCards || [];
  const board = community || [];

  // Computed fields
  const handVal = hCards.length === 2 ? getHandValue(hCards[0], hCards[1]) : 0.5;
  const numOpponents = Math.max(1, (opponents || []).length);

  // Build villain profile for range-weighted equity
  const villainProfile = (opponents || []).length > 0 ? {
    vpip: opponents[0].observedVpip || 0.25,
    style: opponents[0].style || 'TAG',
    position: opponents[0].position,
    foldToCbet: 0.45,
    af: 2.0,
  } : {};

  // Range-weighted equity via evEngine (like real poker software)
  // Falls back to raw Monte Carlo if evEngine fails
  let equity = 0.5;
  let raiseEV = null;
  let bestActionEV = null;
  let equitySource = 'fallback';

  if (hCards.length === 2) {
    try {
      const evResult = calculateQuickEV(hCards, board, potSize, toCall, villainProfile, position, [], myChips);
      equity = evResult.equity; // Range-weighted equity vs villain's likely hands
      equitySource = 'range';
      bestActionEV = { action: evResult.bestAction, ev: evResult.bestEV, confidence: evResult.bestConfidence };
      const raiseKeys = Object.keys(evResult.actions).filter(k => k.startsWith('raise_'));
      if (raiseKeys.length > 0) {
        const bestRaise = raiseKeys.reduce((best, k) =>
          evResult.actions[k].ev > (evResult.actions[best]?.ev ?? -Infinity) ? k : best, raiseKeys[0]);
        raiseEV = evResult.actions[bestRaise].ev;
      }
    } catch (e) {
      // Fallback to raw Monte Carlo vs random hands
      const mcResult = calculateEquity(hCards, board, numOpponents, board.length >= 3 ? 2000 : 1000);
      equity = mcResult.equity;
      equitySource = 'montecarlo';
    }
  }

  const odds = toCall > 0 ? potOdds(toCall, potSize) : 0;
  const sprVal = potSize > 0 ? myChips / potSize : Infinity;
  const m = mRatio(myChips, blinds?.sb || 0, blinds?.bb || 0, blinds?.ante || 0, playersAtTable || 9);
  const boardTexture = board.length >= 3 ? classifyTexture(board) : null;
  const draws = detectDraws(hCards, board);

  // Effective stack: min(hero, smallest opponent)
  const oppChips = (opponents || []).filter(o => o.chips > 0).map(o => o.chips);
  const effectiveStack = oppChips.length > 0 ? Math.min(myChips, Math.min(...oppChips)) : myChips;
  const effectiveStackBB = Math.round(effectiveStack / Math.max(blinds?.bb || 1, 1));

  // Opponent sizing as fraction of pot
  const betSizePotFraction = potSize > 0 && toCall > 0
    ? Math.round((toCall / (potSize - toCall)) * 100) / 100
    : null;

  // EV calculations using range-weighted equity
  const evOfCall = toCall > 0 ? (equity * (potSize + toCall)) - ((1 - equity) * toCall) : 0;
  const commitRatio = myChips > 0 ? toCall / myChips : 0;

  const isEVPositive = action === 'fold' ? false :
    action === 'call' ? evOfCall > 0 :
    action === 'raise' ? (raiseEV != null ? raiseEV > 0 : equity > 0.35) :
    true;

  // ICM-adjusted EV — chips worth more near money
  let icmEV = null;
  if (playersRemaining && totalPlayers) {
    try {
      const chipEVObj = { ev: evOfCall, confidence: 0.7, tier: 'quick' };
      const icmResult = calculateTournamentEV(chipEVObj, {
        playersRemaining, totalPlayers,
        payingPlaces: Math.ceil(totalPlayers * 0.15),
      });
      icmEV = { blendedEV: icmResult.blendedEV, icmWeight: Math.round(icmResult.icmWeight * 100) / 100 };
    } catch (e) {
      // Fallback silently
    }
  }

  // GTO check — uses stack-aware EV
  let gtoAction = null;
  let gtoMatch = true;
  let mistakeType = null;
  let mistakeSeverity = null;
  let evLost = 0;

  if (stage === 'preflop' && hCards.length === 2) {
    const bb = blinds?.bb || 0;
    if (toCall <= bb) {
      // Unopened pot — open or fold
      const shouldOpen = isInOpenRange(hCards[0], hCards[1], position);
      gtoAction = shouldOpen ? 'raise' : 'fold';
    } else {
      // Facing a raise — 3-bet, call, or fold
      const should3Bet = isIn3BetRange(hCards[0], hCards[1], position);
      const shouldDefend = isInOpenRange(hCards[0], hCards[1], position);
      if (should3Bet) {
        gtoAction = 'raise';
      } else if (shouldDefend) {
        gtoAction = 'call';
      } else {
        gtoAction = 'fold';
      }
    }
  }

  // Detect mistakes — stack-aware, proper EV math
  // bad_fold: folded when calling was +EV
  if (action === 'fold' && toCall > 0 && evOfCall > 0) {
    // Severity scales with how much EV was left on the table vs stack
    const evFraction = myChips > 0 ? evOfCall / myChips : 0;
    // Don't flag marginal spots (<2% of stack EV) as mistakes
    if (evFraction > 0.02 || evOfCall > (blinds?.bb || 100) * 3) {
      mistakeType = 'bad_fold';
      mistakeSeverity = evFraction > 0.10 ? 'critical' : 'medium';
      evLost = Math.round(evOfCall);
      gtoMatch = false;
      gtoAction = 'call';
    }
  }

  // bad_call: called when EV was negative
  if (action === 'call' && toCall > 0 && evOfCall < 0) {
    const lossAmt = Math.abs(evOfCall);
    const lossFraction = myChips > 0 ? lossAmt / myChips : 0;
    if (lossFraction > 0.02 || lossAmt > (blinds?.bb || 100) * 3) {
      mistakeType = 'bad_call';
      mistakeSeverity = lossFraction > 0.10 ? 'critical' : 'medium';
      evLost = Math.round(lossAmt);
      gtoMatch = false;
      gtoAction = 'fold';
    }
  }

  // too_passive: called with strong hand when raising is better
  // Account for SPR: low SPR (< 3) with strong equity = should be raising/shoving
  // High SPR with strong equity = raise for value
  if (action === 'call' && stage !== 'preflop') {
    const raiseThreshold = sprVal < 3 ? 0.55 : sprVal < 8 ? 0.62 : 0.70;
    if (equity > raiseThreshold) {
      mistakeType = 'too_passive';
      mistakeSeverity = sprVal < 3 && equity > 0.65 ? 'critical' : 'medium';
      // EV lost from not raising: estimate extra value missed
      const raiseSize = Math.min(potSize * 0.75, myChips);
      const extraEV = equity * raiseSize * 0.3; // ~30% of the time villain calls
      evLost = Math.round(extraEV);
      gtoAction = 'raise';
      gtoMatch = false;
    }
  }

  // push_fold_error: short stack, should be shoving
  if (action === 'fold' && m < 10 && stage === 'preflop' && handVal <= 0.35 && toCall <= (blinds?.bb || 0)) {
    mistakeType = 'push_fold_error';
    mistakeSeverity = m < 5 ? 'critical' : 'high';
    evLost = Math.round(myChips * 0.05); // ~5% of stack wasted on average
    gtoAction = 'raise';
    gtoMatch = false;
  }

  // draw_fold_error: folded a draw with correct pot odds
  if (action === 'fold' && !mistakeType && draws?.drawType && draws.drawType !== 'none' &&
      draws.drawType !== 'backdoor_flush' && toCall > 0 && evOfCall > 0) {
    const evFraction = myChips > 0 ? evOfCall / myChips : 0;
    if (evFraction > 0.01 || evOfCall > (blinds?.bb || 100) * 2) {
      mistakeType = 'draw_fold_error';
      mistakeSeverity = draws.isCombo ? 'critical' : draws.hasFlushDraw || draws.hasStraightDraw ? 'high' : 'medium';
      evLost = Math.round(evOfCall);
      gtoMatch = false;
      gtoAction = 'call';
    }
  }

  // icm_error: calling too light on the bubble with significant stack risk
  if (isBubble && action === 'call' && equity < 0.55 && commitRatio > 0.3) {
    mistakeType = 'icm_error';
    mistakeSeverity = commitRatio > 0.5 ? 'critical' : 'high';
    evLost = Math.round(Math.abs(evOfCall) * 1.5); // ICM multiplier — chips worth more near bubble
    gtoAction = 'fold';
    gtoMatch = false;
  }

  const record = {
    id: `${sessionId}_h${handNumber}_${Date.now()}`,
    sessionId,
    tournamentFormat: tournamentFormat || sessionFormat || null,
    timestamp: Date.now(),
    handNumber,
    blindLevel,
    blinds: blinds ? `${blinds.sb}/${blinds.bb}${blinds.ante ? '/' + blinds.ante : ''}` : '',
    playersRemaining,
    totalPlayers,
    averageStack,
    isBubble: !!isBubble,
    isFinalTable: !!isFinalTable,
    tableId,
    playersAtTable,
    stage,
    position,
    holeCards: hCards.join(' '),
    community: board.join(' '),
    potSize,
    currentBet,
    toCall,
    myChips,
    myBet,
    equity: Math.round(equity * 100) / 100,
    equitySource,
    potOdds: Math.round(odds * 100) / 100,
    spr: Math.round(sprVal * 10) / 10,
    mRatio: Math.round(m * 10) / 10,
    numOpponents,
    evOfCall: Math.round(evOfCall),
    commitRatio: Math.round(commitRatio * 100) / 100,
    raiseEV,
    bestActionEV,
    icmEV,
    isEVPositive,
    boardTexture,
    draws,
    effectiveStack,
    effectiveStackBB,
    betSizePotFraction,
    facingAction: facingAction || null,
    opponents: opponents || [],
    opponentCards: null, // Filled after showdown — all cards for AI analysis
    action,
    raiseAmount: raiseAmount || null,
    decisionTimeMs: decisionTimeMs || 0,
    // Post-hand (filled later)
    handResult: null,
    potWon: 0,
    chipsAfter: null,
    // Quality
    gtoAction,
    gtoMatch,
    mistakeType,
    mistakeSeverity,
    evLost,
  };

  records.push(record);

  // Async: request CFR solver solution (non-blocking, updates record later)
  if (hCards.length === 2 && stage !== 'preflop') {
    import('../engine/solver.js').then(({ solve }) => {
      const oppRange = (opponents || []).length > 0 ? 0.5 : 0.5;
      solve(hCards, board, potSize, toCall, myChips, {
        villainRangeStrength: oppRange,
        numOpponents,
        iterations: 800,
        heroPosition: position,
        villainPosition: facingAction?.position || (opponents || [])[0]?.position,
        stackDepthBB: effectiveStackBB,
      }).then(solverResult => {
        // Update record with solver data
        record.solverResult = {
          bestAction: solverResult.bestAction,
          bestEV: solverResult.bestEV,
          bestFrequency: solverResult.bestFrequency,
          equity: solverResult.equity,
          isMixedStrategy: solverResult.isMixedStrategy,
          actions: solverResult.actions,
          fromCache: solverResult.fromCache || false,
        };
        // Mixed strategy: don't flag as mistake if action has >15% frequency
        const heroActionFreq = solverResult.actions?.find(a => a.action === action || (action === 'call' && a.action === 'call') || (action === 'check' && a.action === 'check'));
        if (heroActionFreq && heroActionFreq.frequency >= 15) {
          record.gtoMatch = true;
          record.mistakeType = null;
          record.mistakeSeverity = null;
          record.evLost = 0;
        }
      }).catch(() => {}); // Solver failure is non-critical
    }).catch(() => {});
  }

  return record;
}

// Update record with hand result + opponent cards
export function updateHandResult(handNumber, result, potWon, chipsAfter, allHoleCards) {
  const rec = records.findLast(r => r.handNumber === handNumber);
  if (rec) {
    rec.handResult = result;
    rec.potWon = potWon;
    rec.chipsAfter = chipsAfter;
    // Record ALL opponent cards for AI debrief
    if (allHoleCards) {
      rec.opponentCards = {};
      for (const [id, cards] of Object.entries(allHoleCards)) {
        if (cards && cards.length === 2) {
          rec.opponentCards[id] = cards.join(' ');
        }
      }
    }
  }
}

// Record full hand history
export function recordHandHistory(handNum, data) {
  handHistories.push({ handNumber: handNum, ...data, timestamp: Date.now() });
}

// Export all data as JSON (for Claude analysis)
export function exportSession() {
  return {
    sessionId,
    exportDate: new Date().toISOString(),
    totalHands: new Set(records.map(r => r.handNumber)).size,
    records,
    handHistories,
    summary: generateQuickSummary(),
  };
}

function generateQuickSummary() {
  if (records.length === 0) return {};
  // Deduplicate: use FIRST preflop record per hand for VPIP/PFR
  const pfByHand = new Map();
  for (const r of records) {
    if (r.stage === 'preflop' && !pfByHand.has(r.handNumber)) {
      pfByHand.set(r.handNumber, r);
    }
  }
  const pfUnique = [...pfByHand.values()];
  const vpip = pfUnique.filter(r => r.action !== 'fold' && r.action !== 'bb_walk').length / Math.max(1, pfUnique.length);
  const pfr = pfUnique.filter(r => r.action === 'raise').length / Math.max(1, pfUnique.length);
  const mistakes = records.filter(r => r.mistakeType);
  const totalEVLost = mistakes.reduce((a, m) => a + (m.evLost || 0), 0);

  return {
    handsPlayed: new Set(records.map(r => r.handNumber)).size,
    vpip: Math.round(vpip * 100),
    pfr: Math.round(pfr * 100),
    totalMistakes: mistakes.length,
    criticalMistakes: mistakes.filter(m => m.mistakeSeverity === 'critical').length,
    estimatedEVLost: totalEVLost,
  };
}

// Save to localStorage — updates current session in place (no duplicates)
export function saveSession() {
  const data = exportSession();
  const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');

  // Find existing session by ID and update it, or add new
  const existingIdx = sessions.findIndex(s => s.sessionId === data.sessionId);
  if (existingIdx >= 0) {
    sessions[existingIdx] = data; // Update in place
  } else {
    sessions.push(data); // New session
  }

  // Keep last 50 sessions
  if (sessions.length > 50) sessions.splice(0, sessions.length - 50);
  localStorage.setItem('wsop_sessions', JSON.stringify(sessions));
}

export function loadSessions() {
  return JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
}
