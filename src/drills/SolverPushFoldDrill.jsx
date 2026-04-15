// SolverPushFoldDrill.jsx — Nash ICM solver-level push/fold trainer
// 7 stack depths, push + call ranges, 4 modes, weak spots tracking
import React, { useState, useCallback, useRef } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';
import {
  PUSH_RANGES, CALL_RANGES, WEAK_SPOTS,
  BB_LEVELS, PUSH_POSITIONS, CALL_POSITIONS,
  cardsToHandKey, isInRange, closestBB,
} from '../data/solverRanges.js';

const MODES = [
  { id: 'push', label: 'Push', desc: 'Open shove' },
  { id: 'call', label: 'Call', desc: 'BB defense' },
  { id: 'mix', label: 'Mix', desc: 'Both' },
  { id: 'weak', label: 'Weak', desc: 'Your leaks' },
];

function loadStats() {
  try { return JSON.parse(localStorage.getItem('drill_solver_pushfold') || 'null') || defaultStats(); } catch { return defaultStats(); }
}
function defaultStats() {
  return { totalHands: 0, correct: 0, bestStreak: 0, byMode: {}, weakSpots: {}, sessions: [] };
}
function saveStats(st) {
  try { localStorage.setItem('drill_solver_pushfold', JSON.stringify(st)); } catch {}
}

function pickBB(fixedBB) {
  if (fixedBB) return fixedBB;
  return BB_LEVELS[cryptoRandom(BB_LEVELS.length)];
}

function genPushSpot(fixedBB) {
  const bb = pickBB(fixedBB);
  const pos = PUSH_POSITIONS[cryptoRandom(PUSH_POSITIONS.length)];
  const deck = freshDeck();
  const cards = deal(deck, 2);
  const handKey = cardsToHandKey(cards[0], cards[1]);
  const rangeStr = PUSH_RANGES[bb]?.[pos] || '';
  const shouldPush = isInRange(handKey, rangeStr);
  return { type: 'push', bb, pos, cards, handKey, correct: shouldPush ? 'push' : 'fold', rangeStr };
}

function genCallSpot(fixedBB) {
  const bb = pickBB(fixedBB);
  const callPos = CALL_POSITIONS[cryptoRandom(CALL_POSITIONS.length)];
  const deck = freshDeck();
  const cards = deal(deck, 2);
  const handKey = cardsToHandKey(cards[0], cards[1]);
  const rangeStr = CALL_RANGES[bb]?.[callPos] || '';
  const shouldCall = isInRange(handKey, rangeStr);
  const shoverPos = callPos.replace('vs_', '');
  return { type: 'call', bb, pos: callPos, shoverPos, cards, handKey, correct: shouldCall ? 'call' : 'fold', rangeStr };
}

function genWeakSpot(fixedBB) {
  // 70% from weak spots list, 30% random
  if (cryptoRandomFloat() < 0.7 && WEAK_SPOTS.length > 0) {
    const ws = WEAK_SPOTS[cryptoRandom(WEAK_SPOTS.length)];
    // Build specific cards for this hand
    const deck = freshDeck();
    const cards = deal(deck, 2);
    // We can't force specific hand easily, so generate random and use the weak spot data for checking
    // Instead, just bias towards those BB/pos combos
    const bb = ws.bb;
    if (ws.mode === 'push') return genPushSpot(bb);
    return genCallSpot(bb);
  }
  return cryptoRandomFloat() > 0.5 ? genPushSpot(fixedBB) : genCallSpot(fixedBB);
}

export default function SolverPushFoldDrill({ onBack }) {
  const [mode, setMode] = useState('push');
  const [fixedBB, setFixedBB] = useState(null); // null = random
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [spot, setSpot] = useState(() => genPushSpot(null));
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const answeredRef = useRef(false);
  const statsRef = useRef(loadStats());

  const genSpot = useCallback((m, bb) => {
    if (m === 'push') return genPushSpot(bb);
    if (m === 'call') return genCallSpot(bb);
    if (m === 'weak') return genWeakSpot(bb);
    // mix
    return cryptoRandomFloat() > 0.5 ? genPushSpot(bb) : genCallSpot(bb);
  }, []);

  const newSpot = useCallback(() => {
    setSpot(genSpot(mode, fixedBB));
    setFeedback(null);
    setAnswered(false);
    answeredRef.current = false;
  }, [mode, fixedBB, genSpot]);

  const answer = useCallback((action) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);

    const isCorrect = action === spot.correct;
    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); }
    else setStreak(0);

    // Update persistent stats
    const st = statsRef.current;
    st.totalHands++;
    if (isCorrect) st.correct++;
    if (!st.byMode[mode]) st.byMode[mode] = { n: 0, c: 0 };
    st.byMode[mode].n++;
    if (isCorrect) st.byMode[mode].c++;
    const wsKey = `${spot.handKey}_${spot.pos}_${spot.bb}BB`;
    if (!st.weakSpots[wsKey]) st.weakSpots[wsKey] = { seen: 0, correct: 0 };
    st.weakSpots[wsKey].seen++;
    if (isCorrect) st.weakSpots[wsKey].correct++;
    st.bestStreak = Math.max(st.bestStreak, isCorrect ? streak + 1 : 0);
    saveStats(st);

    setFeedback({
      isCorrect, action,
      message: spot.type === 'push'
        ? `${spot.handKey} from ${spot.pos} at ${spot.bb}BB → ${spot.correct.toUpperCase()}`
        : `${spot.handKey} in BB ${spot.shoverPos} shoves ${spot.bb}BB → ${spot.correct.toUpperCase()}`,
      detail: isCorrect
        ? (spot.correct === 'push' || spot.correct === 'call' ? 'In range — correct!' : 'Not in range — good fold!')
        : (spot.correct === 'push' || spot.correct === 'call' ? 'This hand IS in the range. Should have gone with it.' : 'This hand is NOT in the range. Should have folded.'),
    });
  }, [spot, mode, streak]);

  const onTimeout = useCallback(() => {
    if (!answeredRef.current) answer('fold');
  }, [answer]);

  const endSession = () => {
    const st = statsRef.current;
    st.sessions.push({ date: new Date().toISOString().slice(0, 10), hands: total, accuracy: total > 0 ? Math.round(correct / total * 100) : 0 });
    if (st.sessions.length > 50) st.sessions = st.sessions.slice(-50);
    saveStats(st);
    setShowSession(true);
  };

  // Session summary
  if (showSession) {
    const st = statsRef.current;
    const worstSpots = Object.entries(st.weakSpots)
      .filter(([, v]) => v.seen >= 2)
      .map(([k, v]) => ({ key: k, ...v, pct: Math.round(v.correct / v.seen * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
    return (
      <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: '#ffd700', fontWeight: 700, letterSpacing: '2px' }}>SESSION COMPLETE</div>
          <div style={{ fontSize: '40px', fontWeight: 900, color: correct / Math.max(total, 1) >= 0.8 ? '#27ae60' : '#f39c12', marginTop: '8px' }}>
            {total > 0 ? Math.round(correct / total * 100) : 0}%
          </div>
          <div style={{ fontSize: '13px', color: '#6b7b8d' }}>{correct}/{total} correct | Best streak: {st.bestStreak}</div>
        </div>
        {worstSpots.length > 0 && (
          <div style={{ background: '#0d1118', borderRadius: '12px', padding: '14px', border: '1px solid #1a2230', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e74c3c', marginBottom: '8px' }}>Weak Spots</div>
            {worstSpots.map(ws => (
              <div key={ws.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #141a22' }}>
                <span style={{ color: '#c0d0e0', fontFamily: 'monospace' }}>{ws.key}</span>
                <span style={{ color: ws.pct >= 80 ? '#27ae60' : ws.pct >= 50 ? '#f39c12' : '#e74c3c', fontWeight: 700 }}>
                  {ws.correct}/{ws.seen} ({ws.pct}%) {ws.pct >= 80 ? '✓' : '← train!'}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setShowSession(false); setCorrect(0); setTotal(0); setStreak(0); newSpot(); }} style={{
          width: '100%', padding: '14px', background: '#1a5c3a', border: 'none', borderRadius: '10px',
          color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
        }}>New Session</button>
        <button onClick={onBack} style={{
          width: '100%', padding: '12px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '10px',
          color: '#6b7b8d', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginTop: '8px',
        }}>Back to Drills</button>
      </div>
    );
  }

  const isPush = spot.type === 'push';
  const bbColor = spot.bb <= 5 ? '#e74c3c' : spot.bb <= 10 ? '#f39c12' : '#27ae60';

  return (
    <DrillShell title="Solver Push/Fold" correct={correct} total={total} streak={streak}
      onBack={onBack} timerActive={!answered} onTimeout={onTimeout}>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setSpot(genSpot(m.id, fixedBB)); setFeedback(null); setAnswered(false); answeredRef.current = false; }} style={{
            flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: mode === m.id ? '#1a3a5c' : '#0d1118',
            color: mode === m.id ? '#ffd700' : '#4a5a6a', fontWeight: 700, fontSize: '11px',
          }}>{m.label}</button>
        ))}
      </div>

      {/* BB selector */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => { setFixedBB(null); }} style={{
          padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
          background: fixedBB === null ? '#1a3a2a' : '#0a0d12', color: fixedBB === null ? '#27ae60' : '#3a4a5a',
          fontSize: '10px', fontWeight: 700,
        }}>Rnd</button>
        {BB_LEVELS.map(bb => (
          <button key={bb} onClick={() => { setFixedBB(bb); }} style={{
            padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: fixedBB === bb ? '#1a3a2a' : '#0a0d12', color: fixedBB === bb ? '#27ae60' : '#3a4a5a',
            fontSize: '10px', fontWeight: 700,
          }}>{bb}BB</button>
        ))}
      </div>

      <div style={ds.card}>
        {/* Scenario info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            {isPush ? (
              <span style={{ fontSize: '12px', color: '#8899aa' }}>You are in <span style={{ color: '#ffd700', fontWeight: 700 }}>{spot.pos}</span> — folded to you</span>
            ) : (
              <span style={{ fontSize: '12px', color: '#8899aa' }}>You are <span style={{ color: '#ffd700', fontWeight: 700 }}>BB</span> — <span style={{ color: '#e74c3c' }}>{spot.shoverPos}</span> shoves</span>
            )}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '14px',
            color: bbColor, background: spot.bb <= 5 ? '#2a0a0a' : spot.bb <= 10 ? '#2a1a0a' : '#0a1a10',
          }}>{spot.bb}BB</div>
        </div>

        <div style={{ fontSize: '10px', color: '#4a5a6a', marginBottom: '8px' }}>
          6-max | Ante 12.5% | Nash ICM
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '12px 0' }}>
          {spot.cards.map((c, i) => <Card key={c + i} card={c} delay={i * 150} />)}
        </div>

        {/* Action buttons */}
        {!answered && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => answer(isPush ? 'push' : 'call')} style={{
              flex: 1, padding: '16px', border: '2px solid #27ae60', borderRadius: '12px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #0a2a14, #1a5a30)', color: '#27ae60',
              fontWeight: 900, fontSize: '18px',
            }}>{isPush ? 'PUSH' : 'CALL'}</button>
            <button onClick={() => answer('fold')} style={{
              flex: 1, padding: '16px', border: '2px solid #e74c3c', borderRadius: '12px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #2a0a0a, #5a1a1a)', color: '#e74c3c',
              fontWeight: 900, fontSize: '18px',
            }}>FOLD</button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: '10px', padding: '12px', borderRadius: '10px',
            background: feedback.isCorrect ? '#0a1a10' : '#1a0a0a',
            border: `2px solid ${feedback.isCorrect ? '#27ae60' : '#e74c3c'}`,
          }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {feedback.isCorrect ? '✓ Correct!' : '✗ Wrong'}
            </div>
            <div style={{ fontSize: '13px', color: '#c0d0e0', fontWeight: 600, marginBottom: '4px' }}>{feedback.message}</div>
            <div style={{ fontSize: '11px', color: '#8899aa' }}>{feedback.detail}</div>
            <div style={{ fontSize: '10px', color: '#3a6a9a', marginTop: '4px', fontFamily: 'monospace' }}>
              Source: HoldemResources.net Nash ICM
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button onClick={newSpot} style={{
                flex: 1, padding: '12px', background: '#1a3a2a', border: 'none', borderRadius: '8px',
                color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              }}>Next</button>
              {total >= 10 && (
                <button onClick={endSession} style={{
                  padding: '12px 16px', background: '#1a2a4a', border: '1px solid #2a4a6a', borderRadius: '8px',
                  color: '#3a8aba', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                }}>End Session</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* All-time stats */}
      {statsRef.current.totalHands > 0 && (
        <div style={{ padding: '8px 12px', background: '#0a0d12', borderRadius: '8px', border: '1px solid #141a22', marginTop: '6px', fontSize: '10px', color: '#4a5a6a', display: 'flex', justifyContent: 'space-between' }}>
          <span>All-time: {statsRef.current.correct}/{statsRef.current.totalHands} ({statsRef.current.totalHands > 0 ? Math.round(statsRef.current.correct / statsRef.current.totalHands * 100) : 0}%)</span>
          <span>Best streak: {statsRef.current.bestStreak}</span>
          <span>Sessions: {statsRef.current.sessions.length}</span>
        </div>
      )}
    </DrillShell>
  );
}
