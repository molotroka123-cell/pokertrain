// HandLog.jsx — Hand history log with positions
import React from 'react';

const s = {
  container: {
    background: '#111820',
    borderRadius: '12px',
    padding: '12px',
    margin: '12px',
    border: '1px solid #1e2a3a',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  title: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8899aa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  entry: {
    fontSize: '12px',
    color: '#a0b0c0',
    padding: '3px 0',
    borderBottom: '1px solid #0d1118',
    lineHeight: 1.4,
  },
  action: (type) => ({
    fontWeight: 600,
    color: type === 'fold' ? '#c0392b'
      : type === 'check' ? '#2980b9'
      : type === 'call' ? '#27ae60'
      : type === 'raise' ? '#f39c12'
      : type === 'win' ? '#ffd700'
      : '#a0b0c0',
  }),
  position: {
    color: '#6b8fa3',
    fontSize: '11px',
    fontWeight: 600,
  },
  hero: {
    background: 'rgba(255, 215, 0, 0.05)',
    borderRadius: '4px',
    padding: '3px 6px',
    margin: '0 -6px',
  },
};

export default function HandLog({ entries = [] }) {
  if (entries.length === 0) return null;

  return (
    <div style={s.container}>
      <div style={s.title}>Hand Log</div>
      {entries.slice(-20).reverse().map((e, i) => (
        <div key={i} style={{ ...s.entry, ...(e.isHero ? s.hero : {}) }}>
          <span style={s.position}>[{e.position}]</span>{' '}
          <span>{e.isHero ? 'Hero' : e.name}</span>{' '}
          <span style={s.action(e.action)}>
            {e.action}{e.amount ? ` ${e.amount.toLocaleString()}` : ''}
          </span>
          {e.cards ? ` — ${e.cards}` : ''}
        </div>
      ))}
    </div>
  );
}
