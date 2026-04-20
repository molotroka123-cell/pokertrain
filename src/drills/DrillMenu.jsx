// DrillMenu.jsx — Drill selection with Daily Plan + NEW badges + progress
import React from 'react';
import NewBadge from '../components/NewBadge.jsx';
import { generateDailyPlan, getDrillProgress } from './dailyPlanGenerator.js';

const DRILLS = [
  { id: 'rfi', name: 'RFI Drill', desc: 'Open or fold from each position', icon: '🎯', color: '#27ae60' },
  { id: '3bet', name: '3-Bet Drill', desc: '3-bet, call, or fold vs opens', icon: '🔥', color: '#f39c12' },
  { id: 'bbdef', name: 'BB Defense', desc: 'Defend your big blind correctly', icon: '🛡', color: '#2980b9' },
  { id: 'pushfold', name: 'Push/Fold', desc: 'Nash charts for short stacks', icon: '💣', color: '#e74c3c' },
  { id: 'solverpf', name: 'Solver Push/Fold', desc: 'Nash ICM — 7 stacks, push + call, weak spots', icon: '♠', color: '#ff4444' },
  { id: 'multiway', name: 'Multiway Postflop', desc: '3-way flop decisions — check or bet?', icon: '👥', color: '#16a085', isNew: true },
  { id: 'threebetpot', name: '3-Bet Pot Lines', desc: 'IP/OOP play in 3-bet pots', icon: '⚡', color: '#8e44ad', isNew: true },
  { id: 'ahighcbet', name: 'A-high Cbet', desc: 'Automate cbet on A-high flops', icon: '🅰', color: '#1a5490', isNew: true },
  { id: 'postflop', name: 'Postflop Spots', desc: '25+ real postflop scenarios', icon: '🃏', color: '#9b59b6' },
  { id: 'sizing', name: 'Bet Sizing', desc: 'Choose optimal bet size', icon: '📏', color: '#1abc9c' },
  { id: 'potodds', name: 'Pot Odds Quiz', desc: 'Calculate pot odds + outs', icon: '🧮', color: '#3498db' },
  { id: 'river', name: 'River Decisions', desc: 'Value bet, bluff, or check/call river', icon: '🌊', color: '#e67e22' },
  { id: 'personalized', name: 'Your Weak Spots', desc: 'Drills from your actual mistakes', icon: '🔍', color: '#e74c3c' },
  { id: 'custom', name: 'Custom Drill', desc: 'Build your own: pick position, stack, street', icon: '🔧', color: '#6a8aaa' },
  { id: 'history', name: 'Progress History', desc: 'Weekly heatmap, EV trends, per-drill stats', icon: '📈', color: '#8b5cf6' },
];

export default function DrillMenu({ onSelect, onBack }) {
  const plan = generateDailyPlan();
  const progress = getDrillProgress();

  return (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto', minHeight: '100vh', background: '#050b18' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ac8ff', letterSpacing: '1px' }}>Training Drills</div>
        <button onClick={onBack} style={{
          padding: '8px 16px', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(74,200,255,0.25)',
          borderRadius: '10px', color: '#4ac8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 700,
        }}>← Back</button>
      </div>

      {/* Daily Plan recommendation */}
      {plan.drills.length > 0 && (
        <div style={{
          padding: '14px', borderRadius: '14px', marginBottom: '14px',
          background: 'linear-gradient(135deg, rgba(22,160,133,0.12), rgba(22,160,133,0.04))',
          border: '1px solid rgba(22,160,133,0.3)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a085', letterSpacing: '1.5px', marginBottom: '8px' }}>
            ⭐ RECOMMENDED FOR YOU TODAY
          </div>
          <div style={{ fontSize: '12px', color: '#8a9aaa', marginBottom: '8px' }}>{plan.recommendation}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {plan.drills.map(d => (
              <button key={d.id} onClick={() => onSelect(d.id)} style={{
                padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(22,160,133,0.4)',
                background: 'rgba(22,160,133,0.1)', color: '#16a085', fontSize: '11px', fontWeight: 700,
                cursor: 'pointer',
              }}>{d.name} ({d.duration}m)</button>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#5a6a7a', marginTop: '6px' }}>
            ~{plan.duration} min total · Focus: {plan.focusAreas.slice(0, 3).join(', ')}
          </div>
        </div>
      )}

      {/* Weekly progress */}
      {(() => {
        const totalXP = parseInt(localStorage.getItem('pokertrain_total_xp') || '0', 10);
        const totalSessions = Object.values(progress).reduce((s, p) => s + (p.sessions || 0), 0);
        return (
          <div style={{
            display: 'flex', gap: '1px', marginBottom: '14px', borderRadius: '12px', overflow: 'hidden', background: '#1a2230',
          }}>
            {[
              { label: 'SESSIONS', val: totalSessions, color: '#4ac8ff' },
              { label: 'TOTAL XP', val: totalXP, color: '#ffa020' },
              { label: 'DRILLS', val: Object.keys(progress).length + '/' + DRILLS.length, color: '#22c55e' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '10px', textAlign: 'center', background: 'rgba(8,16,28,0.8)' }}>
                <div style={{ fontSize: '8px', color: '#4a6a7a', letterSpacing: '1px', fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: s.color, marginTop: '2px' }}>{s.val}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Drill list */}
      {DRILLS.map(d => {
        const p = progress[d.id];
        return (
          <div key={d.id} onClick={() => onSelect(d.id)} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px', background: d.isNew ? 'rgba(22,160,133,0.06)' : 'rgba(8,16,28,0.8)',
            border: d.isNew ? '1px solid rgba(22,160,133,0.3)' : '1px solid rgba(74,200,255,0.1)',
            borderRadius: '14px', marginBottom: '8px', cursor: 'pointer',
            transition: 'border-color 0.2s', position: 'relative',
          }}>
            {d.isNew && <NewBadge size="sm" variant="pulse" />}
            <div style={{ fontSize: '28px', width: '42px', textAlign: 'center' }}>{d.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: d.color }}>{d.name}</div>
              <div style={{ fontSize: '11px', color: '#5a6a7a', marginTop: '2px' }}>{d.desc}</div>
              {p && (
                <div style={{ fontSize: '9px', color: '#4a6a7a', marginTop: '3px' }}>
                  Best: <span style={{ color: p.bestPct >= 80 ? '#22c55e' : p.bestPct >= 60 ? '#ffa020' : '#e74c3c', fontWeight: 700 }}>{p.bestPct}%</span>
                  {' · '}{p.sessions} plays{' · '}{p.xpEarned} XP
                </div>
              )}
            </div>
            <div style={{ color: '#3a5a6a', fontSize: '18px' }}>›</div>
          </div>
        );
      })}
    </div>
  );
}
