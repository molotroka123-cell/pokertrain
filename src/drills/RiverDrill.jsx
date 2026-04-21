// RiverDrill.jsx — River decisions: value bet, bluff, check, call, fold
import React, { useState, useCallback, useRef } from 'react';
import DrillShell, { drillStyles as ds, GTOFrequencies } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';
import { evaluateHand } from '../engine/evaluator.js';

const POSITIONS = ['BTN', 'CO', 'BB', 'SB'];

// Board-texture classifier — drives sizing-tier rules from user's tutorial
function classifyBoard(board) {
  const ranks = board.map(c => c[0]);
  const suits = board.map(c => c[1]);
  const rankValue = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
  const rankCounts = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
  const suitCounts = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuit = Math.max(...Object.values(suitCounts));
  const pairCount = Object.values(rankCounts).filter(c => c >= 2).length;
  const sorted = [...ranks].map(r => rankValue[r]).sort((a,b) => a-b);

  // Straight possible: any 5-card run within board
  let straightPossible = false;
  for (let i = 0; i <= sorted.length - 3; i++) {
    if (sorted[i+2] - sorted[i] <= 4) { straightPossible = true; break; }
  }

  const isPaired = pairCount >= 1;
  const isFlushComplete = maxSuit >= 5;
  const isFourFlush = maxSuit === 4;
  const isMonotone = maxSuit >= 3 && board.length === 3;
  const allLow = sorted.every(v => v <= 8);
  const allHigh = sorted.every(v => v >= 10);
  const connectedMiddle = !allHigh && sorted[sorted.length-1] - sorted[0] <= 6 && sorted[0] >= 5 && sorted[sorted.length-1] <= 13;

  let label = 'DRY';
  if (isFlushComplete) label = 'FLUSH COMPLETE';
  else if (isFourFlush) label = '4-FLUSH';
  else if (isPaired) label = 'PAIRED';
  else if (straightPossible && connectedMiddle) label = 'CONNECTED MID';
  else if (straightPossible) label = 'STRAIGHT POSSIBLE';
  else if (isMonotone) label = 'MONOTONE';
  else if (allLow) label = 'LOW DRY';
  else if (allHigh) label = 'HIGH DRY';

  return { label, isPaired, isFlushComplete, isFourFlush, straightPossible, allLow, allHigh, connectedMiddle };
}

function genRiverSpot() {
  const deck = freshDeck();
  const hero = deal(deck, 2);
  const board = deal(deck, 5);
  const opp = deal(deck, 2);
  const pos = POSITIONS[cryptoRandom(POSITIONS.length)];
  const pot = (4 + cryptoRandom(20)) * 100;

  let heroHand, oppHand;
  try {
    heroHand = evaluateHand(hero, board);
    oppHand = evaluateHand(opp, board);
  } catch (e) {
    heroHand = { rank: 1, value: 0, name: 'High Card' };
    oppHand = { rank: 1, value: 0, name: 'High Card' };
  }

  const str = heroHand?.value || 0;
  const oppStr = oppHand?.value || 0;
  const wouldWin = str > oppStr;

  const facingBet = cryptoRandomFloat() > 0.5;
  const betSize = facingBet ? Math.max(50, Math.floor(pot * (0.3 + cryptoRandomFloat() * 0.7))) : 0;
  const isIP = pos === 'BTN' || pos === 'CO';
  const texture = classifyBoard(board);
  const betPctPot = facingBet ? betSize / pot : 0;
  const isOverbet = betPctPot > 1.0;
  const isSmallBet = betPctPot > 0 && betPctPot <= 0.4;
  const isBigBet = betPctPot >= 0.66;

  // GTO river frequencies — solver-calibrated + user's sizing-tier rules.
  // Key rules from tutorial:
  //   #30 (connected mid): marginal hands lean check
  //   #32 (paired boards): single pair never raises
  //   Bluff-catcher by villain size: overbet → only TP+ calls; 33% → call wider
  //   Overbet gate: only FH+ / nut straight / nut flush may overbet-value
  let freq;
  const rank = heroHand?.rank || 1;
  if (facingBet) {
    if (rank >= 7) {
      // Full house+ → raise, but on 4-flush/flush-complete just call (villain may have flush)
      if (texture.isFlushComplete || texture.isFourFlush) freq = { raise: 55, call: 42, fold: 3 };
      else freq = { raise: 92, call: 6, fold: 2 };
    } else if (rank >= 5) {
      // Straight / flush → value-raise, but NOT against overbet (they rep nuts)
      if (isOverbet) freq = { raise: 35, call: 58, fold: 7 };
      else freq = { raise: 72, call: 25, fold: 3 };
    } else if (rank >= 3) {
      // Two pair → call wide, fold vs overbet on scary boards
      if (isOverbet && (texture.isFlushComplete || texture.straightPossible)) freq = { call: 40, raise: 5, fold: 55 };
      else freq = { call: 60, raise: 8, fold: 32 };
    } else if (rank >= 2) {
      // One pair (bluff-catcher) — gated by villain bet size
      if (isOverbet) freq = { fold: 80, call: 18, raise: 2 };          // overbet → mostly fold
      else if (isBigBet) freq = { fold: 65, call: 33, raise: 2 };      // 66%+ → fold majority
      else if (isSmallBet) freq = { fold: 35, call: 62, raise: 3 };    // 33% → call wide
      else freq = { fold: 55, call: 42, raise: 3 };
      // Rule #32: on paired boards single pair NEVER raises
      if (texture.isPaired) { freq.raise = 0; freq.call = (freq.call || 0) + 2; freq.fold = 100 - freq.call; }
    } else {
      // High card → fold unless tiny bet on dry board with blockers
      if (isSmallBet && texture.label === 'DRY') freq = { fold: 75, call: 22, raise: 3 };
      else freq = { fold: 90, call: 8, raise: 2 };
    }
  } else {
    if (rank >= 7) {
      // Rule: overbet only with FH+ / nut str / nut flush
      freq = { raise: 92, check: 8 };
    } else if (rank >= 5) {
      // Flush/straight → bet for value, smaller on connected-middle (rule #30)
      if (texture.connectedMiddle) freq = { raise: 55, check: 45 };
      else freq = { raise: 78, check: 22 };
    } else if (rank >= 3) {
      // Two pair → bet 33-50%, but check on connected mid (rule #30)
      if (texture.connectedMiddle) freq = { raise: 35, check: 65 };
      else if (texture.isFlushComplete) freq = { raise: 40, check: 60 };
      else freq = { raise: 62, check: 38 };
    } else if (rank >= 2) {
      // One pair — TP weak kicker check-call; never raise on paired
      if (texture.isPaired) freq = { raise: 15, check: 85 };       // rule #32
      else if (texture.connectedMiddle) freq = { raise: 18, check: 82 }; // rule #30
      else freq = { raise: 28, check: 72 };
    } else {
      // Air → rare bluff, more on scary boards where we rep flush
      if (texture.isFourFlush || texture.isFlushComplete) freq = { raise: 22, check: 78 };
      else freq = { raise: 10, check: 90 };
    }
  }

  return { hero, board, opp, pos, pot, betSize, facingBet, heroHand, oppHand, wouldWin, freq, isIP, rank, texture, betPctPot };
}

export default function RiverDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [spot, setSpot] = useState(() => genRiverSpot());
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);

  const newSpot = useCallback(() => {
    setSpot(genRiverSpot());
    setFeedback(null);
    setAnswered(false);
    answeredRef.current = false;
  }, []);

  const answer = useCallback((action) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    const freq = spot.freq;
    const heroFreq = freq[action] || 0;
    // Correct if your action has >=30% GTO frequency (allows mixed strategy)
    const bestFreq = Math.max(...Object.values(freq));
    const isCorrect = heroFreq >= 30 || heroFreq >= bestFreq - 10;
    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); } else setStreak(0);

    const handName = spot.heroHand?.name || 'High Card';
    // Sizing-tier cheatsheet tip — tailored to board + hand + villain size
    let tip = '';
    if (spot.texture.isPaired && spot.rank === 2) {
      tip = 'Rule #32: single pair on paired boards NEVER raises — check/call only.';
    } else if (spot.texture.connectedMiddle && spot.rank <= 3) {
      tip = 'Rule #30: connected middle boards (Q97/J98/T87) — marginal hands check everything.';
    } else if (spot.facingBet && spot.betPctPot > 1.0 && spot.rank <= 2) {
      tip = 'Overbet gate: only TP+ calls an overbet. Villain reps nuts — fold bluff-catchers.';
    } else if (spot.facingBet && spot.betPctPot <= 0.4 && spot.rank === 2) {
      tip = '33% bet → call wide with bluff-catchers (villain has many bluffs at this price).';
    } else if (!spot.facingBet && spot.rank >= 7) {
      tip = 'Overbet value is reserved for FH+/nut-straight/nut-flush. You qualify.';
    } else if (spot.rank >= 5 && (spot.texture.isFlushComplete || spot.texture.isFourFlush)) {
      tip = 'Flush-complete board: size down with non-nut flush/straight, villain can have nuts.';
    }

    setFeedback({
      isCorrect, frequencies: freq, heroAction: action, tip,
      explanation: `Your hand: ${handName} (rank ${spot.rank}).\n` +
        (spot.facingBet
          ? `Facing ${spot.betSize} into ${spot.pot} (${Math.round(spot.betSize / spot.pot * 100)}% pot).`
          : `Checked to you. Pot: ${spot.pot}.`) +
        `\nBoard: ${spot.texture.label}.` +
        `\n${spot.wouldWin ? 'You would WIN at showdown.' : 'You would LOSE at showdown.'}`,
    });
  }, [spot]);

  const onTimeout = useCallback(() => {
    if (!answeredRef.current) answer(spot?.facingBet ? 'fold' : 'check');
  }, [answer, spot]);

  const actions = spot.facingBet
    ? [{ id: 'call', label: 'CALL', color: '#3498db' }, { id: 'raise', label: 'RAISE', color: '#27ae60' }, { id: 'fold', label: 'FOLD', color: '#e74c3c' }]
    : [{ id: 'raise', label: 'BET', color: '#27ae60' }, { id: 'check', label: 'CHECK', color: '#8899aa' }];

  return (
    <DrillShell title="River Decisions" correct={correct} total={total} streak={streak}
      onBack={onBack} timerActive={!answered} onTimeout={onTimeout}>
      <div style={ds.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
            background: spot.texture.isFlushComplete || spot.texture.isFourFlush ? '#3a1a10'
              : spot.texture.isPaired ? '#3a2a10'
              : spot.texture.connectedMiddle ? '#2a1a3a'
              : spot.texture.straightPossible ? '#3a2a10'
              : '#1a2a3a',
            color: spot.texture.isFlushComplete || spot.texture.isFourFlush ? '#e74c3c'
              : spot.texture.isPaired ? '#f39c12'
              : spot.texture.connectedMiddle ? '#b673ff'
              : spot.texture.straightPossible ? '#f39c12'
              : '#4ac8ff',
          }}>{spot.texture.label}</span>
          <span style={{ fontSize: '10px', color: '#5a6a7a' }}>{spot.isIP ? 'IP' : 'OOP'} · {spot.pos}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#6b7b8d', marginBottom: '6px' }}>
          {spot.facingBet
            ? <>Villain bets <b style={{ color: '#e74c3c' }}>{spot.betSize}</b> ({Math.round(spot.betPctPot * 100)}% pot) into <b style={{ color: '#ffd700' }}>{spot.pot}</b>.</>
            : <>Checked to you. Pot: <b style={{ color: '#ffd700' }}>{spot.pot}</b>.</>}
        </div>
        {/* Board */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '6px 0' }}>
          {spot.board.map((c, i) => <Card key={c} card={c} mini delay={i * 80} />)}
        </div>
        {/* Hero cards */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '8px 0' }}>
          {spot.hero.map((c, i) => <Card key={c} card={c} delay={200 + i * 100} />)}
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {actions.map(a => (
              <button key={a.id} onClick={() => answer(a.id)} style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                background: `linear-gradient(135deg, ${a.color}88, ${a.color})`,
                color: '#fff', fontWeight: 800, fontSize: '14px',
              }}>{a.label}</button>
            ))}
          </div>
        )}

        {feedback && (
          <div style={{
            marginTop: '8px', padding: '10px', borderRadius: '8px',
            background: feedback.isCorrect ? '#0a1a10' : '#1a0a0a',
            border: `1px solid ${feedback.isCorrect ? '#1a4a2a' : '#4a1a1a'}`,
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {feedback.isCorrect ? 'Good decision!' : 'Suboptimal'}
            </div>
            <div style={{ fontSize: '11px', color: '#a0b0c0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{feedback.explanation}</div>
            {feedback.tip && (
              <div style={{
                marginTop: '6px', padding: '6px 8px', borderRadius: '6px',
                background: 'rgba(74,200,255,0.08)', border: '1px solid rgba(74,200,255,0.25)',
                fontSize: '10px', color: '#9ed4ff', lineHeight: 1.4,
              }}>💡 {feedback.tip}</div>
            )}
            {/* Show opponent cards */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '6px 0' }}>
              <span style={{ fontSize: '10px', color: '#5a6a7a', marginRight: '4px' }}>Opp:</span>
              {spot.opp.map((c, i) => <Card key={c} card={c} mini delay={0} />)}
            </div>
            <GTOFrequencies frequencies={feedback.frequencies} heroAction={feedback.heroAction} isCorrect={feedback.isCorrect} />
            <button onClick={newSpot} style={{
              marginTop: '6px', width: '100%', padding: '10px', borderRadius: '8px',
              background: '#1a3a2a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Next Spot</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
