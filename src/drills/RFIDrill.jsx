// RFIDrill.jsx — Raise First In drill
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal } from '../engine/deck.js';
import { isInOpenRange, handString, getHandValue, getPositionRange, POSITION_THRESHOLDS } from '../engine/ranges.js';
import { cryptoRandom } from '../engine/deck.js';

const POSITIONS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB'];

function randomPosition() { return POSITIONS[cryptoRandom(POSITIONS.length)]; }

export default function RFIDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState([]);
  const [position, setPosition] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newHand = useCallback(() => {
    const deck = freshDeck();
    const c = deal(deck, 2);
    setCards(c);
    setPosition(randomPosition());
    setFeedback(null);
    setAnswered(false);
  }, []);

  // Init
  if (cards.length === 0) newHand();

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const shouldOpen = isInOpenRange(cards[0], cards[1], position);
    const correctAction = shouldOpen ? 'raise' : 'fold';
    const isCorrect = action === correctAction;
    const handVal = getHandValue(cards[0], cards[1]);
    const threshold = POSITION_THRESHOLDS[position] || 0.30;

    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect,
      correctAction,
      hand: handString(cards[0], cards[1]),
      handValue: handVal,
      threshold,
      message: isCorrect
        ? `Correct! ${handString(cards[0], cards[1])} is a ${correctAction} from ${position}.`
        : `Wrong. ${handString(cards[0], cards[1])} should be ${correctAction.toUpperCase()} from ${position}. Hand value: ${(handVal * 100).toFixed(0)}% vs threshold ${(threshold * 100).toFixed(0)}%.`,
    });
  };

  return (
    <DrillShell title="RFI Drill" correct={correct} total={total} onBack={onBack}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '6px' }}>
          Position: <span style={{ color: '#ffd700', fontWeight: 700 }}>{position}</span>
          <span style={{ color: '#6b7b8d' }}> — No one has opened. Your action?</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          {cards.map((c, i) => <Card key={i} card={c} delay={i * 150} />)}
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => answer('raise')} style={{
              flex: 1, padding: '14px', background: '#27ae60', border: 'none', borderRadius: '10px',
              color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            }}>RAISE</button>
            <button onClick={() => answer('fold')} style={{
              flex: 1, padding: '14px', background: '#c0392b', border: 'none', borderRadius: '10px',
              color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
            }}>FOLD</button>
          </div>
        )}

        {feedback && (
          <div style={{
            marginTop: '12px', padding: '12px', borderRadius: '8px',
            background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a',
            border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}`,
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {feedback.isCorrect ? 'Correct!' : 'Wrong'}
            </div>
            <div style={{ fontSize: '13px', color: '#c0d0e0' }}>{feedback.message}</div>
            <div style={ds.confidence('heuristic+')}>Strong approximation</div>
            <button onClick={newHand} style={{
              marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a',
              border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Next Hand</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
