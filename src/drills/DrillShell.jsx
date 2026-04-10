// DrillShell.jsx — Shared UI wrapper for all drills
import React from 'react';

const s = {
  container: { padding: '16px', maxWidth: '500px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #1e2a3a',
  },
  title: { fontSize: '18px', fontWeight: 700, color: '#ffd700' },
  back: {
    padding: '6px 14px', background: '#1a2840', border: '1px solid #2a3a4a',
    borderRadius: '6px', color: '#8899aa', fontSize: '12px', cursor: 'pointer',
  },
  score: {
    display: 'flex', justifyContent: 'space-around', padding: '10px',
    background: '#111820', borderRadius: '10px', marginBottom: '16px', border: '1px solid #1e2a3a',
  },
  scoreStat: { textAlign: 'center' },
  scoreLabel: { fontSize: '10px', color: '#6b7b8d', textTransform: 'uppercase' },
  scoreVal: { fontSize: '20px', fontWeight: 700 },
  card: {
    background: '#111820', borderRadius: '12px', padding: '16px',
    border: '1px solid #1e2a3a', marginBottom: '12px',
  },
  confidence: (conf) => ({
    fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', display: 'inline-block',
    background: conf === 'solver' ? '#1a3a2a' : conf === 'heuristic+' ? '#3a3a1a' : '#3a2a1a',
    color: conf === 'solver' ? '#48bb78' : conf === 'heuristic+' ? '#f6e05e' : '#f97316',
    marginTop: '6px',
  }),
};

export default function DrillShell({ title, correct, total, onBack, children }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>{title}</div>
        <button onClick={onBack} style={s.back}>Back</button>
      </div>
      <div style={s.score}>
        <div style={s.scoreStat}>
          <div style={s.scoreLabel}>Correct</div>
          <div style={{ ...s.scoreVal, color: '#27ae60' }}>{correct}</div>
        </div>
        <div style={s.scoreStat}>
          <div style={s.scoreLabel}>Total</div>
          <div style={{ ...s.scoreVal, color: '#e0e0e0' }}>{total}</div>
        </div>
        <div style={s.scoreStat}>
          <div style={s.scoreLabel}>Accuracy</div>
          <div style={{ ...s.scoreVal, color: pct >= 70 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c' }}>{pct}%</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export { s as drillStyles };
