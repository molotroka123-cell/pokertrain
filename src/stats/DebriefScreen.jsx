// DebriefScreen.jsx — Post-tournament debrief screen
import React, { useState } from 'react';
import HandReplay from '../replay/HandReplay.jsx';

const s = {
  container: { padding: '16px', maxWidth: '500px', margin: '0 auto' },
  header: {
    textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1e2a3a',
  },
  title: { fontSize: '20px', fontWeight: 700, color: '#ffd700' },
  subtitle: { fontSize: '13px', color: '#6b7b8d', marginTop: '4px' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px',
  },
  stat: {
    background: '#111820', borderRadius: '10px', padding: '12px', textAlign: 'center',
    border: '1px solid #1e2a3a',
  },
  statLabel: { fontSize: '10px', color: '#6b7b8d', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statVal: { fontSize: '20px', fontWeight: 700, marginTop: '4px' },
  section: {
    background: '#111820', borderRadius: '12px', padding: '14px', marginBottom: '12px',
    border: '1px solid #1e2a3a',
  },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#ffd700', marginBottom: '10px' },
  mistakeCard: (severity) => ({
    padding: '12px', borderRadius: '8px', marginBottom: '8px',
    background: severity === 'critical' ? '#2a1010' : severity === 'high' ? '#2a2010' : '#1a2030',
    border: `1px solid ${severity === 'critical' ? '#5a2020' : severity === 'high' ? '#5a4020' : '#2a3a4a'}`,
    cursor: 'pointer',
  }),
  sevBadge: (severity) => ({
    fontSize: '10px', fontWeight: 700, display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    background: severity === 'critical' ? '#e74c3c' : severity === 'high' ? '#f39c12' : '#2980b9',
    color: '#fff', marginRight: '6px',
  }),
  pattern: {
    padding: '10px', background: '#0d1118', borderRadius: '8px', marginBottom: '6px',
    border: '1px solid #1a2230',
  },
  summary: {
    padding: '14px', background: '#1a2a1a', borderRadius: '10px', marginBottom: '16px',
    border: '1px solid #2a4a2a', fontSize: '14px', color: '#c0d0e0', lineHeight: 1.6,
  },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1a5c3a, #27ae60)',
    border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px',
    cursor: 'pointer', marginTop: '8px',
  },
  exportBtn: {
    width: '100%', padding: '12px', background: '#1a2840', border: '1px solid #2a3a4a',
    borderRadius: '10px', color: '#8899aa', fontWeight: 600, fontSize: '13px',
    cursor: 'pointer', marginTop: '8px',
  },
};

export default function DebriefScreen({ debrief, finish, records, onClose, onExport }) {
  const [selectedMistake, setSelectedMistake] = useState(null);

  if (!debrief) return null;

  if (selectedMistake) {
    const rec = selectedMistake.decision;
    return (
      <div style={s.container}>
        <HandReplay
          hand={{
            handNumber: rec.handNumber,
            position: rec.position,
            holeCards: rec.holeCards,
            result: rec.handResult,
            potWon: rec.potWon,
            mistake: selectedMistake,
            actions: [],
          }}
          onClose={() => setSelectedMistake(null)}
        />
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>TOURNAMENT DEBRIEF</div>
        <div style={s.subtitle}>
          Finish: #{finish?.position || '?'}/{finish?.total || '?'} | Hands: {records?.length || 0}
          {finish?.apiCalls > 0 && (
            <span style={{ color: '#d4af37' }}> | AI calls: {finish.apiCalls} (~${(finish.apiCalls * 0.0005).toFixed(3)})</span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div style={s.statsGrid}>
        <div style={s.stat}>
          <div style={s.statLabel}>Mistakes</div>
          <div style={{ ...s.statVal, color: debrief.totalMistakes > 5 ? '#e74c3c' : '#27ae60' }}>
            {debrief.totalMistakes}
          </div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Critical</div>
          <div style={{ ...s.statVal, color: debrief.criticalMistakes > 0 ? '#e74c3c' : '#27ae60' }}>
            {debrief.criticalMistakes}
          </div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>EV Lost</div>
          <div style={{ ...s.statVal, color: '#f39c12' }}>
            ~{debrief.estimatedEVLost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summary}>{debrief.summary}</div>

      {/* Top mistakes */}
      {debrief.top5.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Top Mistakes</div>
          {debrief.top5.map((m, i) => (
            <div key={i} style={s.mistakeCard(m.severity)} onClick={() => setSelectedMistake(m)}>
              <div>
                <span style={s.sevBadge(m.severity)}>{m.severity}</span>
                <span style={{ fontSize: '13px', color: '#c0d0e0' }}>
                  Hand #{m.handNumber} — {m.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8899aa', marginTop: '4px' }}>
                {m.explanation?.what?.slice(0, 100)}...
              </div>
              <div style={{ fontSize: '11px', color: '#f39c12', marginTop: '4px' }}>
                EV lost: ~{m.evLost} | {m.drillRecommendation?.icon} {m.drillRecommendation?.drill}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patterns */}
      {debrief.patterns?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Detected Patterns</div>
          {debrief.patterns.map((p, i) => (
            <div key={i} style={s.pattern}>
              <div style={{ fontSize: '13px', color: p.severity === 'high' ? '#f39c12' : '#c0d0e0', lineHeight: 1.5 }}>
                {p.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <button onClick={onClose} style={s.btn}>Back to Lobby</button>
      {onExport && (
        <button onClick={onExport} style={s.exportBtn}>Export Session JSON (for Claude analysis)</button>
      )}
    </div>
  );
}
