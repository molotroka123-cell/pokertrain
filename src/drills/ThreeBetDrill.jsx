// ThreeBetDrill.jsx — 3-Bet / Call / Fold vs open
import React, { useState, useCallback } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom } from '../engine/deck.js';
import { isIn3BetRange, isInOpenRange, handString, getHandValue, THREEBET_THRESHOLDS, POSITION_THRESHOLDS } from '../engine/ranges.js';

const HERO_POS = ['CO', 'BTN', 'SB', 'BB'];
const VILLAIN_POS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO'];

export default function ThreeBetDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState(() => deal(freshDeck(), 2));
  const [heroPos, setHeroPos] = useState(() => HERO_POS[cryptoRandom(HERO_POS.length)]);
  const [villainPos, setVillainPos] = useState(() => VILLAIN_POS[cryptoRandom(VILLAIN_POS.length)]);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const newHand = useCallback(() => {
    setCards(deal(freshDeck(), 2));
    setHeroPos(HERO_POS[cryptoRandom(HERO_POS.length)]);
    setVillainPos(VILLAIN_POS[cryptoRandom(VILLAIN_POS.length)]);
    setFeedback(null);
    setAnswered(false);
  }, []);

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const handVal = getHandValue(cards[0], cards[1]);

    // Adjust thresholds based on villain position (tighter vs EP, wider vs LP)
    const villainTightness = { UTG: 0.70, 'UTG+1': 0.75, MP: 0.80, HJ: 0.90, CO: 1.0 };
    const vAdj = villainTightness[villainPos] || 0.85;
    const threeBetThresh = (THREEBET_THRESHOLDS[heroPos] || 0.12) * vAdj;
    const callThresh = (POSITION_THRESHOLDS[heroPos] || 0.30) * vAdj;

    const is3Bet = handVal <= threeBetThresh;
    const isCallable = handVal <= callThresh && !is3Bet;
    const correctAction = is3Bet ? '3bet' : isCallable ? 'call' : 'fold';
    const isCorrect = action === correctAction;

    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);

    setFeedback({
      isCorrect, correctAction,
      message: isCorrect
        ? `Correct! ${handString(cards[0], cards[1])} is a ${correctAction.toUpperCase()} from ${heroPos} vs ${villainPos} open.`
        : `${handString(cards[0], cards[1])} should be ${correctAction.toUpperCase()} from ${heroPos} vs ${villainPos}. Hand strength: ${(handVal * 100).toFixed(0)}%. 3-bet threshold: ${(threeBetThresh * 100).toFixed(0)}%. Call threshold: ${(callThresh * 100).toFixed(0)}%.`,
    });
  };

  return (
    <DrillShell title="3-Bet Drill" correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '6px' }}>
          <span style={{ color: '#e74c3c' }}>{villainPos}</span> opens 2.5x.
          You're on <span style={{ color: '#ffd700', fontWeight: 700 }}>{heroPos}</span>. Your action?
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
