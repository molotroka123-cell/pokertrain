// ThreeBetPotDrill.jsx — Postflop play in 3-bet pots (IP and OOP)
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { cryptoRandomFloat } from '../engine/deck.js';

// 50BB cash context (100bb→50bb postflop after 3-bet). SB vs BTN scenarios are user's main leak (−1.81 bb/hand).
const SCENARIOS = [
  // --- BTN vs BB (IP, as 3-bettor) ---
  { hero: ['Ah','Kd'], board: ['Qh','7s','3d'], pos: 'BTN (IP)', villain: 'BB', pot: 22, toCall: 0, correct: 'bet', reason: '3BP AK on Q73 rainbow — range advantage as 3-bettor. Cbet 33% works against BB peel range.', freq: 'Bet 33% 72%, Check 28%', stack: 39 },
  { hero: ['Jh','Jd'], board: ['Kc','9s','4d'], pos: 'BTN (IP)', villain: 'BB', pot: 22, toCall: 0, correct: 'check', reason: '3BP JJ on K94 — K hits BB defend range (KQ, KJs, AK-suited). JJ = bluff-catcher, check back.', freq: 'Check 68%, Bet 33% 32%', stack: 39 },
  { hero: ['Ac','Kc'], board: ['Jh','Td','5c'], pos: 'BTN (IP)', villain: 'BB', pot: 22, toCall: 0, correct: 'bet', reason: 'AK on JT5 — gutshot + 2 overs + BDFD. Mandatory semi-bluff in 3BP.', freq: 'Bet 50% 65%, Check 35%', stack: 39 },
  { hero: ['Ts','Td'], board: ['Ah','Kd','6c'], pos: 'BTN (IP)', villain: 'BB', pot: 22, toCall: 0, correct: 'check', reason: 'TT on AK6 — both overcards hit ranges. No value to bet. Check back for SD.', freq: 'Check 82%, Bet 33% 18%', stack: 39 },
  { hero: ['Kd','Kh'], board: ['Ac','Jh','3d'], pos: 'BTN (IP)', villain: 'BB', pot: 22, toCall: 8, correct: 'call', reason: 'KK facing donk on AJ3 — BB leading into 3-bettor is polarised. KK still beats Jx + bluffs.', freq: 'Call 70%, Raise 15%, Fold 15%', stack: 35 },

  // --- BTN vs SB (IP, SB 4-bet cold → BTN call; OR BTN 3-bet SB open → SB flat OOP) ---
  { hero: ['8h','8d'], board: ['Jh','Jd','6c'], pos: 'BTN (IP)', villain: 'SB', pot: 22, toCall: 7, correct: 'call', reason: '88 on JJ6 facing lead — SB 3BP range has AK/AQ bluffs + Jx. 88 = bluff-catcher, call small.', freq: 'Call 62%, Fold 38%', stack: 36 },

  // --- SB vs BTN (OOP, SB 3-bets BTN open). USER'S MAIN LEAK: −1.81 bb/hand structural weakness. ---
  { hero: ['Qs','Qd'], board: ['Ah','8c','3s'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'check', reason: 'SB vs BTN 3BP: QQ on A83 OOP. A smashes BTN peel range (AQ, AJs, ATs). QQ = bluff-catcher. Check-call small, check-fold big.', freq: 'Check 85%, Bet 50% 15%', stack: 39 },
  { hero: ['Ah','Ad'], board: ['Kh','7d','2s'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'bet', reason: 'SB vs BTN 3BP: AA on K72 OOP. Small cbet 33% on dry K — protect + mix checks to trap.', freq: 'Bet 33% 60%, Check 40%', stack: 39 },
  { hero: ['Kh','Qh'], board: ['9h','6h','2d'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'bet', reason: 'SB vs BTN 3BP: KQhh on 9h6h2d — nut flush draw + 2 overs. Lead 50% OOP, great equity + fold equity.', freq: 'Bet 50% 63%, Check 37%', stack: 39 },
  { hero: ['As','Qs'], board: ['Ks','4d','2h'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'check', reason: 'SB vs BTN 3BP: AQs on K42 OOP. K hits BTN flat range (KQs, KJs, AK). AQ too weak to cbet OOP — check-call.', freq: 'Check 75%, Bet 33% 25%', stack: 39 },
  { hero: ['Ad','Kd'], board: ['Js','8h','4c'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'bet', reason: 'SB vs BTN 3BP: AK on J84 rainbow OOP. Range advantage + 2 overs + backdoor equity. Small cbet 33%.', freq: 'Bet 33% 68%, Check 32%', stack: 39 },
  { hero: ['Qc','Qd'], board: ['7h','5h','2c'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'bet', reason: 'SB vs BTN 3BP: QQ on 752 two-tone OOP. Protect against hearts + overcards. Bet 50-66%.', freq: 'Bet 50% 78%, Check 22%', stack: 39 },
  { hero: ['9h','9d'], board: ['Kc','Jh','6s'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'check', reason: 'SB vs BTN 3BP: 99 on KJ6 OOP. Both overs connect with BTN range. 99 = bluff-catcher, check.', freq: 'Check 88%, Bet 33% 12%', stack: 39 },
  { hero: ['Ah','5h'], board: ['6h','4d','2c'], pos: 'SB (OOP)', villain: 'BTN', pot: 22, toCall: 0, correct: 'bet', reason: 'SB vs BTN 3BP: A5hh on 642 — wheel draw + BDFD + overcard. Premium bluffing combo, bet 33%.', freq: 'Bet 33% 72%, Check 28%', stack: 39 },

  // --- BB vs CO (SRP, not 3BP — but included for defence range spot) — REMOVED: belongs in different drill ---
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
          {' | '}Pot: {spot.pot}bb{spot.stack ? ` | Stack: ${spot.stack}bb` : ''}{spot.toCall > 0 ? ` | Facing: ${spot.toCall}bb` : ' | Your action'}
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
