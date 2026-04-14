// PotOddsDrill.jsx — Pot odds quiz with equity display, GTO frequencies, streaks
import React, { useState, useCallback, useRef } from 'react';
import DrillShell, { drillStyles as ds, GTOFrequencies } from './DrillShell.jsx';
import { cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';

function genScenario() {
  const pot = (3 + cryptoRandom(30)) * 100;
  const bet = Math.max(50, Math.round(pot * (0.25 + cryptoRandomFloat() * 0.75) / 50) * 50);
  const totalPot = pot + bet;
  const odds = bet / (totalPot + bet);
  const pctNeeded = Math.round(odds * 100);
  const outs = 2 + cryptoRandom(14);
  const equity = Math.round(outs * 2.2);
  const shouldCall = equity >= pctNeeded;
  const margin = equity - pctNeeded;
  const callFreq = margin > 15 ? 95 : margin > 5 ? 75 : margin > 0 ? 55 : margin > -5 ? 25 : 5;
  const raiseFreq = margin > 20 && outs >= 9 ? 15 : margin > 10 ? 8 : 0;
  const foldFreq = Math.max(0, 100 - callFreq - raiseFreq);
  return { pot, bet, totalPot, odds, pctNeeded, outs, equity, shouldCall, callFreq, raiseFreq, foldFreq, margin };
}

export default function PotOddsDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sc, setSc] = useState(() => genScenario());
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);

  const newQ = useCallback(() => {
    setSc(genScenario());
    setFeedback(null);
    setAnswered(false);
    answeredRef.current = false;
  }, []);

  const answer = useCallback((action) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    const frequencies = { call: sc.callFreq, fold: sc.foldFreq };
    if (sc.raiseFreq > 0) frequencies.raise = sc.raiseFreq;
    const isCorrect = (frequencies[action] || 0) >= 30;
    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); }
    else setStreak(0);

    setFeedback({
      isCorrect, heroAction: action, frequencies,
      explanation: `Pot: ${sc.pot} + Bet: ${sc.bet} = ${sc.totalPot + sc.bet} total.\n` +
        `Need: ${sc.bet}/${sc.totalPot + sc.bet} = ${sc.pctNeeded}% equity to call.\n` +
        `Your ${sc.outs} outs ≈ ${sc.equity}% equity (rule of 2).\n` +
        `Margin: ${sc.margin > 0 ? '+' : ''}${sc.margin}pp. ` +
        (sc.shouldCall ? 'Profitable call — you have enough equity.' : 'Not enough equity — save chips and fold.'),
    });
  }, [sc]);

  const onTimeout = useCallback(() => {
    if (!answeredRef.current) answer('fold');
  }, [answer]);

  return (
    <DrillShell title="Pot Odds Quiz" correct={correct} total={total} streak={streak}
      onBack={onBack} timerActive={!answered} onTimeout={onTimeout}>
      <div style={ds.card}>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7b8d', marginBottom: '8px' }}>
            Villain bets <span style={{ color: '#e74c3c', fontWeight: 700 }}>{sc.bet}</span> into <span style={{ color: '#ffd700', fontWeight: 700 }}>{sc.pot}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '8px 0' }}>
            <div style={{ background: '#0a0e14', padding: '10px 18px', borderRadius: '10px', border: '1px solid #1a2230' }}>
              <div style={{ fontSize: '9px', color: '#4a5a6a' }}>POT</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffd700' }}>{sc.pot}</div>
            </div>
            <div style={{ background: '#0a0e14', padding: '10px 18px', borderRadius: '10px', border: '1px solid #1a2230' }}>
              <div style={{ fontSize: '9px', color: '#4a5a6a' }}>BET</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#e74c3c' }}>{sc.bet}</div>
            </div>
            <div style={{ background: '#0a0e14', padding: '10px 18px', borderRadius: '10px', border: '1px solid #1a2230' }}>
              <div style={{ fontSize: '9px', color: '#4a5a6a' }}>OUTS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#27ae60' }}>{sc.outs}</div>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#a0b0c0' }}>
            {sc.outs} outs ≈ <span style={{ color: '#27ae60', fontWeight: 700 }}>{sc.equity}%</span> equity. Need <span style={{ color: '#e67e22', fontWeight: 700 }}>{sc.pctNeeded}%</span>. Call or fold?
          </div>
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => answer('call')} style={{
              flex: 1, padding: '14px', background: 'linear-gradient(135deg, #1a5a30, #27ae60)',
              border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer',
            }}>CALL</button>
            <button onClick={() => answer('fold')} style={{
              flex: 1, padding: '14px', background: 'linear-gradient(135deg, #5a1a1a, #c0392b)',
              border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer',
            }}>FOLD</button>
          </div>
        )}

        {feedback && (
          <div style={{
            marginTop: '10px', padding: '12px', borderRadius: '8px',
            background: feedback.isCorrect ? '#0a1a10' : '#1a0a0a',
            border: `1px solid ${feedback.isCorrect ? '#1a4a2a' : '#4a1a1a'}`,
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '6px' }}>
              {feedback.isCorrect ? 'Correct!' : 'Wrong'}
            </div>
            <div style={{ fontSize: '12px', color: '#a0b0c0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{feedback.explanation}</div>
            <GTOFrequencies frequencies={feedback.frequencies} heroAction={feedback.heroAction} isCorrect={feedback.isCorrect} />
            <button onClick={newQ} style={{
              marginTop: '8px', width: '100%', padding: '12px', borderRadius: '8px',
              background: '#1a3a2a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Next Question</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
