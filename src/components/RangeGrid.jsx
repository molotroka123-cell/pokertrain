// RangeGrid.jsx — 13x13 GTO range visualizer
import React from 'react';
import { HAND_GRID, POSITION_THRESHOLDS, THREEBET_THRESHOLDS, RANKS_ORDER } from '../engine/ranges.js';

const CELL_SIZE = 22;

export default function RangeGrid({ position, heroCards, facingRaise = false, onClose }) {
  const threshold = facingRaise
    ? THREEBET_THRESHOLDS[position] || 0.12
    : POSITION_THRESHOLDS[position] || 0.30;

  // For facing raise: also show calling range (open range minus 3-bet range)
  const callThreshold = facingRaise ? POSITION_THRESHOLDS[position] || 0.30 : null;

  // Find hero's hand on the grid
  let heroR1 = -1, heroR2 = -1, heroSuited = false;
  if (heroCards?.length === 2) {
    const r1 = RANKS_ORDER.indexOf(heroCards[0][0]);
    const r2 = RANKS_ORDER.indexOf(heroCards[1][0]);
    heroSuited = heroCards[0][1] === heroCards[1][1];
    if (r1 === r2) { heroR1 = r1; heroR2 = r2; }
    else if (heroSuited) { heroR1 = Math.min(r1, r2); heroR2 = Math.max(r1, r2); }
    else { heroR1 = Math.max(r1, r2); heroR2 = Math.min(r1, r2); }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0d1118', borderRadius: '16px', padding: '16px',
        border: '1px solid #1a2230', maxWidth: '360px', width: '90%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffd700' }}>
              {position} — {facingRaise ? '3-Bet / Call' : 'Open Range'}
            </div>
            <div style={{ fontSize: '11px', color: '#5a6a7a' }}>
              {facingRaise ? 'Green=3bet, Yellow=call, Red=fold' : 'Green=raise, Red=fold'}
            </div>
          </div>
          <div onClick={onClose} style={{
            width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
            background: '#1a2230', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b7b8d', fontSize: '14px', fontWeight: 700,
          }}>X</div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(13, ${CELL_SIZE}px)`, gap: '1px', justifyContent: 'center' }}>
          {RANKS_ORDER.map((r1, row) =>
            RANKS_ORDER.map((r2, col) => {
              const val = HAND_GRID[row][col];
              const isPair = row === col;
              const isSuited = row < col;
              const label = isPair ? r1 + r2 : isSuited ? r1 + r2 + 's' : r2 + r1 + 'o';

              let bg;
              if (facingRaise) {
                bg = val <= threshold ? '#1a6a3a' : // 3-bet (green)
                     val <= callThreshold ? '#6a5a10' : // call (yellow)
                     '#3a1515'; // fold (red)
              } else {
                bg = val <= threshold ? '#1a6a3a' : '#3a1515';
              }

              const isHero = row === heroR1 && col === heroR2;

              return (
                <div key={`${row}-${col}`} style={{
                  width: CELL_SIZE, height: CELL_SIZE,
                  background: bg, borderRadius: '2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '7px', fontWeight: 600,
                  color: isHero ? '#fff' : '#8a9aaa',
                  border: isHero ? '2px solid #ffd700' : 'none',
                  boxShadow: isHero ? '0 0 8px rgba(255,215,0,0.5)' : 'none',
                }}>
                  {label}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px', fontSize: '10px' }}>
          <span style={{ color: '#27ae60' }}>■ {facingRaise ? '3-Bet' : 'Raise'}</span>
          {facingRaise && <span style={{ color: '#d4af37' }}>■ Call</span>}
          <span style={{ color: '#e74c3c' }}>■ Fold</span>
          {heroCards && <span style={{ color: '#ffd700' }}>□ Your hand</span>}
        </div>
      </div>
    </div>
  );
}
