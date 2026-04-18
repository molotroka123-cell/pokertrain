// Dashboard.jsx — Stats + ROI + Achievements + Bankroll + Leaderboard
import React from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';
import { getAchievements, getLeaderboard, getBankroll } from '../lib/achievements.js';

const s = {
  container: { padding: '16px', maxWidth: '520px', margin: '0 auto', minHeight: '100vh', background: '#050b18' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '8px 0' },
  title: { fontSize: '20px', fontWeight: 900, color: '#4ac8ff', letterSpacing: '2px' },
  back: { padding: '8px 16px', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '10px', color: '#4ac8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' },
  stat: { background: 'rgba(8,16,28,0.8)', borderRadius: '14px', padding: '16px', textAlign: 'center', border: '1px solid rgba(74,200,255,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
  label: { fontSize: '9px', color: '#4a7a9a', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 },
  val: { fontSize: '24px', fontWeight: 900, marginTop: '6px' },
  section: { background: 'rgba(8,16,28,0.8)', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(74,200,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
  secTitle: { fontSize: '13px', fontWeight: 800, color: '#4ac8ff', marginBottom: '12px', letterSpacing: '1px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(74,200,255,0.06)', fontSize: '13px' },
  graph: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', padding: '8px 0' },
  bar: (h, color) => ({ width: '100%', height: Math.max(2, h) + '%', background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }),
  empty: { textAlign: 'center', padding: '40px', color: '#3a5a6a', fontSize: '14px' },
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

  // Calculate stats — per session, then aggregate
  let totalHands = 0, totalMistakeCount = 0, totalVpip = 0, totalPfr = 0, totalPfHands = 0;
  for (const sess of sessions) {
    const recs = sess.records || [];
    const handNums = new Set(recs.map(r => r.handNumber));
    totalHands += handNums.size;
    const mistakeHands = new Set(recs.filter(r => r.mistakeType).map(r => r.handNumber));
    totalMistakeCount += mistakeHands.size;
    // Per-session preflop dedup
    const pfMap = new Map();
    for (const r of recs) { if (r.stage === 'preflop' && !pfMap.has(r.handNumber)) pfMap.set(r.handNumber, r); }
    const pf = [...pfMap.values()];
    totalPfHands += pf.length;
    totalVpip += pf.filter(r => r.action !== 'fold' && r.action !== 'bb_walk').length;
    totalPfr += pf.filter(r => r.action === 'raise').length;
  }
  const vpip = totalPfHands > 0 ? (totalVpip / totalPfHands * 100).toFixed(1) : '0';
  const pfr = totalPfHands > 0 ? (totalPfr / totalPfHands * 100).toFixed(1) : '0';
  const accuracy = totalHands > 0 ? ((1 - totalMistakeCount / totalHands) * 100).toFixed(1) : '0';
  const mistakes = { length: totalMistakeCount };

  // ROI (simplified — using finish position)
  const summaries = sessions.map(s => s.summary || {});
  const avgMistakes = summaries.length > 0 ? (summaries.reduce((a, s) => a + (s.totalMistakes || 0), 0) / summaries.length).toFixed(1) : '0';

  // Profit graph (last 20 sessions)
  const last20 = sessions.slice(-20);
  const maxMistakes = Math.max(...last20.map(s => s.summary?.totalMistakes || 1), 1);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>Statistics</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => {
            const data = JSON.stringify(sessions.slice(-1), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = `last_session_${Date.now()}.json`; a.click();
          }} style={{ ...s.back, color: '#d4af37', borderColor: '#3a3a1a' }}>Last</button>
          <button onClick={() => {
            const data = JSON.stringify(sessions, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = `all_sessions_${Date.now()}.json`; a.click();
          }} style={{ ...s.back, color: '#27ae60', borderColor: '#1a3a1a' }}>All</button>
          <button onClick={() => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.json';
            input.onchange = (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target.result);
                  const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
                  if (Array.isArray(data)) { sessions.push(...data); }
                  else if (data.records) { sessions.push(data); }
                  localStorage.setItem('wsop_sessions', JSON.stringify(sessions));
                  window.location.reload();
                } catch (err) { alert('Invalid JSON file'); }
              };
              reader.readAsText(file);
            };
            input.click();
          }} style={{ ...s.back, color: '#3498db', borderColor: '#1a2a4a' }}>Import</button>
          <button onClick={() => { if (confirm('Clear all session history?')) { localStorage.removeItem('wsop_sessions'); localStorage.removeItem('pokertrain_achievements'); localStorage.removeItem('pokertrain_bankroll'); window.location.reload(); } }} style={{ ...s.back, color: '#8a4a4a', borderColor: '#3a1a20' }}>Clear</button>
          <button onClick={onBack} style={s.back}>Back</button>
        </div>
      </div>

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
      {/* Leak Progress Tracking */}
      {sessions.length >= 3 && (
        <div style={s.section}>
          <div style={s.secTitle}>Leak Progress</div>
          {['vpip', 'pfr', 'foldToCbet'].map(metric => {
            const values = sessions.slice(-10).map(sess => {
              const sm = sess.summary || {};
              if (metric === 'foldToCbet') {
                // Compute from records
                const recs = sess.records || [];
                const pfCalls = new Set(recs.filter(r => r.stage === 'preflop' && r.action === 'call').map(r => r.handNumber));
                const facing = recs.filter(r => r.stage === 'flop' && pfCalls.has(r.handNumber) && r.toCall > 0);
                const folded = facing.filter(r => r.action === 'fold').length;
                return facing.length > 0 ? Math.round(folded / facing.length * 100) : null;
              }
              return sm[metric] ?? null;
            }).filter(v => v != null);
            if (values.length < 2) return null;
            const target = { vpip: 25, pfr: 20, foldToCbet: 45 }[metric] || 50;
            const max = Math.max(...values, target + 10);
            const min = Math.min(...values, target - 10);
            const range = max - min || 1;
            return (
              <div key={metric} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7b8d', marginBottom: '4px' }}>
                  {metric === 'vpip' ? 'VPIP' : metric === 'pfr' ? 'PFR' : 'Fold to Cbet'} (target: {target}%)
                </div>
                <svg viewBox={`0 0 200 40`} style={{ width: '100%', height: '40px' }}>
                  <line x1="0" y1={40 - (target - min) / range * 40} x2="200" y2={40 - (target - min) / range * 40} stroke="#27ae6044" strokeWidth="1" strokeDasharray="3"/>
                  <polyline points={values.map((v, i) => `${i / (values.length - 1) * 200},${40 - (v - min) / range * 40}`).join(' ')} fill="none" stroke="#d4af37" strokeWidth="2"/>
                </svg>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Session Comparison (last 5) */}
      {sessions.length >= 2 && (
        <div style={s.section}>
          <div style={s.secTitle}>Progress (last {Math.min(5, sessions.length)} sessions)</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
              {sessions.slice(-5).map((sess, i) => {
                const sm = sess.summary || {};
                return (
                  <div key={i} style={{ minWidth: '85px', padding: '8px', background: '#0a0d12', borderRadius: '8px', border: '1px solid #141a22', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#3a4a5a' }}>#{sessions.length - (Math.min(5, sessions.length) - 1 - i)}</div>
                    <div style={{ fontSize: '11px', color: '#6b7b8d', marginTop: '2px' }}>VPIP {sm.vpip || 0}%</div>
                    <div style={{ fontSize: '11px', color: '#6b7b8d' }}>PFR {sm.pfr || 0}%</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: (sm.totalMistakes || 0) <= 3 ? '#27ae60' : '#f39c12', marginTop: '2px' }}>
                      {sm.totalMistakes || 0} err
                    </div>
                    <div style={{ fontSize: '10px', color: '#e74c3c' }}>-{sm.estimatedEVLost || 0} EV</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {(() => {
        const achs = getAchievements();
        const unlocked = achs.filter(a => a.unlocked).length;
        return (
          <div style={s.section}>
            <div style={s.secTitle}>Achievements ({unlocked}/{achs.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {achs.map(a => (
                <div key={a.id} style={{
                  textAlign: 'center', padding: '8px 4px', borderRadius: '8px',
                  background: a.unlocked ? '#1a2a1a' : '#0a0d12',
                  border: `1px solid ${a.unlocked ? '#2a4a2a' : '#141a22'}`,
                  opacity: a.unlocked ? 1 : 0.4,
                }}>
                  <div style={{ fontSize: '20px' }}>{a.icon}</div>
                  <div style={{ fontSize: '9px', color: a.unlocked ? '#c0d0e0' : '#3a4a5a', fontWeight: 600, marginTop: '2px' }}>{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Leaderboard / All-Time Results */}
      {(() => {
        const lb = getLeaderboard(sessions);
        return (
          <div style={s.section}>
            <div style={s.secTitle}>All-Time Results</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <div style={s.stat}><div style={s.label}>Tournaments</div><div style={{ ...s.val, fontSize: '18px', color: '#c0d0e0' }}>{lb.totalTournaments}</div></div>
              <div style={s.stat}><div style={s.label}>ITM%</div><div style={{ ...s.val, fontSize: '18px', color: lb.itmPct >= 15 ? '#27ae60' : '#f39c12' }}>{lb.itmPct}%</div></div>
              <div style={s.stat}><div style={s.label}>ROI</div><div style={{ ...s.val, fontSize: '18px', color: lb.roi >= 0 ? '#27ae60' : '#e74c3c' }}>{lb.roi > 0 ? '+' : ''}{lb.roi}%</div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', color: '#6b7b8d' }}>
              <span>Wins: {lb.wins}</span>
              <span>Best: #{lb.bestFinish || '—'}</span>
              <span>Avg: #{lb.avgFinish || '—'}</span>
            </div>
          </div>
        );
      })()}

      {/* Bankroll */}
      {(() => {
        const br = getBankroll();
        return (
          <div style={s.section}>
            <div style={s.secTitle}>Bankroll</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: br.balance >= 10000 ? '#27ae60' : br.balance >= 5000 ? '#d4af37' : '#e74c3c' }}>
                ${br.balance.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#5a6a7a', marginTop: '2px' }}>
                Peak: ${br.peak.toLocaleString()} | {br.history.length} entries
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
