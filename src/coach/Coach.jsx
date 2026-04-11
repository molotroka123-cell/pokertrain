// Coach.jsx — AI Coach + Ask Solver panel
import React, { useState } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';
import { generateDebrief } from '../recorder/autoDebrief.js';

const s = {
  container: { padding: '16px', maxWidth: '520px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#ffd700' },
  back: { padding: '6px 14px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '8px', color: '#5a7a8a', fontSize: '12px', cursor: 'pointer' },
  card: { background: '#0d1118', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #1a2230' },
  cardTitle: { fontSize: '14px', fontWeight: 700, marginBottom: '10px' },
  insight: { fontSize: '13px', color: '#c0d0e0', lineHeight: 1.6, padding: '10px', background: '#060810', borderRadius: '8px', marginBottom: '8px' },
  leak: (sev) => ({
    padding: '10px', borderRadius: '8px', marginBottom: '6px',
    background: sev === 'high' ? '#2a1515' : '#1a2030',
    border: `1px solid ${sev === 'high' ? '#4a2020' : '#1a2a3a'}`,
  }),
  leakTitle: { fontSize: '12px', fontWeight: 700, marginBottom: '4px' },
  btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1a3a6c, #2980b9)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px' },
  input: { width: '100%', padding: '12px', background: '#060810', border: '1px solid #1a2230', borderRadius: '8px', color: '#e0e0e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' },
  empty: { textAlign: 'center', padding: '30px', color: '#3a4a5a', fontSize: '14px' },
};

export default function CoachScreen({ onBack }) {
  const [tab, setTab] = useState('coach'); // coach | solver
  const sessions = loadSessions();

  // Auto-coach: aggregate all sessions
  const allRecords = sessions.flatMap(s => s.records || []);
  const debrief = allRecords.length > 0 ? generateDebrief(allRecords) : null;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>{tab === 'coach' ? 'AI Coach' : 'Ask Solver'}</div>
        <button onClick={onBack} style={s.back}>Back</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {['coach', 'solver'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: tab === t ? '#1a3a6c' : '#0d1118', color: tab === t ? '#ffd700' : '#5a7a8a',
            fontWeight: 700, fontSize: '13px',
          }}>{t === 'coach' ? 'Coach Report' : 'Ask Solver'}</button>
        ))}
      </div>

      {tab === 'coach' && (
        <>
          {!debrief ? (
            <div style={s.empty}>Play some hands first — coach needs data to analyze.</div>
          ) : (
            <>
              {/* Summary */}
              <div style={s.card}>
                <div style={{ ...s.cardTitle, color: '#e8d48b' }}>Overall Analysis</div>
                <div style={s.insight}>
                  {debrief.summary}
                </div>
                <div style={{ fontSize: '12px', color: '#5a7a8a' }}>
                  Based on {allRecords.length} hands across {sessions.length} sessions
                </div>
              </div>

              {/* Top leaks */}
              {debrief.patterns?.length > 0 && (
                <div style={s.card}>
                  <div style={{ ...s.cardTitle, color: '#f39c12' }}>Detected Leaks</div>
                  {debrief.patterns.map((p, i) => (
                    <div key={i} style={s.leak(p.severity)}>
                      <div style={{ ...s.leakTitle, color: p.severity === 'high' ? '#e74c3c' : '#f39c12' }}>
                        {p.type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0b0c0', lineHeight: 1.5 }}>{p.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top mistakes */}
              {debrief.top5?.length > 0 && (
                <div style={s.card}>
                  <div style={{ ...s.cardTitle, color: '#e74c3c' }}>Worst Mistakes (all time)</div>
                  {debrief.top5.slice(0, 3).map((m, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#8899aa', padding: '6px 0', borderBottom: '1px solid #0a0d12' }}>
                      <span style={{ color: m.severity === 'critical' ? '#e74c3c' : '#f39c12', fontWeight: 700 }}>
                        [{m.severity}]
                      </span>{' '}
                      {m.explanation?.what?.slice(0, 80)}...
                    </div>
                  ))}
                </div>
              )}

              {/* Export for deep analysis */}
              <div style={s.card}>
                <div style={{ ...s.cardTitle, color: '#27ae60' }}>Deep Analysis with Claude</div>
                <div style={{ fontSize: '12px', color: '#6b7b8d', marginBottom: '10px', lineHeight: 1.5 }}>
                  Export your data and paste into claude.ai for a detailed coaching session.
                  Claude will analyze patterns, suggest training plans, and give personalized advice.
                </div>
                <button onClick={() => {
                  const data = { sessions: sessions.slice(-5), totalHands: allRecords.length, debrief };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'poker_coach_export.json'; a.click();
                }} style={s.btn}>Export for Claude Analysis</button>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'solver' && <SolverPanel />}
    </div>
  );
}

function SolverPanel() {
  const [hand, setHand] = useState('');
  const [board, setBoard] = useState('');
  const [position, setPosition] = useState('BTN');
  const [villainPos, setVillainPos] = useState('BB');
  const [result, setResult] = useState(null);
  const [cfrResult, setCfrResult] = useState(null);
  const [solving, setSolving] = useState(false);

  const askSolver = () => {
    const heroCards = hand.split(/[\s,]+/).filter(Boolean);
    const boardCards = board.split(/[\s,]+/).filter(Boolean);
    if (heroCards.length !== 2) { setResult({ error: 'Enter 2 cards (e.g., "Ah Kd")' }); return; }

    // Quick EV engine
    import('../engine/evEngine.js').then(({ calculateQuickEV, classifyTexture }) => {
      const ev = calculateQuickEV(heroCards, boardCards.length >= 3 ? boardCards : [], 600, 300,
        { vpip: 0.25, pfr: 0.18, af: 2.5, style: 'TAG', foldToCbet: 0.45 }, position, [], 15000);
      const texture = boardCards.length >= 3 ? classifyTexture(boardCards) : 'preflop';
      setResult({
        bestAction: ev.bestAction, bestEV: ev.bestEV, equity: ev.equity,
        confidence: ev.confidence, foldProb: ev.foldProb, texture, actions: ev.actions,
      });
    });

    // CFR solver (Web Worker — non-blocking)
    setSolving(true);
    setCfrResult(null);
    import('../engine/solver.js').then(({ solveCFR }) => {
      solveCFR(heroCards, boardCards.length >= 3 ? boardCards : [], 600, 300, 15000, 0.5, 600)
        .then(res => { setCfrResult(res); setSolving(false); })
        .catch(() => setSolving(false));
    });
  };

  return (
    <div>
      <div style={s.card}>
        <div style={{ ...s.cardTitle, color: '#2980b9' }}>Input Situation</div>
        <label style={{ fontSize: '11px', color: '#5a7a8a', display: 'block', marginBottom: '4px' }}>Your hand (e.g., Ah Kd)</label>
        <input value={hand} onChange={e => setHand(e.target.value)} placeholder="Ah Kd" style={s.input} />
        <label style={{ fontSize: '11px', color: '#5a7a8a', display: 'block', marginBottom: '4px' }}>Board (e.g., Jh Ts 4c)</label>
        <input value={board} onChange={e => setBoard(e.target.value)} placeholder="Jh Ts 4c (or empty for preflop)" style={s.input} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '10px', color: '#5a7a8a' }}>Your position</label>
            <select value={position} onChange={e => setPosition(e.target.value)} style={{ ...s.input, padding: '10px' }}>
              {['UTG', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '10px', color: '#5a7a8a' }}>Villain position</label>
            <select value={villainPos} onChange={e => setVillainPos(e.target.value)} style={{ ...s.input, padding: '10px' }}>
              {['UTG', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button onClick={askSolver} style={s.btn}>ANALYZE</button>
      </div>

      {result?.error && <div style={{ ...s.card, color: '#e74c3c' }}>{result.error}</div>}

      {result && !result.error && (
        <div style={s.card}>
          <div style={{ ...s.cardTitle, color: '#27ae60' }}>
            Best: {result.bestAction?.toUpperCase()} (EV: {result.bestEV > 0 ? '+' : ''}{result.bestEV})
          </div>
          <div style={{ fontSize: '12px', color: '#6b7b8d', marginBottom: '8px' }}>
            Equity: {(result.equity * 100).toFixed(0)}% | Fold prob: {(result.foldProb * 100).toFixed(0)}% |
            Confidence: {(result.confidence * 100).toFixed(0)}% | Board: {result.texture}
          </div>
          <div style={{ fontSize: '11px', color: '#5a7a8a' }}>
            {Object.entries(result.actions).filter(([, v]) => v.ev !== undefined).map(([action, v]) => (
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: action === result.bestAction ? '#ffd700' : '#6b7b8d' }}>
                  {action === result.bestAction ? '★ ' : '  '}{action}
                </span>
                <span style={{ color: v.ev > 0 ? '#27ae60' : v.ev < 0 ? '#e74c3c' : '#6b7b8d' }}>
                  {v.ev > 0 ? '+' : ''}{v.ev}
                  {v.breakdown ? ` (F:${v.breakdown.foldPct}% C:${v.breakdown.callPct}% R:${v.breakdown.reraisePct}%)` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CFR Solver Results */}
      {solving && (
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ color: '#d4af37', fontSize: '13px' }}>CFR Solver running...</div>
        </div>
      )}
      {cfrResult && (
        <div style={s.card}>
          <div style={{ ...s.cardTitle, color: '#d4af37' }}>
            CFR Solver: {cfrResult.bestAction?.toUpperCase()} ({cfrResult.bestFrequency}% freq)
          </div>
          <div style={{ fontSize: '12px', color: '#6b7b8d', marginBottom: '8px' }}>
            Equity: {(cfrResult.equity * 100).toFixed(0)}% | {cfrResult.iterations} iterations
          </div>
          {cfrResult.actions?.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #1a2230' }}>
              <span style={{ color: a.action === cfrResult.bestAction ? '#ffd700' : '#6b7b8d', fontWeight: a.action === cfrResult.bestAction ? 700 : 400 }}>
                {a.action === cfrResult.bestAction ? '★ ' : '  '}{a.action}
              </span>
              <span style={{ color: '#8899aa' }}>{a.frequency}%</span>
              <span style={{ color: a.ev > 0 ? '#27ae60' : a.ev < 0 ? '#e74c3c' : '#6b7b8d' }}>
                EV: {a.ev > 0 ? '+' : ''}{a.ev}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
