// AHighCbetDrill.jsx — A-high flop cbet automation drill
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { cryptoRandomFloat } from '../engine/deck.js';

const SCENARIOS = [
  { hero: ['Kh','Qd'], board: ['Ah','7s','3d'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'A73 rainbow — pure range bet 33%. A-high boards favor PFR massively. Cbet with entire range.', size: '33%' },
  { hero: ['Jh','Td'], board: ['As','Kd','5c'], pos: 'CO', villain: 'BB', pot: 600, correct: 'bet', reason: 'AK5 — double broadway flop. CO range has tons of AK, AQ, KQ. Cbet small.', size: '33%' },
  { hero: ['9h','9d'], board: ['Ah','6s','2d'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'A62 rainbow — 99 should cbet for protection + value vs 6x, 2x. Range bet 33%.', size: '33%' },
  { hero: ['Kd','Jd'], board: ['Ac','8h','4s'], pos: 'CO', villain: 'BB', pot: 600, correct: 'bet', reason: 'A84 rainbow — KJ has backdoor straight. Cbet small as part of range strategy.', size: '33%' },
  { hero: ['Qh','Jh'], board: ['As','Jd','7c'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'AJ7 — hero has middle pair + Q kicker. Clear value bet against BB range.', size: '50%' },
  { hero: ['7h','6h'], board: ['Ah','Ks','3h'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'AK3 two-hearts — 76hh has flush draw. Semi-bluff on A-high board. Cbet 33%.', size: '33%' },
  { hero: ['Td','9c'], board: ['Ah','5s','4d'], pos: 'CO', villain: 'BB', pot: 600, correct: 'bet', reason: 'A54 — T9 has gutshot (2-3). Range bet the A-high flop. BB folds many hands.', size: '33%' },
  { hero: ['Qc','Qd'], board: ['Ah','Td','6s'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'check', reason: 'AT6 — QQ has showdown value but Ax is in BB range. Check back to pot control.', size: 'Check' },
  { hero: ['Kh','Kd'], board: ['Ah','Qd','Js'], pos: 'CO', villain: 'BB', pot: 600, correct: 'check', reason: 'AQJ — very coordinated, BB has many 2-pair+ combos. KK should check for pot control.', size: 'Check' },
  { hero: ['5h','5d'], board: ['Ah','8s','3d'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'A83 rainbow — 55 is part of range cbet. Small sizing folds out 6x, 4x, 2x. Range strategy.', size: '33%' },
  { hero: ['Ah','8h'], board: ['Ad','7c','2s'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'A72 — hero has TP + 8 kicker. Clear value bet. Size 50% to build pot vs Ax.', size: '50%' },
  { hero: ['Kc','5c'], board: ['As','9h','4d'], pos: 'BTN', villain: 'BB', pot: 600, correct: 'bet', reason: 'A94 — K5 suited as bluff on A-high flop. Range bet 33%, BB folds most non-A hands.', size: '33%' },
];

export default function AHighCbetDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [idx, setIdx] = useState(() => Math.floor(cryptoRandomFloat() * SCENARIOS.length));
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const spot = SCENARIOS[idx % SCENARIOS.length];
  const next = useCallback(() => {
    setIdx(i => (i + 1 + Math.floor(cryptoRandomFloat() * 3)) % SCENARIOS.length);
    setFeedback(null);
    setAnswered(false);
  }, []);

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = action === spot.correct;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);
    setFeedback({ isCorrect, correctAction: spot.correct, reason: spot.reason, size: spot.size });
  };

  return (
    <DrillShell title="A-high Cbet" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
          <span style={{ color: '#22c55e', fontWeight: 700 }}>A-HIGH FLOP</span>{' | '}
          <span style={{ color: '#4ac8ff', fontWeight: 700 }}>{spot.pos}</span> vs{' '}
          <span style={{ color: '#e74c3c' }}>{spot.villain}</span>
          {' | '}Pot: {spot.pot} | HU Flop
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
          {spot.hero.map((c, i) => <Card key={i} card={c} hero delay={i * 200} />)}
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
          {spot.board.map((c, i) => <Card key={i} card={c} mini delay={i * 150} />)}
        </div>
        <div style={{ fontSize: '10px', color: '#5a6a7a', textAlign: 'center' }}>You are the preflop raiser. Act first on the flop.</div>
      </div>

      {feedback ? (
        <div style={{ ...ds.card, background: feedback.isCorrect ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)', border: `1px solid ${feedback.isCorrect ? '#27ae6033' : '#e74c3c33'}` }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '6px' }}>
            {feedback.isCorrect ? '✓ Correct!' : `✗ GTO: ${feedback.correctAction.toUpperCase()}`}
          </div>
          <div style={{ fontSize: '12px', color: '#8899aa', lineHeight: 1.5 }}>{feedback.reason}</div>
          <div style={{ fontSize: '10px', color: '#5a6a7a', marginTop: '6px' }}>Optimal size: {feedback.size}</div>
          <button onClick={next} style={{ marginTop: '10px', padding: '12px 24px', background: '#1a3a2a', border: 'none', borderRadius: '10px', color: '#27ae60', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '14px' }}>Next Hand →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => answer('check')} style={{ flex: 1.2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a2a3a', color: '#4ac8ff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>CHECK</button>
          <button onClick={() => answer('bet')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3a3010', color: '#d4af37', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>C-BET</button>
        </div>
      )}
    </DrillShell>
  );
}
