// MultiwayDrill.jsx — Multiway postflop decisions (3+ players to flop)
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { cryptoRandomFloat } from '../engine/deck.js';

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS = ['h','d','c','s'];
const pick = (arr) => arr[Math.floor(cryptoRandomFloat() * arr.length)];

function genCards(n) {
  const used = new Set();
  const cards = [];
  while (cards.length < n) {
    const c = pick(RANKS) + pick(SUITS);
    if (!used.has(c)) { used.add(c); cards.push(c); }
  }
  return cards;
}

const SCENARIOS = [
  { hero: ['Ah','Jd'], board: ['Ts','8h','4d'], pos: 'BTN', villains: ['CO','BB'], pot: 2400, toCall: 0, correct: 'check', reason: 'A-high in 3-way — check to control pot. Cbetting into 2 opponents with no pair is -EV.', freq: 'Check 84%, Bet 33% 16%' },
  { hero: ['Kh','Kd'], board: ['Js','Th','6d'], pos: 'BTN', villains: ['CO','BB'], pot: 2400, toCall: 0, correct: 'bet', reason: 'Overpair on JT6 — bet for value + protection vs draws. Many Jx and draws call.', freq: 'Bet 66% 72%, Check 28%' },
  { hero: ['Qc','9c'], board: ['Qh','7s','3d'], pos: 'CO', villains: ['BTN','BB'], pot: 1800, toCall: 0, correct: 'bet', reason: 'Top pair decent kicker on dry board 3-way — bet small (33%) for thin value.', freq: 'Bet 33% 65%, Check 35%' },
  { hero: ['7h','7d'], board: ['Ks','Jh','8c'], pos: 'BTN', villains: ['HJ','BB'], pot: 2400, toCall: 800, correct: 'fold', reason: 'Underpair facing bet on KJ8 board 3-way — too many hands beat you. No draw equity.', freq: 'Fold 75%, Call 25%' },
  { hero: ['As','5s'], board: ['Kh','9s','4s'], pos: 'CO', villains: ['BTN','SB'], pot: 1800, toCall: 0, correct: 'bet', reason: 'Nut flush draw + overcard in 3-way — semi-bluff bet. Good equity if called.', freq: 'Bet 33% 60%, Check 40%' },
  { hero: ['Td','9d'], board: ['Jc','8h','3s'], pos: 'BTN', villains: ['CO','BB'], pot: 2400, toCall: 0, correct: 'check', reason: 'OESD in 3-way — check to see free card. Betting exposes you to check-raises.', freq: 'Check 70%, Bet 33% 30%' },
  { hero: ['Ac','Kc'], board: ['Qh','7d','2s'], pos: 'CO', villains: ['BTN','BB'], pot: 2400, toCall: 0, correct: 'bet', reason: 'AK overcards on Q72 — cbet range advantage. CO opener has more Qx, KK+, AQ.', freq: 'Bet 33% 58%, Check 42%' },
  { hero: ['6h','6d'], board: ['Ah','Ts','4c'], pos: 'BTN', villains: ['HJ','BB'], pot: 2000, toCall: 600, correct: 'fold', reason: 'Small pair facing bet on AT4 board 3-way — A is in both villain ranges. Fold.', freq: 'Fold 82%, Call 18%' },
  { hero: ['Qs','Js'], board: ['Qd','8h','5c'], pos: 'BTN', villains: ['CO','SB'], pot: 2400, toCall: 0, correct: 'bet', reason: 'Top pair good kicker on Q85 rainbow 3-way — clear value bet. Size 50-66%.', freq: 'Bet 50% 70%, Check 30%' },
  { hero: ['Kd','Tc'], board: ['Kh','9s','7d'], pos: 'CO', villains: ['BTN','BB'], pot: 1800, toCall: 0, correct: 'bet', reason: 'Top pair + gutshot on K97 — bet for value and protection. Draws need to pay.', freq: 'Bet 66% 68%, Check 32%' },
  { hero: ['9c','8c'], board: ['7h','6d','2s'], pos: 'BTN', villains: ['CO','BB'], pot: 2400, toCall: 0, correct: 'check', reason: 'OESD on 762 rainbow 3-way — check back. Board hits BB range hard. Free card > risk.', freq: 'Check 65%, Bet 33% 35%' },
  { hero: ['Ah','3h'], board: ['Kd','Jh','5h'], pos: 'BTN', villains: ['HJ','SB'], pot: 2400, toCall: 0, correct: 'bet', reason: 'Nut flush draw on KJ5 two-tone 3-way — semi-bluff. Excellent equity if called.', freq: 'Bet 50% 55%, Check 45%' },
];

export default function MultiwayDrill({ onBack }) {
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
    <DrillShell title="Multiway Postflop" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
          <span style={{ color: '#4ac8ff', fontWeight: 700 }}>{spot.pos}</span> vs{' '}
          {spot.villains.map((v, i) => <span key={i} style={{ color: '#e74c3c' }}>{i > 0 ? ' + ' : ''}{v}</span>)}
          {' | '}FLOP | Pot: {spot.pot}{spot.toCall > 0 ? ` | Facing bet: ${spot.toCall}` : ' | Checked to you'}
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
          {spot.hero.map((c, i) => <Card key={i} card={c} hero delay={i * 200} />)}
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '12px' }}>
          {spot.board.map((c, i) => <Card key={i} card={c} mini delay={i * 150} />)}
        </div>
        <div style={{ fontSize: '11px', color: '#5a6a7a', textAlign: 'center', marginBottom: '6px' }}>
          3-WAY POT · {spot.villains.length + 1} players
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
