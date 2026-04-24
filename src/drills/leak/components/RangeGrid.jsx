// RangeGrid.jsx — 13×13 hand range visualizer (spec-compliant)
// Separate from src/components/RangeGrid.jsx — uses frequency-per-hand format
// Format: { 'AA': { raise: 1.0 }, 'AKo': { raise: 0.7, call: 0.3 } }
import React from 'react';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const ACTION_COLORS = {
  raise:  '#e74c3c',
  bet:    '#e67e22',
  call:   '#27ae60',
  fold:   '#2c3440',
  '3bet': '#8e44ad',
  '4bet': '#7d3c98',
  '5bet': '#6c3483',
  shove:  '#ff7043',
  limp:   '#f1c40f',
  check:  '#7f8c8d',
};

const ACTION_LABELS = {
  raise: 'Raise', bet: 'Bet', call: 'Call', fold: 'Fold',
  '3bet': '3-Bet', '4bet': '4-Bet', '5bet': '5-Bet',
  shove: 'All-in', limp: 'Limp', check: 'Check',
};

function handName(row, col) {
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return r1 + r2;
  if (row < col) return r1 + r2 + 's';
  return r2 + r1 + 'o';
}

// Convert hero cards ("AcKd") to grid hand notation ("AKo")
export function cardsToHand(cardsStr) {
  if (!cardsStr || cardsStr.length < 4) return null;
  const c1 = cardsStr.slice(0, 2);
  const c2 = cardsStr.slice(2, 4);
  const r1 = c1[0], s1 = c1[1];
  const r2 = c2[0], s2 = c2[1];
  if (r1 === r2) return r1 + r2;
  const [hi, lo] = RANKS.indexOf(r1) < RANKS.indexOf(r2) ? [r1, r2] : [r2, r1];
  return hi + lo + (s1 === s2 ? 's' : 'o');
}

function Cell({ hand, frequencies, selected, size }) {
  const entries = Object.entries(frequencies || {}).filter(([, f]) => f > 0);
  if (entries.length === 0) entries.push(['fold', 1.0]);

  let background;
  if (entries.length === 1) {
    background = ACTION_COLORS[entries[0][0]] || ACTION_COLORS.fold;
  } else {
    let offset = 0;
    const stops = [];
    entries.forEach(([act, freq]) => {
      const color = ACTION_COLORS[act] || '#555';
      stops.push(`${color} ${offset * 100}%`, `${color} ${(offset + freq) * 100}%`);
      offset += freq;
    });
    background = `linear-gradient(to right, ${stops.join(', ')})`;
  }

  const fontSizeMap = { small: 7, medium: 9, large: 12 };
  const dominant = entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  const textColor = dominant === 'fold' ? '#8a9aaa' : '#fff';

  return (
    <div style={{
      background, color: textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fontSizeMap[size] || 9, fontWeight: 700,
      border: selected ? '2px solid #d4af37' : '1px solid rgba(0,0,0,0.3)',
      boxShadow: selected ? '0 0 6px rgba(212,175,55,0.9)' : 'none',
      borderRadius: 2, userSelect: 'none',
      aspectRatio: '1',
    }}>
      {hand}
    </div>
  );
}

export default function RangeGrid({ range = {}, selected, size = 'medium', title, showLegend = true }) {
  const actionsPresent = new Set();
  Object.values(range).forEach(f => {
    Object.keys(f || {}).forEach(k => { if (f[k] > 0) actionsPresent.add(k); });
  });

  const widthMap = { small: 200, medium: 280, large: 420 };
  const width = widthMap[size] || 280;

  return (
    <div style={{ display: 'inline-block' }}>
      {title && (
        <div style={{
          fontSize: 10, color: '#d4af37', letterSpacing: 1, fontWeight: 700,
          marginBottom: 4,
        }}>
          {title}
        </div>
      )}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)',
        gap: 1, background: 'rgba(8,14,22,0.8)', padding: 2,
        width, borderRadius: 4,
      }}>
        {RANKS.map((_, row) =>
          RANKS.map((_, col) => {
            const hand = handName(row, col);
            return (
              <Cell
                key={hand}
                hand={hand}
                frequencies={range[hand]}
                selected={selected === hand}
                size={size}
              />
            );
          })
        )}
      </div>
      {showLegend && actionsPresent.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {Array.from(actionsPresent).map(a => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                background: ACTION_COLORS[a] || '#555',
              }} />
              <span style={{ color: '#8a9aaa' }}>{ACTION_LABELS[a] || a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
