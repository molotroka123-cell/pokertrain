// ActionRecorder.js — Records every decision with full context
// Per MASTER spec: every user action creates a complete record for AI analysis

import { getHandValue, handString, isInOpenRange } from '../engine/ranges.js';
import { potOdds, mRatio } from '../engine/equity.js';
import { classifyTexture } from '../engine/evEngine.js';
import { evaluateHand } from '../engine/evaluator.js';

let sessionId = null;
let records = [];
let handHistories = [];

export function startSession(tournamentFormat) {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  myChips, myBet, opponents, action, raiseAmount, decisionTimeMs,
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
  const isEVPositive = action === 'fold' ? false :
    action === 'call' ? equity > odds :
    action === 'raise' ? equity > 0.35 : // Simplified
    true;

  // GTO check (simplified)
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

  // Detect mistakes
  if (action === 'fold' && equity > odds + 0.10 && toCall > 0) {
    mistakeType = 'bad_fold';
    mistakeSeverity = equity > odds + 0.20 ? 'critical' : 'medium';
    evLost = Math.round((equity - odds) * potSize);
    gtoMatch = false;
    gtoAction = 'call';
  }
  if (action === 'call' && equity < odds - 0.10 && toCall > 0) {
    mistakeType = 'bad_call';
    mistakeSeverity = equity < odds - 0.20 ? 'critical' : 'medium';
    evLost = Math.round((odds - equity) * toCall);
    gtoMatch = false;
    gtoAction = 'fold';
  }
  if (action === 'call' && equity > 0.65 && stage !== 'preflop') {
    mistakeType = 'too_passive';
    mistakeSeverity = 'medium';
    gtoAction = 'raise';
    gtoMatch = false;
  }
  if (action === 'fold' && m < 10 && stage === 'preflop' && handVal <= 0.35 && toCall <= (blinds?.bb || 0)) {
    mistakeType = 'push_fold_error';
    mistakeSeverity = 'high';
    gtoAction = 'raise';
    gtoMatch = false;
  }
  if (isBubble && action === 'call' && equity < 0.55 && toCall > myChips * 0.3) {
    mistakeType = 'icm_error';
    mistakeSeverity = 'high';
    gtoAction = 'fold';
    gtoMatch = false;
  }

  const record = {
    id: `${sessionId}_h${handNumber}_${Date.now()}`,
    sessionId,
    tournamentFormat: null,
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
    totalHands: records.length,
    records,
    handHistories,
    summary: generateQuickSummary(),
  };
}

function generateQuickSummary() {
  if (records.length === 0) return {};
  const pf = records.filter(r => r.stage === 'preflop');
  const vpip = pf.filter(r => r.action !== 'fold').length / Math.max(1, pf.length);
  const pfr = pf.filter(r => r.action === 'raise').length / Math.max(1, pf.length);
  const mistakes = records.filter(r => r.mistakeType);
  const totalEVLost = mistakes.reduce((a, m) => a + (m.evLost || 0), 0);

  return {
    handsPlayed: records.length,
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
