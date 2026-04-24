// LeakDrillHome.jsx — Picker for the 3 leak-focused drills
import React from 'react';
import { getLeakProgress } from './engine/SessionStats.js';

const LEAKS = [
  {
    id: 'broadway_chase',
    name: 'Broadway Chase',
    desc: 'KJ/AT/AJ dominated calls vs big aggression',
    priority: '#1',
    scenarios: 12,
    color: '#e74c3c',
    icon: '♠',
  },
  {
    id: 'sb_play',
    name: 'SB Play',
    desc: 'Open, iso sizing, 3-bet, defend from Small Blind',
    priority: '#2',
    scenarios: 15,
    color: '#f39c12',
    icon: '♦',
  },
  {
    id: 'multiway_cbet',
    name: 'Multi-way Cbet',
    desc: 'Discipline in 3+ way pots — check or bet?',
    priority: '#3',
    scenarios: 10,
    color: '#27ae60',
    icon: '♣',
  },
  {
    id: 'iso_sizing',
    name: 'Iso Sizing',
    desc: 'Rule #19: 1 limper = 4x, 2 = 5x, 3 = 6x',
    priority: '#4',
    scenarios: 8,
    color: '#3498db',
    icon: '↑',
  },
  {
    id: 'push_fold_nash',
    name: 'Push/Fold Nash',
    desc: 'Short stack 10-15BB mathematical Nash ranges',
    priority: '#5',
    scenarios: 8,
    color: '#9b59b6',
    icon: '💣',
  },
  {
    id: 'bb_defend',
    name: 'BB Defend',
    desc: 'Close action with pot odds — defend wide',
    priority: '#6',
    scenarios: 8,
    color: '#1abc9c',
    icon: '🛡',
  },
];

export default function LeakDrillHome({ onSelect, onBack }) {
  return (
    <div style={{ padding: 16, maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: '#050b18' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#d4af37', letterSpacing: 1 }}>
          Leak Trainer
        </div>
        <button onClick={onBack} style={{
          padding: '8px 16px', background: 'rgba(10,20,40,0.8)',
          border: '1px solid rgba(74,200,255,0.25)', borderRadius: 10,
          color: '#4ac8ff', fontSize: 12, cursor: 'pointer', fontWeight: 700,
        }}>← Back</button>
      </div>

      <div style={{
        padding: 12, borderRadius: 12, marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.03))',
        border: '1px solid rgba(212,175,55,0.25)',
      }}>
        <div style={{ fontSize: 11, color: '#d4af37', letterSpacing: 1.2, fontWeight: 800, marginBottom: 4 }}>
          LEAK-FOCUSED TRAINING
        </div>
        <div style={{ fontSize: 12, color: '#a0b0c0', lineHeight: 1.4 }}>
          Interactive scenario drills targeting your top 3 priority leaks.
          Each scenario rates your action against GTO frequencies.
        </div>
      </div>

      {LEAKS.map(leak => {
        const progress = getLeakProgress(leak.id);
        const pct = progress ? Math.round(progress.currentAccuracy * 100) : null;

        return (
          <div key={leak.id} onClick={() => onSelect(leak.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 14, marginBottom: 10,
            background: 'rgba(10,16,28,0.8)',
            border: `1px solid ${leak.color}30`,
            borderRadius: 14, cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}>
            <div style={{
              fontSize: 28, width: 42, height: 42,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10,
              background: `${leak.color}15`,
              color: leak.color, fontWeight: 900,
            }}>{leak.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: leak.color }}>{leak.name}</div>
                <div style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 8,
                  background: `${leak.color}20`, color: leak.color,
                  fontWeight: 700, letterSpacing: 1,
                }}>{leak.priority}</div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7b8d', marginTop: 3 }}>{leak.desc}</div>
              <div style={{ fontSize: 10, color: '#4a5a6a', marginTop: 4 }}>
                {leak.scenarios} scenarios
                {progress && (
                  <>
                    {' · '}
                    <span style={{
                      color: pct >= 80 ? '#27ae60' : pct >= 60 ? '#f39c12' : '#e74c3c',
                      fontWeight: 700,
                    }}>{pct}% avg</span>
                    {' · '}{progress.totalSessions} plays
                  </>
                )}
              </div>
            </div>
            <div style={{ color: '#3a5a6a', fontSize: 18 }}>›</div>
          </div>
        );
      })}
    </div>
  );
}
