// DrillHistory.jsx — Progress history: weekly heatmap, EV trend, mistake patterns
import React, { useState } from 'react';
import { getDrillProgress } from './dailyPlanGenerator.js';

const DRILL_NAMES = {
  rfi: 'RFI', '3bet': '3-Bet', bbdef: 'BB Defense', pushfold: 'Push/Fold',
  solverpf: 'Solver PF', multiway: 'Multiway', threebetpot: '3BP Lines',
  ahighcbet: 'A-high', postflop: 'Postflop', sizing: 'Sizing',
  potodds: 'Pot Odds', river: 'River', personalized: 'Weak Spots', custom: 'Custom',
};

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getWeeklyHeatmap(progress) {
  const now = Date.now();
  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = now - (w * 7 + (6 - d)) * 86400000;
      const dayEnd = dayStart + 86400000;
      let sessions = 0;
      for (const p of Object.values(progress)) {
        for (const h of (p.history || [])) {
          if (h.date >= dayStart && h.date < dayEnd) sessions++;
        }
      }
      week.push(sessions);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function DrillHistory({ onBack }) {
  const progress = getDrillProgress();
  const [selectedDrill, setSelectedDrill] = useState(null);
  const totalXP = parseInt(localStorage.getItem('pokertrain_total_xp') || '0', 10);
  const drillIds = Object.keys(progress);

  const allSessions = drillIds.reduce((s, id) => s + (progress[id]?.sessions || 0), 0);
  const avgPct = drillIds.length > 0
    ? Math.round(drillIds.reduce((s, id) => s + (progress[id]?.bestPct || 0), 0) / drillIds.length) : 0;
  const heatmap = getWeeklyHeatmap(progress);

  return (
    <div style={{ minHeight: '100vh', background: '#050b18', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif", padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ac8ff', letterSpacing: '1px' }}>Drill Progress</div>
        <button onClick={onBack} style={{ padding: '8px 16px', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '10px', color: '#4ac8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>← Back</button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '1px', marginBottom: '16px', borderRadius: '14px', overflow: 'hidden', background: '#1a2230' }}>
        {[
          { label: 'SESSIONS', val: allSessions, color: '#4ac8ff' },
          { label: 'AVG BEST', val: avgPct + '%', color: avgPct >= 70 ? '#22c55e' : '#ffa020' },
          { label: 'TOTAL XP', val: totalXP, color: '#ffa020' },
          { label: 'DRILLS', val: drillIds.length, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '12px 4px', textAlign: 'center', background: 'rgba(8,16,28,0.8)' }}>
            <div style={{ fontSize: '8px', color: '#4a6a7a', letterSpacing: '1px', fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: s.color, marginTop: '2px' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Weekly heatmap */}
      <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(74,200,255,0.12)', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#4ac8ff', marginBottom: '10px', letterSpacing: '1px' }}>TRAINING HEATMAP</div>
        <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
          <div style={{ width: '28px' }} />
          {DAYS.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: '#3a5a6a', fontWeight: 700 }}>{d}</div>)}
        </div>
        {heatmap.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
            <div style={{ width: '28px', fontSize: '9px', color: '#3a5a6a', display: 'flex', alignItems: 'center', fontWeight: 700 }}>W{4 - wi}</div>
            {week.map((count, di) => (
              <div key={di} style={{
                flex: 1, aspectRatio: '1', borderRadius: '3px',
                background: count === 0 ? '#0a1520'
                  : count === 1 ? 'rgba(74,200,255,0.2)'
                  : count === 2 ? 'rgba(74,200,255,0.4)'
                  : count >= 3 ? 'rgba(74,200,255,0.7)' : '#0a1520',
                border: '1px solid rgba(74,200,255,0.08)',
              }} />
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '8px', color: '#3a5a6a' }}>Less</span>
          {[0, 0.2, 0.4, 0.7].map((o, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: o === 0 ? '#0a1520' : `rgba(74,200,255,${o})` }} />
          ))}
          <span style={{ fontSize: '8px', color: '#3a5a6a' }}>More</span>
        </div>
      </div>

      {/* Per-drill progress */}
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#4ac8ff', marginBottom: '10px', letterSpacing: '1px' }}>PER-DRILL STATS</div>
      {drillIds.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#3a5a6a', fontSize: '14px' }}>No drill sessions yet. Start training!</div>
      ) : (
        drillIds.map(id => {
          const p = progress[id];
          const name = DRILL_NAMES[id] || id;
          return (
            <div key={id} onClick={() => setSelectedDrill(selectedDrill === id ? null : id)} style={{
              padding: '12px', borderRadius: '12px', marginBottom: '6px', cursor: 'pointer',
              background: selectedDrill === id ? 'rgba(74,200,255,0.08)' : 'rgba(8,16,28,0.8)',
              border: `1px solid ${selectedDrill === id ? 'rgba(74,200,255,0.25)' : 'rgba(74,200,255,0.08)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#c0d0e0' }}>{name}</div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: p.bestPct >= 80 ? '#22c55e' : p.bestPct >= 60 ? '#ffa020' : '#e74c3c', fontWeight: 800 }}>{p.bestPct}%</span>
                  <span style={{ fontSize: '10px', color: '#4a6a7a' }}>{p.sessions} plays</span>
                </div>
              </div>
              {/* EV trend chart */}
              {selectedDrill === id && p.history?.length > 1 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#4a7a9a', marginBottom: '6px' }}>Accuracy over time:</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '50px' }}>
                    {p.history.slice(-15).map((h, i) => (
                      <div key={i} style={{
                        flex: 1, borderRadius: '2px 2px 0 0',
                        height: `${h.pct}%`,
                        background: h.pct >= 80 ? '#22c55e' : h.pct >= 60 ? '#ffa020' : '#e74c3c',
                        opacity: 0.7 + (i / p.history.length) * 0.3,
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '9px', color: '#3a5a6a', marginTop: '4px' }}>
                    {p.totalHands} total hands · {p.xpEarned} XP earned
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
