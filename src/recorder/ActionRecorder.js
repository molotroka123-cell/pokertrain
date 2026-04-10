// ActionRecorder.js — Records every decision with full context
// Per MASTER spec: every user action creates a complete record for AI analysis

import { getHandValue, handString, isInOpenRange } from '../engine/ranges.js';
import { potOdds, mRatio } from '../engine/equity.js';
import { classifyTexture } from '../engine/evEngine.js';
import { evaluateHand } from '../engine/evaluator.js';

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
}) {
  const hCards = holeCards || [];
  const board = community || [];

  // Computed fields — use proper equity based on street
  const handVal = hCards.length === 2 ? getHandValue(hCards[0], hCards[1]) : 0.5;
  let equity;
  if (board.length >= 3 && hCards.length === 2) {
    // Postflop: use actual hand evaluation
    const evalResult = evaluateHand(hCards, board);
    const strengthMap = [0, 0.15, 0.45, 0.60, 0.70, 0.78, 0.83, 0.88, 0.93, 0.97, 1.0];
    equity = evalResult ? (strengthMap[evalResult.rank] || 0.15) + Math.min(0.1, (evalResult.value % 1e6) / 1e7) : 0.3;
  } else {
    // Preflop: range-based estimate
    equity = 1 - handVal;
  }
  const odds = toCall > 0 ? potOdds(toCall, potSize) : 0;
  const sprVal = potSize > 0 ? myChips / potSize : Infinity;
  const m = mRatio(myChips, blinds?.sb || 0, blinds?.bb || 0, blinds?.ante || 0, playersAtTable || 9);
  const boardTexture = board.length >= 3 ? classifyTexture(board) : null;

  // Is this +EV?
  const evOfCall = toCall > 0 ? (equity * (potSize + toCall)) - ((1 - equity) * toCall) : 0;
  const commitRatio = myChips > 0 ? toCall / myChips : 0;  // How much of stack this costs
  const isEVPositive = action === 'fold' ? false :
    action === 'call' ? evOfCall > 0 :
    action === 'raise' ? equity > 0.35 : // Simplified
    true;

  // GTO check — uses stack-aware EV
  let gtoAction = null;
  let gtoMatch = true;
  let mistakeType = null;
  let mistakeSeverity = null;
  let evLost = 0;

  if (stage === 'preflop' && hCards.length === 2) {
    const shouldOpen = isInOpenRange(hCards[0], hCards[1], position);
    if (toCall <= (blinds?.bb || 0)) {
      gtoAction = shouldOpen ? 'raise' : 'fold';
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
    potOdds: Math.round(odds * 100) / 100,
    spr: Math.round(sprVal * 10) / 10,
    mRatio: Math.round(m * 10) / 10,
    evOfCall: Math.round(evOfCall),
    commitRatio: Math.round(commitRatio * 100) / 100,
    isEVPositive,
    boardTexture,
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
