// BBDefenseDrill.jsx — Big Blind defense vs open raises
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom } from '../engine/deck.js';
import { getHandValue, handString } from '../engine/ranges.js';
import { getBBDefenseAction } from '../data/gtoRanges.js';

const OPENERS = ['UTG', 'MP', 'HJ', 'CO', 'BTN', 'SB'];
// BB defend thresholds (GTO vs 2.5x open): wider vs later positions
// Source: GTO Wizard approximate ranges
const BB_DEFEND = { UTG: 0.22, MP: 0.28, HJ: 0.35, CO: 0.42, BTN: 0.58, SB: 0.52 };
const BB_3BET   = { UTG: 0.08, MP: 0.10, HJ: 0.14, CO: 0.18, BTN: 0.28, SB: 0.24 };

export default function BBDefenseDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState(() => deal(freshDeck(), 2));
  const [opener, setOpener] = useState(() => OPENERS[cryptoRandom(OPENERS.length)]);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newHand = useCallback(() => {
    setCards(deal(freshDeck(), 2));
    setOpener(OPENERS[cryptoRandom(OPENERS.length)]);
    setFeedback(null);
    setAnswered(false);
  }, []);

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const handVal = getHandValue(cards[0], cards[1]);

    // Use exact GTO BB defense ranges per opener position
    const correctAction = getBBDefenseAction(cards[0], cards[1], opener);

    const isCorrect = action === correctAction;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect, correctAction,
      message: isCorrect
        ? `Correct! ${handString(cards[0], cards[1])} is a ${correctAction.toUpperCase()} from BB vs ${opener}.`
        : `${handString(cards[0], cards[1])} should be ${correctAction.toUpperCase()} from BB vs ${opener} open. ${opener === 'BTN' || opener === 'SB' ? 'Defend wider vs late position opens!' : 'Tighter defense vs early position.'}`,
    });
  };

  return (
    <DrillShell title="BB Defense Drill" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
          <span style={{ color: '#e74c3c', fontWeight: 700 }}>{opener}</span> opens 2.5x.
          You're in the <span style={{ color: '#ffd700', fontWeight: 700 }}>BB</span>. Defend?
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          {cards.map((c, i) => <Card key={i} card={c} delay={i * 150} />)}
        </div>
        {!answered && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => answer('3bet')} style={{ flex: 1, padding: '12px', background: '#f39c12', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>3-BET</button>
            <button onClick={() => answer('call')} style={{ flex: 1, padding: '12px', background: '#27ae60', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>CALL</button>
            <button onClick={() => answer('fold')} style={{ flex: 1, padding: '12px', background: '#c0392b', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>FOLD</button>
          </div>
        )}
        {feedback && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: feedback.isCorrect ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${feedback.isCorrect ? '#27ae60' : '#c0392b'}` }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>{feedback.isCorrect ? 'Correct!' : 'Wrong'}</div>
            <div style={{ fontSize: '13px', color: '#c0d0e0' }}>{feedback.message}</div>
            <div style={ds.confidence('heuristic+')}>Strong approximation</div>
            <button onClick={newHand} style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#1a5c3a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Next Hand</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}
