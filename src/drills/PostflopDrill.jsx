// PostflopDrill.jsx — 50+ postflop scenarios
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { getRandomSpot } from '../data/postflopSpots.js';

export default function PostflopDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [spot, setSpot] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newSpot = useCallback(() => {
    setSpot(getRandomSpot());
    setFeedback(null);
    setAnswered(false);
  }, []);

  if (!spot) newSpot();
  if (!spot) return null;

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = action === spot.correct;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect,
      correctAction: spot.correct,
      reason: spot.reason,
      confidence: spot.confidence,
      sizing: spot.sizing,
    });
  };

  const hasCallOption = spot.toCall > 0;
  const hasCheckOption = spot.toCall === 0;

  return (
    <DrillShell title="Postflop Drill" correct={correct} total={total} onBack={onBack}>
      <div style={ds.card}>
        {/* Situation */}
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '10px' }}>
          <span style={{ color: '#ffd700', fontWeight: 700 }}>{spot.position}</span> vs <span style={{ color: '#e74c3c' }}>{spot.villain}</span>
          {' | '}{spot.stage.toUpperCase()} | Pot: {spot.pot}
          {spot.toCall > 0 ? ` | To call: ${spot.toCall}` : ' | Checked to you'}
          {spot.isBubble && <span style={{ color: '#e74c3c', fontWeight: 700 }}> | BUBBLE</span>}
        </div>

        {/* Hero cards */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#6b7b8d', marginBottom: '4px' }}>Your hand:</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {spot.hero.map((c, i) => <Card key={i} card={c} delay={i * 150} />)}
          </div>
        </div>

        {/* Board */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: '#6b7b8d', marginBottom: '4px' }}>Board:</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {spot.board.map((c, i) => <Card key={i} card={c} mini delay={i * 100} />)}
          </div>
        </div>

        {/* Action buttons */}
        {!answered && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasCheckOption && (
              <button onClick={() => answer('check')} style={{ flex: 1, padding: '12px', background: '#2980b9', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>CHECK</button>
            )}
            {hasCallOption && (
              <button onClick={() => answer('call')} style={{ flex: 1, padding: '12px', background: '#27ae60', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>CALL</button>
            )}
            <button onClick={() => answer('raise')} style={{ flex: 1, padding: '12px', background: '#f39c12', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              {hasCallOption ? 'RAISE' : 'BET'}
            </button>
            <button onClick={() => answer('fold')} style={{ flex: 1, padding: '12px', background: '#c0392b', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>FOLD</button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {feedback.isCorrect ? 'Correct!' : `Wrong — ${feedback.correctAction.toUpperCase()}${feedback.sizing ? ` (${feedback.sizing} pot)` : ''}`}
            </div>
            <div style={{ fontSize: '13px', color: '#c0d0e0', lineHeight: 1.5 }}>{feedback.reason}</div>
            <div style={ds.confidence(feedback.confidence)}>{feedback.confidence === 'solver' ? 'Solver-verified' : 'Strong approximation'}</div>
            <button onClick={newSpot} style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next Spot</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
