// Dashboard.jsx — Stats + ROI dashboard
import React from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';

const s = {
  container: { padding: '16px', maxWidth: '520px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#ffd700' },
  back: { padding: '6px 14px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '8px', color: '#5a7a8a', fontSize: '12px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' },
  stat: { background: '#0d1118', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid #1a2230' },
  label: { fontSize: '9px', color: '#3a4a5a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  val: { fontSize: '22px', fontWeight: 700, marginTop: '4px' },
  section: { background: '#0d1118', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid #1a2230' },
  secTitle: { fontSize: '13px', fontWeight: 700, color: '#e8d48b', marginBottom: '10px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #0a0d12', fontSize: '13px' },
  graph: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', padding: '8px 0' },
  bar: (h, color) => ({ width: '100%', height: Math.max(2, h) + '%', background: color, borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }),
  empty: { textAlign: 'center', padding: '40px', color: '#3a4a5a', fontSize: '14px' },
};

export default function StatsScreen({ onBack }) {
  const sessions = loadSessions();
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return (
      <div style={s.container}>
        <div style={s.header}><div style={s.title}>Statistics</div><button onClick={onBack} style={s.back}>Back</button></div>
        <div style={s.empty}>No sessions yet. Play a tournament first!</div>
      </div>
    );
  }

  // Calculate stats
  const allRecords = sessions.flatMap(s => s.records || []);
  const pf = allRecords.filter(r => r.stage === 'preflop');
  const vpip = pf.length > 0 ? (pf.filter(r => r.action !== 'fold').length / pf.length * 100).toFixed(1) : '0';
  const pfr = pf.length > 0 ? (pf.filter(r => r.action === 'raise').length / pf.length * 100).toFixed(1) : '0';
  const totalHands = allRecords.length;
  const mistakes = allRecords.filter(r => r.mistakeType);
  const accuracy = totalHands > 0 ? ((1 - mistakes.length / totalHands) * 100).toFixed(1) : '0';

  // ROI (simplified — using finish position)
  const summaries = sessions.map(s => s.summary || {});
  const avgMistakes = summaries.length > 0 ? (summaries.reduce((a, s) => a + (s.totalMistakes || 0), 0) / summaries.length).toFixed(1) : '0';

  // Profit graph (last 20 sessions)
  const last20 = sessions.slice(-20);
  const maxMistakes = Math.max(...last20.map(s => s.summary?.totalMistakes || 1), 1);

  return (
    <div style={s.container}>
      <div style={s.header}><div style={s.title}>Statistics</div><button onClick={onBack} style={s.back}>Back</button></div>

      <div style={s.grid}>
        <div style={s.stat}><div style={s.label}>Sessions</div><div style={{ ...s.val, color: '#e0e0e0' }}>{totalSessions}</div></div>
        <div style={s.stat}><div style={s.label}>Hands</div><div style={{ ...s.val, color: '#e0e0e0' }}>{totalHands}</div></div>
        <div style={s.stat}><div style={s.label}>Accuracy</div><div style={{ ...s.val, color: Number(accuracy) > 80 ? '#27ae60' : '#f39c12' }}>{accuracy}%</div></div>
      </div>

      <div style={s.grid}>
        <div style={s.stat}><div style={s.label}>VPIP</div><div style={{ ...s.val, color: '#2980b9' }}>{vpip}%</div></div>
        <div style={s.stat}><div style={s.label}>PFR</div><div style={{ ...s.val, color: '#27ae60' }}>{pfr}%</div></div>
        <div style={s.stat}><div style={s.label}>Avg Mistakes</div><div style={{ ...s.val, color: Number(avgMistakes) < 3 ? '#27ae60' : '#e74c3c' }}>{avgMistakes}</div></div>
      </div>

      {/* Mistakes trend graph */}
      <div style={s.section}>
        <div style={s.secTitle}>Mistakes Trend (last {last20.length} sessions)</div>
        <div style={s.graph}>
          {last20.map((sess, i) => {
            const m = sess.summary?.totalMistakes || 0;
            const pct = (m / maxMistakes) * 100;
            return <div key={i} style={s.bar(pct, m > 5 ? '#e74c3c' : m > 2 ? '#f39c12' : '#27ae60')} title={`Session ${i + 1}: ${m} mistakes`} />;
          })}
        </div>
      </div>

      {/* Recent sessions */}
      <div style={s.section}>
        <div style={s.secTitle}>Recent Sessions</div>
        {sessions.slice(-5).reverse().map((sess, i) => (
          <div key={i} style={s.row}>
            <span style={{ color: '#6b7b8d' }}>{new Date(sess.records?.[0]?.timestamp || 0).toLocaleDateString()}</span>
            <span style={{ color: '#c0d0e0' }}>{sess.totalHands || 0} hands</span>
            <span style={{ color: (sess.summary?.totalMistakes || 0) > 3 ? '#e74c3c' : '#27ae60' }}>
              {sess.summary?.totalMistakes || 0} mistakes
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
