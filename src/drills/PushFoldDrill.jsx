// PushFoldDrill.jsx — Nash push/fold short stack drill
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';
import { shouldPush } from '../data/pushFoldCharts.js';

const POSITIONS = ['UTG', 'CO', 'BTN', 'SB'];

export default function PushFoldDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState([]);
  const [position, setPosition] = useState('');
  const [mVal, setMVal] = useState(10);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newHand = useCallback(() => {
    setCards(deal(freshDeck(), 2));
    setPosition(POSITIONS[cryptoRandom(POSITIONS.length)]);
    setMVal(Math.round((3 + cryptoRandomFloat() * 12) * 10) / 10);
    setFeedback(null);
    setAnswered(false);
  }, []);

  if (cards.length === 0) newHand();

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const result = shouldPush(cards[0], cards[1], position, mVal);
    const correctAction = result.push ? 'push' : 'fold';
    const isCorrect = action === correctAction;

    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect, correctAction,
      message: isCorrect
        ? `Correct! ${result.hand} at M=${mVal} from ${position}: ${correctAction.toUpperCase()}.`
        : `Wrong. Nash says ${correctAction.toUpperCase()} ${result.hand} from ${position} at M=${mVal}. ${result.maxM > 0 ? `Push up to M=${result.maxM}.` : 'Not in push range for this position.'}`,
    });
  };

  return (
    <DrillShell title="Push/Fold Drill" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '4px' }}>
          Position: <span style={{ color: '#ffd700', fontWeight: 700 }}>{position}</span>
        </div>
        <div style={{ fontSize: '14px', color: mVal < 6 ? '#e74c3c' : '#f39c12', fontWeight: 700, marginBottom: '8px' }}>
          M-Ratio: {mVal} {mVal < 5 ? '— DANGER ZONE' : mVal < 8 ? '— Short stack' : '— Medium stack'}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7b8d', marginBottom: '8px' }}>Folded to you. Push all-in or fold?</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          {cards.map((c, i) => <Card key={i} card={c} delay={i * 150} />)}
        </div>
        {!answered && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => answer('push')} style={{ flex: 1, padding: '14px', background: '#e74c3c', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>ALL-IN</button>
            <button onClick={() => answer('fold')} style={{ flex: 1, padding: '14px', background: '#34495e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>FOLD</button>
          </div>
        )}
        {feedback && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>{feedback.isCorrect ? 'Correct!' : 'Wrong'}</div>
            <div style={{ fontSize: '13px', color: '#c0d0e0' }}>{feedback.message}</div>
            <div style={ds.confidence('solver')}>Nash equilibrium</div>
            <button onClick={newHand} style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next Hand</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
