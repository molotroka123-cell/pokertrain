// ThreeBetPotDrill.jsx — Postflop play in 3-bet pots (IP and OOP)
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { cryptoRandomFloat } from '../engine/deck.js';

const SCENARIOS = [
  { hero: ['Ah','Kd'], board: ['Qh','7s','3d'], pos: 'BTN (IP)', villain: 'BB', pot: 5400, toCall: 0, correct: 'bet', reason: '3-bet pot AK on Q73 — range advantage as 3-bettor. Cbet 33% often. AK has overcards + BDFD.', freq: 'Bet 33% 72%, Check 28%' },
  { hero: ['Jh','Jd'], board: ['Kc','9s','4d'], pos: 'BTN (IP)', villain: 'SB', pot: 5400, toCall: 0, correct: 'check', reason: '3-bet pot JJ on K94 — K hits caller range (KQ, KJ, AK). JJ is bluff-catcher. Check back.', freq: 'Check 68%, Bet 33% 32%' },
  { hero: ['Qs','Qd'], board: ['Ah','8c','3s'], pos: 'SB (OOP)', villain: 'BTN', pot: 5400, toCall: 0, correct: 'check', reason: '3-bet pot QQ on A83 OOP — A smashes BTN flat range. QQ is showdown value. Check-call.', freq: 'Check 85%, Bet 50% 15%' },
  { hero: ['Ac','Kc'], board: ['Jh','Td','5c'], pos: 'BTN (IP)', villain: 'BB', pot: 5400, toCall: 0, correct: 'bet', reason: 'AK in 3-bet pot on JT5 — gutshot + 2 overcards. Great semi-bluff + range advantage.', freq: 'Bet 50% 65%, Check 35%' },
  { hero: ['Ah','Ad'], board: ['Kh','7d','2s'], pos: 'SB (OOP)', villain: 'BTN', pot: 5400, toCall: 0, correct: 'bet', reason: 'AA on K72 in 3-bet pot OOP — you dominate. Small cbet (33%) but mix in checks to trap.', freq: 'Bet 33% 60%, Check 40%' },
  { hero: ['Ts','Td'], board: ['Ah','Kd','6c'], pos: 'BTN (IP)', villain: 'BB', pot: 5400, toCall: 0, correct: 'check', reason: 'TT on AK6 — both overcards hit ranges. TT has no value to bet. Check back for showdown.', freq: 'Check 82%, Bet 33% 18%' },
  { hero: ['Kh','Qh'], board: ['9h','6h','2d'], pos: 'SB (OOP)', villain: 'BTN', pot: 5400, toCall: 0, correct: 'bet', reason: 'KQhh on 9h6h2d — nut flush draw + 2 overs. Great semi-bluff. Lead for 50% pot.', freq: 'Bet 50% 63%, Check 37%' },
  { hero: ['8h','8d'], board: ['Jh','Jd','6c'], pos: 'BTN (IP)', villain: 'SB', pot: 5400, toCall: 1800, correct: 'call', reason: '88 on JJ6 facing lead in 3-bet pot — SB could have many bluffs (AK, AQ). 88 = bluff-catcher. Call.', freq: 'Call 62%, Fold 38%' },
  { hero: ['As','Qs'], board: ['Ks','4d','2h'], pos: 'SB (OOP)', villain: 'BTN', pot: 5400, toCall: 0, correct: 'check', reason: 'AQs on K42 OOP — K hits BTN range hard. AQ is too weak to cbet here. Check-call or check-fold.', freq: 'Check 75%, Bet 33% 25%' },
  { hero: ['Kd','Kh'], board: ['Ac','Jh','3d'], pos: 'BTN (IP)', villain: 'BB', pot: 5400, toCall: 2000, correct: 'call', reason: 'KK facing donk bet on AJ3 — villain leading into 3-bettor is suspicious. KK still beats Jx, bluffs. Call.', freq: 'Call 70%, Raise 15%, Fold 15%' },
];

export default function ThreeBetPotDrill({ onBack }) {
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
    setFeedback({ isCorrect, correctAction: spot.correct, reason: spot.reason, freq: spot.freq });
  };

  return (
    <DrillShell title="3-Bet Pot Lines" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
          <span style={{ color: '#f39c12', fontWeight: 700 }}>3-BET POT</span>{' | '}
          <span style={{ color: '#4ac8ff', fontWeight: 700 }}>{spot.pos}</span> vs{' '}
          <span style={{ color: '#e74c3c' }}>{spot.villain}</span>
          {' | '}Pot: {spot.pot}{spot.toCall > 0 ? ` | Facing: ${spot.toCall}` : ' | Your action'}
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
          {spot.hero.map((c, i) => <Card key={i} card={c} hero delay={i * 200} />)}
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
          {spot.board.map((c, i) => <Card key={i} card={c} mini delay={i * 150} />)}
        </div>
      </div>

      {feedback ? (
        <div style={{ ...ds.card, background: feedback.isCorrect ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)', border: `1px solid ${feedback.isCorrect ? '#27ae6033' : '#e74c3c33'}` }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '6px' }}>
            {feedback.isCorrect ? '✓ Correct!' : `✗ GTO: ${feedback.correctAction.toUpperCase()}`}
          </div>
          <div style={{ fontSize: '12px', color: '#8899aa', lineHeight: 1.5 }}>{feedback.reason}</div>
          <div style={{ fontSize: '10px', color: '#5a6a7a', marginTop: '6px' }}>Freq: {feedback.freq}</div>
          <button onClick={next} style={{ marginTop: '10px', padding: '12px 24px', background: '#1a3a2a', border: 'none', borderRadius: '10px', color: '#27ae60', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '14px' }}>Next Hand →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          {spot.toCall > 0 ? (
            <>
              <button onClick={() => answer('fold')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a1a1a', color: '#aaa', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>FOLD</button>
              <button onClick={() => answer('call')} style={{ flex: 1.4, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a3a2a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>CALL</button>
              <button onClick={() => answer('raise')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3a3010', color: '#d4af37', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>RAISE</button>
            </>
          ) : (
            <>
              <button onClick={() => answer('check')} style={{ flex: 1.2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a2a3a', color: '#4ac8ff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>CHECK</button>
              <button onClick={() => answer('bet')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3a3010', color: '#d4af37', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>BET</button>
            </>
          )}
        </div>
      )}
    </DrillShell>
  );
}
