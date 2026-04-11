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

// Made hand classification: overpair, top pair, etc.
function classifyMadeHand(hCards, board) {
  if (!hCards || hCards.length < 2 || !board || board.length < 3) return 'unknown';
  try {
    const hRanks = hCards.map(c => rankValue(c[0]));
    const bRanks = board.map(c => rankValue(c[0]));
    const boardMax = Math.max(...bRanks);
    const boardMin = Math.min(...bRanks);
    const allRanks = [...hRanks, ...bRanks];
    const counts = {};
    allRanks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
    const bCounts = {};
    bRanks.forEach(r => { bCounts[r] = (bCounts[r] || 0) + 1; });

    // Check for quads, full house, flush, straight via evaluator result
    const evalResult = evaluateHand(hCards, board);
    if (!evalResult) return 'high_card';
    if (evalResult.rank >= 9) return 'straight_flush';
    if (evalResult.rank === 8) return 'quads';
    if (evalResult.rank === 7) return 'full_house';
    if (evalResult.rank === 6) return 'flush';
    if (evalResult.rank === 5) return 'straight';

    // Trips vs set
    if (evalResult.rank === 4) {
      // Set = pocket pair hit board, Trips = board pair matched one hole card
      if (hRanks[0] === hRanks[1] && bRanks.includes(hRanks[0])) return 'set';
      return 'trips';
    }

    // Two pair
    if (evalResult.rank === 3) return 'two_pair';

    // Pair classification
    if (evalResult.rank === 2) {
      // Find the pair rank
      const pairRank = Object.entries(counts).find(([r, c]) => c >= 2)?.[0];
      if (!pairRank) return 'pair';
      const pr = Number(pairRank);

      // Overpair: pocket pair higher than all board cards
      if (hRanks[0] === hRanks[1] && hRanks[0] > boardMax) return 'overpair';
      // Top pair: one hole card matches highest board card
      if (pr === boardMax && hRanks.includes(pr)) {
        // Check kicker
        const kicker = hRanks.find(r => r !== pr) || 0;
        if (kicker >= 12) return 'top_pair_top_kicker'; // A or K kicker
        return 'top_pair';
      }
      // Middle pair
      const sortedBoard = [...bRanks].sort((a, b) => b - a);
      if (sortedBoard.length >= 2 && pr === sortedBoard[1]) return 'middle_pair';
      // Bottom pair
      if (pr === boardMin) return 'bottom_pair';
      // Underpair (pocket pair below board)
      if (hRanks[0] === hRanks[1] && hRanks[0] < boardMin) return 'underpair';
      return 'pair';
    }

    // High card — count overcards
    const overcards = hRanks.filter(r => r > boardMax).length;
    if (overcards === 2) return 'two_overcards';
    if (overcards === 1) return 'one_overcard';
    return 'high_card';
  } catch (e) {
    return 'unknown';
  }
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
  facingAction, villainAction, streetActions, chipsBeforeHand,
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

  // Build villain action history from streetActions for range narrowing
  // Count villain barrels (postflop bets/raises ONLY — each = range narrower)
  // A "barrel" = villain initiated aggression on a new street
  const villainActions = [];
  const sActs = streetActions || [];
  let villainBarrels = 0;
  let villain3Bet = false;
  const seenStreets = new Set(); // Track unique streets villain bet on

  for (const a of sActs) {
    if (typeof a === 'string') {
      // String format: "[SB] Phil raise 1200"
      const isVillain = !a.includes('Hero');
      const isAgg = a.includes('raise') || a.includes('ALL-IN');
      if (isVillain) {
        if (isAgg) {
          villainActions.push({ type: 'raise', amount: 0, pot: potSize });
          // Detect which street this action is on (preflop vs postflop)
          // Preflop 3-bet detection: villain raised AND it's before any community cards
          // In streetActions, early raises = preflop
        } else if (a.includes('call')) {
          villainActions.push({ type: 'call' });
        } else if (a.includes('check')) {
          villainActions.push({ type: 'check' });
        }
      }
    } else if (a && !a.isHero) {
      if (a.action === 'raise') {
        villainActions.push({ type: 'raise', amount: a.amount || 0, pot: a.pot || potSize });
        // Count postflop barrels by unique street
        if (a.street && a.street !== 'preflop') {
          seenStreets.add(a.street);
        }
      } else if (a.action === 'call') {
        villainActions.push({ type: 'call' });
      } else if (a.action === 'check') {
        villainActions.push({ type: 'check' });
      }
    }
  }

  // Detect 3-bet: look for TWO+ preflop raises in streetActions (hero open + villain re-raise)
  const preflopRaises = sActs.filter(a => {
    if (typeof a === 'string') return a.includes('raise') && !a.includes('Hero');
    return a && !a.isHero && a.action === 'raise' && a.street === 'preflop';
  });
  if (preflopRaises.length >= 1 && stage !== 'preflop') {
    // Villain raised preflop (either 3-bet or open from blinds)
    villain3Bet = true;
  }

  // Count current facing action as a barrel if it's a postflop bet
  if (facingAction?.action === 'raise' && toCall > 0 && stage !== 'preflop') {
    seenStreets.add(stage);
  }
  villainBarrels = seenStreets.size; // Unique postflop streets villain bet on

  // Range-weighted equity via evEngine (like real poker software)
  // Now passes villain's actual actions for range narrowing
  let equity = 0.5;
  let raiseEV = null;
  let bestActionEV = null;
  let equitySource = 'fallback';

  if (hCards.length === 2) {
    try {
      const evResult = calculateQuickEV(hCards, board, potSize, toCall, villainProfile, position, villainActions, myChips);
      equity = evResult.equity;
      equitySource = 'range';

      // Apply barrel discount: each barrel = villain's range narrows to stronger hands
      // Research: triple barrel range typically < 15% of starting range
      // 1 barrel: ~35% of range continues (mild narrowing)
      // 2 barrels: ~20% of range (significant narrowing)
      // 3 barrels: ~10% of range (only value + some bluffs)
      // Barrel discount: each barrel = villain's range narrows to value-heavy
      // 1 barrel: 85% of raw equity (mild)
      // 2 barrels: 70% (significant — only top of range continues)
      // 3 barrels: 50% (only nuts + some bluffs — real triple-barrel range ~10% of combos)
      const barrelDiscount = villainBarrels >= 3 ? 0.50 :
        villainBarrels >= 2 ? 0.70 :
        villainBarrels >= 1 ? 0.85 : 1.0;
      equity = equity * barrelDiscount;

      // 3-bet pot: villain started with ~8-12% range (vs ~25% open range)
      if (villain3Bet) {
        equity = equity * 0.78;
      }

      // Board texture: paired board + flush = villain's value range dominates hard
      if (board.length >= 3) {
        const bRanks = board.map(c => {
          const rv = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
          return rv[c[0]] || 0;
        });
        const bSuits = board.map(c => c[1]);
        const isPaired = new Set(bRanks).size < bRanks.length;
        const suitCounts = {};
        bSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
        const flushPossible = Object.values(suitCounts).some(c => c >= 3);
        // Paired + flush board: villain barrels almost only with boats/flushes/trips
        if (isPaired && flushPossible && villainBarrels >= 2) {
          equity = equity * 0.80;
        } else if (isPaired && villainBarrels >= 2) {
          equity = equity * 0.88;
        } else if (flushPossible && villainBarrels >= 2) {
          equity = equity * 0.85;
        }
      }

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

  // Raise sizing relative to pot
  const raisePotRatio = action === 'raise' && raiseAmount && potSize > 0
    ? Math.round((raiseAmount / potSize) * 100) / 100 : null;

  // Villain stack at decision time
  const villainStackAtDecision = (opponents || []).length > 0 ? (opponents[0].chips || 0) : null;

  // Action type classification
  const bb = blinds?.bb || 1;
  const isOpenRaise = action === 'raise' && stage === 'preflop' && toCall <= bb;
  const is3Bet = action === 'raise' && stage === 'preflop' && toCall > bb && currentBet <= bb * 6;
  const is4Bet = action === 'raise' && stage === 'preflop' && currentBet > bb * 6;

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

  // Detect mistakes — stack-aware, action-aware EV math
  // Villain strength signal: more barrels/3-bet = stronger range = higher bar for calling
  const villainStrength = villainBarrels + (villain3Bet ? 1 : 0);
  // Required EV threshold scales with villain aggression:
  // 0 barrels: standard (2% stack), 2 barrels: 4%, 3+ barrels: 6%+
  const evThresholdMult = 1 + villainStrength * 0.5;

  // bad_fold: folded when calling was +EV
  // BUT: against heavy action (3-bet + 3 barrels), fold is usually correct
  if (action === 'fold' && toCall > 0 && evOfCall > 0) {
    const evFraction = myChips > 0 ? evOfCall / myChips : 0;
    const bbThreshold = (blinds?.bb || 100) * 3 * evThresholdMult;
    const stackThreshold = 0.02 * evThresholdMult;
    // Triple barrel or 3-bet+2barrels: only flag as mistake with very high EV
    if (evFraction > stackThreshold || evOfCall > bbThreshold) {
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

  // Compact record for preflop folds (no heavy analysis needed for Claude review)
  const isTrivialFold = action === 'fold' && stage === 'preflop' && !mistakeType;

  const record = isTrivialFold ? {
    id: `${sessionId}_h${handNumber}_${Date.now()}`,
    sessionId,
    timestamp: Date.now(),
    handNumber,
    stage,
    position,
    holeCards: hCards.join(' '),
    action: 'fold',
    myChips,
    chipsBeforeHand: chipsBeforeHand || myChips,
    effectiveStackBB,
    blinds: blinds ? `${blinds.sb}/${blinds.bb}${blinds.ante ? '/' + blinds.ante : ''}` : '',
    toCall,
    playersRemaining,
    playersAtTable,
    gtoAction,
    gtoMatch,
    mRatio: Math.round(m * 10) / 10,
    // No mistake — trivial fold
    handResult: null, potWon: 0, chipsAfter: null,
  } : {
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
    chipsBeforeHand: chipsBeforeHand || myChips,
    myBet,
    equity: Math.round(equity * 100) / 100,
    equitySource,
    villainBarrels,
    villain3Bet,
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
    drawOuts: draws?.outs || 0,
    madeHandStrength: board.length >= 3 ? classifyMadeHand(hCards, board) : null,
    effectiveStack,
    effectiveStackBB,
    betSizePotFraction,
    facingAction: facingAction || null,
    villainAction: villainAction || null,
    streetActions: streetActions || [],
    opponents: opponents || [],
    opponentCards: null,
    action,
    raiseAmount: raiseAmount || null,
    raisePotRatio,
    isOpenRaise: isOpenRaise || false,
    is3Bet: is3Bet || false,
    is4Bet: is4Bet || false,
    villainStackAtDecision,
    decisionTimeMs: decisionTimeMs || 0,
    handResult: null,
    potWon: 0,
    chipsAfter: null,
    heroWouldWin: null, // filled after showdown with opponent cards
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
      // Estimate villain range strength from position + action
      // Tighter position or stronger action = higher range strength
      const vPos = facingAction?.position || (opponents || [])[0]?.position || 'CO';
      const posStrength = { UTG: 0.8, 'UTG+1': 0.75, MP: 0.65, HJ: 0.55, CO: 0.4, BTN: 0.3, SB: 0.45, BB: 0.35 };
      const actionBoost = facingAction?.action === 'raise' ? 0.15 : facingAction?.action === 'call' ? -0.1 : 0;
      const oppRange = Math.max(0.1, Math.min(0.9, (posStrength[vPos] || 0.5) + actionBoost));
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
  const uniqueHands = new Set(records.map(r => r.handNumber)).size;
  const historyHands = handHistories.length;
  return {
    sessionId,
    exportDate: new Date().toISOString(),
    totalHands: uniqueHands,
    totalHistoryHands: historyHands,
    handsMatch: uniqueHands === historyHands, // Validation: should be true
    totalRecords: records.length,
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
