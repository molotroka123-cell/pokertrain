// PersonalizedDrill.jsx — Generate drill spots from player's actual mistakes
import React, { useState, useEffect } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';
import { cryptoRandomFloat } from '../engine/deck.js';

export default function PersonalizedDrill({ onBack }) {
  const [spots, setSpots] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    try {
      const sessions = loadSessions();
      const allRecs = sessions.flatMap(s => s.records || []);
      const mistakes = allRecs.filter(r => r.mistakeType && r.holeCards && r.community);

      if (mistakes.length < 3) {
        setSpots([]);
        return;
      }

      // Group mistakes by type, take top 3 types
      const typeCounts = {};
      for (const m of mistakes) typeCounts[m.mistakeType] = (typeCounts[m.mistakeType] || 0) + 1;
      const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(t => t[0]);

      // Build drill spots from real mistakes
      const drillSpots = [];
      for (const m of mistakes) {
        if (!topTypes.includes(m.mistakeType)) continue;
        if (drillSpots.length >= 15) break;
        drillSpots.push({
          holeCards: m.holeCards,
          community: m.community,
          potSize: m.potSize,
          toCall: m.toCall,
          position: m.position,
          stage: m.stage,
          equity: m.equity,
          potOdds: m.potOdds,
          correctAction: m.gtoAction || 'call',
          mistakeType: m.mistakeType,
          evLost: m.evLost,
          facingAction: m.facingAction,
          madeHand: m.madeHandStrength,
          draws: m.draws,
        });
      }

      // Shuffle
      for (let i = drillSpots.length - 1; i > 0; i--) {
        const j = Math.floor(cryptoRandomFloat() * (i + 1));
        [drillSpots[i], drillSpots[j]] = [drillSpots[j], drillSpots[i]];
      }

      setSpots(drillSpots.slice(0, 10));
    } catch (e) { setSpots([]); }
    // If no recorded mistakes, use known GTO leaks
    if (spots.length === 0) {
      const defaultLeaks = [
        { holeCards: 'Q4o', position: 'CO', stage: 'preflop', potSize: 600, toCall: 0, equity: 0, potOdds: 0, correctAction: 'fold', mistakeType: 'offsuit_trash', evLost: 200, facingAction: null, madeHand: null, draws: null },
        { holeCards: 'A9s', position: 'SB', stage: 'preflop', potSize: 400, toCall: 200, equity: 0.45, potOdds: 0.33, correctAction: 'raise', mistakeType: 'sb_too_tight', evLost: 300, facingAction: null, madeHand: null, draws: null },
        { holeCards: '86o', position: 'BB', stage: 'preflop', potSize: 600, toCall: 200, equity: 0.35, potOdds: 0.25, correctAction: 'call', mistakeType: 'bb_too_tight', evLost: 150, facingAction: { action: 'raise', position: 'CO' }, madeHand: null, draws: null },
        { holeCards: 'AQo', position: 'CO', stage: 'preflop', potSize: 4000, toCall: 3000, equity: 0.55, potOdds: 0.43, correctAction: 'call', mistakeType: 'bad_fold', evLost: 800, facingAction: { action: 'raise', position: 'HJ' }, madeHand: null, draws: null },
        { holeCards: 'K9o', position: 'SB', stage: 'preflop', potSize: 400, toCall: 200, equity: 0.30, potOdds: 0.33, correctAction: 'fold', mistakeType: 'sb_flat_call', evLost: 200, facingAction: null, madeHand: null, draws: null },
        { holeCards: '53s', position: 'BTN', stage: 'preflop', potSize: 400, toCall: 0, equity: 0, potOdds: 0, correctAction: 'raise', mistakeType: 'btn_too_tight', evLost: 100, facingAction: null, madeHand: null, draws: null },
        { holeCards: 'QJo', position: 'SB', stage: 'preflop', potSize: 600, toCall: 400, equity: 0.40, potOdds: 0.40, correctAction: 'raise', mistakeType: 'sb_flat_call', evLost: 250, facingAction: { action: 'raise', position: 'HJ' }, madeHand: null, draws: null },
        { holeCards: 'A5o', position: 'BTN', stage: 'preflop', potSize: 600, toCall: 0, equity: 0, potOdds: 0, correctAction: 'raise', mistakeType: 'offsuit_confusion', evLost: 150, facingAction: null, madeHand: null, draws: null },
        { holeCards: '98o', position: 'CO', stage: 'preflop', potSize: 400, toCall: 0, equity: 0, potOdds: 0, correctAction: 'fold', mistakeType: 'offsuit_trash', evLost: 200, facingAction: null, madeHand: null, draws: null },
        { holeCards: 'J9o', position: 'UTG', stage: 'preflop', potSize: 400, toCall: 0, equity: 0, potOdds: 0, correctAction: 'fold', mistakeType: 'offsuit_trash', evLost: 250, facingAction: null, madeHand: null, draws: null },
      ];
      setSpots(defaultLeaks);
    }
  }, []);

  if (current >= spots.length) {
    const pct = score.total > 0 ? Math.round(score.correct / score.total * 100) : 0;
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: pct >= 70 ? '#27ae60' : '#f39c12', marginBottom: '10px' }}>{pct}% Correct</div>
        <div style={{ fontSize: '14px', color: '#8899aa' }}>{score.correct}/{score.total} spots</div>
        <div style={{ fontSize: '13px', color: '#6b7b8d', marginTop: '10px' }}>
          {pct >= 80 ? 'Great improvement!' : pct >= 60 ? 'Getting better — keep practicing' : 'Review the concepts and try again'}
        </div>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '14px 28px', background: '#27ae60', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
      </div>
    );
  }

  const spot = spots[current];
  const handleAnswer = (action) => {
    const correct = action === spot.correctAction;
    setAnswer({ action, correct });
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setTimeout(() => { setAnswer(null); setCurrent(c => c + 1); }, 2000);
  };

  return (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', color: '#d4af37', fontWeight: 700 }}>Spot {current + 1}/{spots.length}</div>
        <div style={{ fontSize: '12px', color: '#6b7b8d' }}>{score.correct}/{score.total} correct</div>
        <button onClick={onBack} style={{ padding: '6px 12px', background: '#1a2230', border: 'none', borderRadius: '6px', color: '#5a7a8a', fontSize: '11px', cursor: 'pointer' }}>Exit</button>
      </div>

      <div style={{ background: '#0d1118', borderRadius: '12px', padding: '16px', border: '1px solid #1a2230', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#5a6a7a', marginBottom: '4px' }}>{spot.position} | {spot.stage} | {spot.mistakeType?.replace(/_/g, ' ')}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#c0d0e0', marginBottom: '8px' }}>
          {spot.holeCards} {spot.community ? `| Board: ${spot.community}` : ''}
        </div>
        {spot.madeHand && <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '4px' }}>Hand: {spot.madeHand}</div>}
        {spot.draws?.drawType && spot.draws.drawType !== 'none' && (
          <div style={{ fontSize: '12px', color: '#d4af37' }}>Draw: {spot.draws.drawType} ({spot.draws.outs} outs)</div>
        )}
        <div style={{ fontSize: '13px', color: '#6b7b8d', marginTop: '8px' }}>
          Pot: {spot.potSize} | To call: {spot.toCall} | Equity: {Math.round((spot.equity || 0) * 100)}% | Odds needed: {Math.round((spot.potOdds || 0) * 100)}%
        </div>
        {spot.facingAction && (
          <div style={{ fontSize: '12px', color: '#8a7a6a', marginTop: '4px' }}>
            Facing {spot.facingAction.action} from {spot.facingAction.position}
          </div>
        )}
      </div>

      {/* Answer feedback */}
      {answer && (
        <div style={{
          textAlign: 'center', padding: '12px', borderRadius: '10px', marginBottom: '12px',
          background: answer.correct ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)',
          border: `1px solid ${answer.correct ? '#27ae6033' : '#e74c3c33'}`,
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: answer.correct ? '#27ae60' : '#e74c3c' }}>
            {answer.correct ? '✓ Correct!' : `✗ Wrong — GTO: ${spot.correctAction.toUpperCase()}`}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!answer && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleAnswer('fold')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a1a1a', color: '#aaa', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>FOLD</button>
          <button onClick={() => handleAnswer('call')} style={{ flex: 1.4, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a3a2a', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>CALL</button>
          <button onClick={() => handleAnswer('raise')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3a3010', color: '#d4af37', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>RAISE</button>
        </div>
      )}
    </div>
  );
}
