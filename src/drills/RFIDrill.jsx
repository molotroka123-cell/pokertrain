// RFIDrill.jsx — Raise First In drill with GTO frequencies, timer, streaks, visual range
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds, GTOFrequencies } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import RangeGrid from '../components/RangeGrid.jsx';
import { freshDeck, deal, cryptoRandom } from '../engine/deck.js';
import { isInOpenRange, isIn3BetRange, handString, getHandValue, POSITION_THRESHOLDS } from '../engine/ranges.js';

const POSITIONS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB'];
let _lastPos = '';

function randomPosition() {
  let pos;
  do { pos = POSITIONS[cryptoRandom(POSITIONS.length)]; } while (pos === _lastPos);
  _lastPos = pos;
  return pos;
}

export default function RFIDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [cards, setCards] = useState(() => { const d = freshDeck(); return deal(d, 2); });
  const [position, setPosition] = useState(() => randomPosition());
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [showRange, setShowRange] = useState(false);
  const answeredRef = React.useRef(false);

  const newHand = useCallback(() => {
    const deck = freshDeck();
    setCards(deal(deck, 2));
    setPosition(randomPosition());
    setFeedback(null);
    setAnswered(false);
    setShowRange(false);
    answeredRef.current = false;
  }, []);

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);

    const handVal = getHandValue(cards[0], cards[1]);
    const threshold = POSITION_THRESHOLDS[position] || 0.30;
    const shouldOpen = isInOpenRange(cards[0], cards[1], position);

    // GTO frequencies (approximate from ranges)
    const raiseFreq = handVal <= threshold * 0.8 ? 100 :
      handVal <= threshold ? 75 :
      handVal <= threshold * 1.2 ? 15 : 0;
    const foldFreq = 100 - raiseFreq;
    const frequencies = { raise: raiseFreq, fold: foldFreq };

    const bestAction = shouldOpen ? 'raise' : 'fold';
    const isCorrect = action === bestAction || (frequencies[action] >= 30);

    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); }
    else setStreak(0);

    // Explanation
    const posName = { UTG: 'Under the Gun (tightest)', 'UTG+1': 'UTG+1 (very tight)', MP: 'Middle Position', HJ: 'Hijack', CO: 'Cutoff (wide)', BTN: 'Button (widest)', SB: 'Small Blind' };

    setFeedback({
      isCorrect,
      frequencies,
      heroAction: action,
      explanation: `${handString(cards[0], cards[1])} from ${posName[position] || position}.\n` +
        `Hand strength: ${(handVal * 100).toFixed(0)}% | Threshold: ${(threshold * 100).toFixed(0)}%.\n` +
        (shouldOpen
          ? `This hand is in your opening range — raise for value and position advantage.`
          : `This hand is too weak to open from ${position}. Save chips for better spots.`),
    });
  };

  const onTimeout = useCallback(() => {
    if (!answeredRef.current) answer('fold');
  }, [cards, position]);

  return (
    <DrillShell title="RFI Drill" correct={correct} total={total} streak={streak}
      onBack={onBack} timerActive={!answered} onTimeout={onTimeout}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#6b7b8d', marginBottom: '4px' }}>
          Position: <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '14px' }}>{position}</span>
          <span style={{ color: '#4a5a6a' }}> — No one opened. Your action?</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          {cards.map((c, i) => <Card key={c+i} card={c} delay={i * 150} />)}
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => answer('raise')} style={{
              flex: 1, padding: '14px', background: 'linear-gradient(135deg, #1a5a30, #27ae60)',
              border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer',
            }}>RAISE</button>
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
            <div style={{ fontSize: '12px', color: '#a0b0c0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {feedback.explanation}
            </div>
            <GTOFrequencies frequencies={feedback.frequencies} heroAction={feedback.heroAction} isCorrect={feedback.isCorrect} />
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button onClick={() => setShowRange(true)} style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                background: '#1a2a4a', border: '1px solid #2a4a6a', color: '#3a8aba', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              }}>Show Range</button>
              <button onClick={newHand} style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                background: '#1a3a2a', border: 'none', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              }}>Next Hand</button>
            </div>
          </div>
        )}
      </div>
      {showRange && <RangeGrid position={position} heroCards={cards} onClose={() => setShowRange(false)} />}
    </DrillShell>
  );
}
