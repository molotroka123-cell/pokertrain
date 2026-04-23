// DrillResults.jsx — Final session summary
import React from 'react';
import { getLeakProgress } from '../engine/SessionStats.js';

export default function DrillResults({ stats, leak, leakTitle, onRetry, onHome }) {
  const score = Math.round((stats.accuracy || 0) * 100);
  const progress = getLeakProgress(leak);

  const verdict = score >= 85
    ? { color: '#27ae60', text: `Excellent! "${leakTitle}" leak closing.` }
    : score >= 65
    ? { color: '#f39c12', text: 'Good progress. Drill again tomorrow.' }
    : { color: '#e74c3c', text: 'Leak still active. Review explanations carefully.' };

  return (
    <div style={{
      maxWidth: 500, margin: '0 auto', padding: 20,
      color: '#e0e8f0',
    }}>
      <div style={{
        textAlign: 'center', padding: '24px 16px',
        background: 'linear-gradient(160deg, #0e1a2c 0%, #0a1120 100%)',
        borderRadius: 16, border: '1px solid rgba(212,175,55,0.25)',
      }}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: '#8a9aaa', marginBottom: 4 }}>
          DRILL COMPLETE
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#d4af37', marginBottom: 16 }}>
          {leakTitle}
        </div>

        <div style={{ fontSize: 64, fontWeight: 900, color: verdict.color, lineHeight: 1 }}>
          {score}%
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: verdict.color, fontWeight: 600 }}>
          {verdict.text}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{
        display: 'flex', gap: 1, marginTop: 14, borderRadius: 12, overflow: 'hidden',
        background: '#1a2230',
      }}>
        {[
          { label: 'PERFECT', val: stats.perfect, color: '#27ae60' },
          { label: 'ACCEPTABLE', val: stats.acceptable, color: '#f39c12' },
          { label: 'MISTAKES', val: stats.mistake, color: '#e74c3c' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: 12, textAlign: 'center',
            background: 'rgba(8,16,28,0.8)',
          }}>
            <div style={{ fontSize: 9, color: '#4a6a7a', letterSpacing: 1.2, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Trend */}
      {progress && progress.totalSessions > 1 && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 10,
          background: 'rgba(74,200,255,0.05)', border: '1px solid rgba(74,200,255,0.15)',
        }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: '#4a8aba', fontWeight: 700, marginBottom: 4 }}>
            HISTORICAL TREND
          </div>
          <div style={{ fontSize: 12, color: '#c0d0e0' }}>
            Sessions: <b>{progress.totalSessions}</b>
            {' · '}Recent avg: <b style={{ color: '#d4af37' }}>{Math.round(progress.currentAccuracy * 100)}%</b>
            {progress.trend !== 0 && (
              <span style={{
                marginLeft: 6,
                color: progress.trend > 0 ? '#27ae60' : '#e74c3c',
                fontWeight: 700,
              }}>
                {progress.trend > 0 ? '▲' : '▼'} {Math.abs(Math.round(progress.trend * 100))}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onRetry} style={{
          flex: 1, padding: '12px', borderRadius: 10,
          background: 'linear-gradient(135deg, #1a5a30, #27ae60)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontWeight: 800, fontSize: 13, letterSpacing: 1,
        }}>RETRY</button>
        <button onClick={onHome} style={{
          flex: 1, padding: '12px', borderRadius: 10,
          background: 'rgba(20,28,42,0.8)', border: '1px solid rgba(74,200,255,0.2)',
          color: '#8a9aaa', cursor: 'pointer',
          fontWeight: 700, fontSize: 13, letterSpacing: 1,
        }}>HOME</button>
      </div>
    </div>
  );
}
