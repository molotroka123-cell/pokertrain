// SizingDrill.jsx — Bet sizing practice
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';

const SCENARIOS = [
  { hero: ['Ah','Kh'], board: ['Kd','8s','3c'], pot: 600, type: 'value', correct: '67', reason: 'TPTK on dry board — bet 67% pot. Big enough to build pot, small enough to get called by worse pairs.' },
  { hero: ['Qh','Jh'], board: ['Th','9h','2c'], pot: 800, type: 'draw', correct: '50', reason: 'Monster draw (OESD + flush draw). Bet 50% as semi-bluff — you have 15 outs. Want some folds but also fine getting called.' },
  { hero: ['As','7s'], board: ['Kc','Qd','4h'], pot: 500, type: 'bluff', correct: '33', reason: 'Pure bluff with A-high. Small sizing (33%) — you need fewer folds to profit. Don\'t overcommit with no equity.' },
  { hero: ['Jd','Jc'], board: ['9s','7h','3c','2d'], pot: 1200, type: 'value', correct: '75', reason: 'Overpair on turn. Bet 75% — board is getting more connected. Charge draws, get value from 99, 77, 9x.' },
  { hero: ['6h','6d'], board: ['6s','Kc','9h'], pot: 700, type: 'value', correct: '33', reason: 'Set on K96 — slow-play with small bet. Let villain catch up or bluff. You want to keep their range wide.' },
  { hero: ['Ah','2d'], board: ['Ks','Qs','8d','4c','7h'], pot: 2000, type: 'bluff', correct: '75', reason: 'River bluff with A-high. Go big (75%) — you need to represent a strong hand. Small bets don\'t fold Kx/Qx.' },
  { hero: ['Ts','Td'], board: ['8c','5d','2h','Jh','3c'], pot: 1800, type: 'value', correct: '50', reason: 'TT on river — thin value bet 50%. You beat 88, 55, missed draws. Don\'t go too big — you fold out hands you beat.' },
  { hero: ['Ac','Kc'], board: ['Ac','9d','4c','7c'], pot: 1500, type: 'value', correct: '67', reason: 'Top pair + nut flush draw on turn. Bet 67% — you have a monster draw and top pair for value. Build the pot.' },
];

const SIZES = ['33', '50', '67', '75', '100'];

export default function SizingDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [idx, setIdx] = useState(-1);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newScenario = useCallback(() => {
    setIdx(cryptoRandom(SCENARIOS.length));
    setFeedback(null);
    setAnswered(false);
  }, []);

  if (idx === -1) newScenario();
  const sc = SCENARIOS[idx] || SCENARIOS[0];

  const answer = (size) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = size === sc.correct;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect,
      message: isCorrect ? `Correct! ${size}% pot is optimal here.` : `${sc.correct}% pot is better. ${sc.reason}`,
      type: sc.type,
    });
  };

  return (
    <DrillShell title="Sizing Drill" correct={correct} total={total} onBack={onBack}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '6px' }}>
          Pot: <span style={{ color: '#ffd700', fontWeight: 700 }}>{sc.pot}</span>
          {' | Type: '}<span style={{ color: sc.type === 'value' ? '#27ae60' : sc.type === 'bluff' ? '#e74c3c' : '#f39c12', fontWeight: 600 }}>{sc.type}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          {sc.hero.map((c, i) => <Card key={i} card={c} delay={i * 150} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          {sc.board.map((c, i) => <Card key={i} card={c} mini delay={i * 100} />)}
        </div>
        <div style={{ fontSize: '12px', color: '#8899aa', textAlign: 'center', margin: '10px 0' }}>Choose your bet sizing:</div>
        {!answered && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {SIZES.map(s => (
              <button key={s} onClick={() => answer(s)} style={{
                padding: '10px 16px', background: '#1a2840', border: '1px solid #2a3a4a',
                borderRadius: '8px', color: '#e0e0e0', fontWeight: 700, fontSize: '14px', cursor: 'pointer', minWidth: '70px',
              }}>{s}%</button>
            ))}
          </div>
        )}
        {feedback && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>{feedback.isCorrect ? 'Correct!' : 'Wrong'}</div>
            <div style={{ fontSize: '13px', color: '#c0d0e0', lineHeight: 1.5 }}>{feedback.message}</div>
            <button onClick={newScenario} style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next Scenario</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
