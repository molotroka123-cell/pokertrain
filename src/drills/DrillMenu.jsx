// DrillMenu.jsx — Drill selection screen
import React from 'react';

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
];

export default function DrillMenu({ onSelect, onBack }) {
  return (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffd700' }}>Training Drills</div>
        <button onClick={onBack} style={{
          padding: '6px 14px', background: '#1a2840', border: '1px solid #2a3a4a',
          borderRadius: '6px', color: '#8899aa', fontSize: '12px', cursor: 'pointer',
        }}>Back</button>
      </div>

      {DRILLS.map(d => (
        <div key={d.id} onClick={() => onSelect(d.id)} style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px', background: d.isNew ? '#1a0a10' : '#111820',
          border: d.isNew ? '2px solid #ff4444' : '1px solid #1e2a3a',
          borderRadius: '12px', marginBottom: '10px', cursor: 'pointer',
          transition: 'border-color 0.2s', position: 'relative',
          boxShadow: d.isNew ? '0 0 16px rgba(255,68,68,0.15)' : 'none',
        }}>
          {d.isNew && <div style={{
            position: 'absolute', top: '-6px', right: '10px',
            background: '#ff4444', color: '#fff', fontSize: '9px', fontWeight: 800,
            padding: '2px 8px', borderRadius: '6px', letterSpacing: '1px',
          }}>NEW</div>}
          <div style={{ fontSize: '28px', width: '42px', textAlign: 'center' }}>{d.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: d.color }}>{d.name}</div>
            <div style={{ fontSize: '12px', color: '#6b7b8d', marginTop: '2px' }}>{d.desc}</div>
          </div>
          <div style={{ color: d.isNew ? '#ff4444' : '#2a3a4a', fontSize: '18px' }}>›</div>
        </div>
      ))}
    </div>
  );
}
