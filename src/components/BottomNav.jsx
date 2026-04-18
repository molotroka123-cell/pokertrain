// BottomNav.jsx — Bottom navigation bar (ICECROWN style)
import React from 'react';

const TABS = [
  { id: 'lobby', icon: '⌂', label: 'Lobby' },
  { id: 'stats', icon: '▥', label: 'Stats' },
  { id: 'table', icon: '◉', label: 'Table' },
  { id: 'notes', icon: '☰', label: 'Notes' },
  { id: 'menu', icon: '⋯', label: 'Menu' },
];

export default function BottomNav({ active = 'table', onTab, isIcecrown }) {
  if (!isIcecrown) return null;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '6px 0 max(6px, env(safe-area-inset-bottom, 6px))',
      background: 'linear-gradient(180deg, #0a0e18, #060810)',
      borderTop: '1px solid rgba(74,200,255,0.12)',
      flexShrink: 0,
    }}>
      {TABS.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => onTab && onTab(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 12px', position: 'relative',
            color: isActive ? '#4ac8ff' : '#3a4a5a',
            transition: 'color 0.2s',
          }}>
            {isActive && (
              <div style={{
                position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)',
                width: '24px', height: '2px', borderRadius: '1px',
                background: '#4ac8ff', boxShadow: '0 0 8px rgba(74,200,255,0.5)',
              }} />
            )}
            <span style={{
              fontSize: '18px', lineHeight: 1,
              filter: isActive ? 'drop-shadow(0 0 6px rgba(74,200,255,0.5))' : 'none',
            }}>{t.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
