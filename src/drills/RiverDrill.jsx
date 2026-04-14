// RiverDrill.jsx — River decisions: value bet, bluff, check, call, fold
import React, { useState, useCallback, useRef } from 'react';
import DrillShell, { drillStyles as ds, GTOFrequencies } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';
import { evaluateHand } from '../engine/evaluator.js';

const POSITIONS = ['BTN', 'CO', 'BB', 'SB'];

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

  let freq;
  const rank = heroHand?.rank || 1;
  if (facingBet) {
    if (rank >= 5) freq = { call: 20, raise: 75, fold: 5 };
    else if (rank >= 3) freq = { call: 70, raise: 20, fold: 10 };
    else if (rank >= 2) freq = { call: 55, raise: 5, fold: 40 };
    else freq = { call: 15, raise: 5, fold: 80 };
  } else {
    if (rank >= 5) freq = { raise: 85, check: 15 };
    else if (rank >= 3) freq = { raise: 60, check: 40 };
    else if (rank >= 2) freq = { raise: 30, check: 70 };
    else freq = { raise: 20, check: 80 };
  }

  return { hero, board, opp, pos, pot, betSize, facingBet, heroHand, oppHand, wouldWin, freq, isIP, rank };
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
    const isCorrect = heroFreq >= 25;
    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); } else setStreak(0);

    const handName = spot.heroHand?.name || 'High Card';
    setFeedback({
      isCorrect, frequencies: freq, heroAction: action,
      explanation: `Your hand: ${handName} (rank ${spot.rank}).\n` +
        (spot.facingBet
          ? `Facing ${spot.betSize} into ${spot.pot} (${Math.round(spot.betSize / spot.pot * 100)}% pot).`
          : `Checked to you. Pot: ${spot.pot}.`) +
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
        <div style={{ fontSize: '11px', color: '#6b7b8d', marginBottom: '6px' }}>
          {spot.facingBet
            ? <>Villain bets <b style={{ color: '#e74c3c' }}>{spot.betSize}</b> into <b style={{ color: '#ffd700' }}>{spot.pot}</b>. {spot.isIP ? 'You are IP.' : 'You are OOP.'}</>
            : <>Checked to you. Pot: <b style={{ color: '#ffd700' }}>{spot.pot}</b>. {spot.isIP ? 'In position.' : 'Out of position.'}</>}
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
