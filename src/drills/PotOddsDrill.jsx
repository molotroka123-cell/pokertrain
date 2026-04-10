// PotOddsDrill.jsx — Pot odds calculation quiz
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import { cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';

function genScenario() {
  const pot = (3 + cryptoRandom(30)) * 100;
  const bet = Math.round(pot * (0.25 + cryptoRandomFloat() * 0.75) / 50) * 50;
  const totalPot = pot + bet;
  const odds = bet / (totalPot + bet);
  const pctNeeded = Math.round(odds * 100);

  // Random outs for equity question
  const outs = 2 + cryptoRandom(14);
  const equity = Math.round(outs * 2.2); // rule of 2
  const shouldCall = equity >= pctNeeded;

  return { pot, bet, totalPot, odds, pctNeeded, outs, equity, shouldCall };
}

export default function PotOddsDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [sc, setSc] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newQ = useCallback(() => {
    setSc(genScenario());
    setFeedback(null);
    setAnswered(false);
  }, []);

  if (!sc) newQ();
  if (!sc) return null;

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const correctAction = sc.shouldCall ? 'call' : 'fold';
    const isCorrect = action === correctAction;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect,
      message: `Pot: ${sc.pot} + Bet: ${sc.bet} = ${sc.totalPot + sc.bet} total. You need ${sc.bet}/${sc.totalPot + sc.bet} = ${sc.pctNeeded}% equity to call. With ${sc.outs} outs you have ~${sc.equity}% equity. ${sc.shouldCall ? 'Profitable call!' : 'Not enough equity — fold.'}`,
    });
  };

  return (
    <DrillShell title="Pot Odds Quiz" correct={correct} total={total} onBack={onBack}>
      <div style={ds.card}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#8899aa', marginBottom: '12px' }}>
            Villain bets <span style={{ color: '#e74c3c', fontWeight: 700 }}>{sc.bet}</span> into a pot of <span style={{ color: '#ffd700', fontWeight: 700 }}>{sc.pot}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '12px 0' }}>
            <div style={{ background: '#0d1118', padding: '12px 20px', borderRadius: '10px', border: '1px solid #1e2a3a' }}>
              <div style={{ fontSize: '10px', color: '#6b7b8d' }}>POT</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffd700' }}>{sc.pot}</div>
            </div>
            <div style={{ background: '#0d1118', padding: '12px 20px', borderRadius: '10px', border: '1px solid #1e2a3a' }}>
              <div style={{ fontSize: '10px', color: '#6b7b8d' }}>BET</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#e74c3c' }}>{sc.bet}</div>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#c0d0e0', marginTop: '12px' }}>
            You have <span style={{ color: '#27ae60', fontWeight: 700 }}>{sc.outs} outs</span>. Call or fold?
          </div>
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => answer('call')} style={{ flex: 1, padding: '14px', background: '#27ae60', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>CALL</button>
            <button onClick={() => answer('fold')} style={{ flex: 1, padding: '14px', background: '#c0392b', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>FOLD</button>
          </div>
        )}

        {feedback && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>{feedback.isCorrect ? 'Correct!' : 'Wrong'}</div>
            <div style={{ fontSize: '13px', color: '#c0d0e0', lineHeight: 1.5 }}>{feedback.message}</div>
            <button onClick={newQ} style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next Question</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
