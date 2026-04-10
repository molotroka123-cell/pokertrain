// Controls.jsx — Casino-style action buttons with 3-bet/4-bet/All-in
import React, { useState, useEffect } from 'react';

const BTN = {
  base: {
    padding: '14px 0', borderRadius: '14px', border: 'none',
    fontWeight: 800, fontSize: '13px', letterSpacing: '1px',
    textTransform: 'uppercase', flex: 1, margin: '0 3px',
    color: '#fff', position: 'relative', overflow: 'hidden',
    WebkitTapHighlightColor: 'transparent', minWidth: 0,
  },
  fold: {
    background: 'linear-gradient(160deg, #1a1a1a, #2a2a2a, #1a1a1a)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  check: {
    background: 'linear-gradient(160deg, #1a2a3a, #2a4050, #1a2a3a)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  call: {
    background: 'linear-gradient(160deg, #0d3020, #1a5c3a, #0d3020)',
    boxShadow: '0 4px 16px rgba(26,92,58,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  raise: {
    background: 'linear-gradient(160deg, #5a4010, #d4af37, #8a6a15)',
    color: '#0a0a00',
    boxShadow: '0 4px 20px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  allin: {
    background: 'linear-gradient(160deg, #6a1510, #c0392b, #8a2015)',
    boxShadow: '0 4px 16px rgba(192,57,43,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
};

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(0) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function Controls({ canCheck, canCall, toCall, pot, myChips, minRaise, maxRaise, onAction, disabled, bigBlind }) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise || 0);
  const [showRaise, setShowRaise] = useState(false);

  const bb = bigBlind || 200;

  useEffect(() => {
    setRaiseAmount(minRaise || 0);
    setShowRaise(false);
  }, [minRaise, pot]);

  if (disabled) return null;

  const handleRaise = () => {
    if (!showRaise) { setShowRaise(true); return; }
    onAction('raise', raiseAmount);
    setShowRaise(false);
  };

  // Smart presets: pot-based + 3bet/4bet
  const currentBet = toCall || 0;
  const threeBet = Math.min(currentBet * 3 || bb * 7, myChips);
  const fourBet = Math.min(currentBet * 2.5 || bb * 20, myChips);

  const presets = [
    { label: '3-Bet', val: Math.floor(threeBet), show: currentBet > 0 && currentBet <= bb * 5 },
    { label: '4-Bet', val: Math.floor(fourBet), show: currentBet > bb * 5 },
    { label: '50%', val: Math.floor(pot * 0.5), show: true },
    { label: '75%', val: Math.floor(pot * 0.75), show: true },
    { label: 'Pot', val: pot, show: true },
    { label: 'ALL IN', val: myChips, show: true },
  ].filter(p => p.show && p.val >= (minRaise || 0) && p.val <= myChips);

  // Remove duplicates (same value)
  const seen = new Set();
  const uniquePresets = presets.filter(p => {
    if (seen.has(p.val)) return false;
    seen.add(p.val);
    return true;
  });

  const fillPct = maxRaise > (minRaise || 0)
    ? ((raiseAmount - (minRaise || 0)) / (maxRaise - (minRaise || 0))) * 100
    : 50;

  const isAllIn = myChips <= (minRaise || bb * 2);

  return (
    <div style={{ touchAction: 'manipulation' }}>
      {/* Raise panel */}
      {showRaise && (
        <div style={{
          padding: '10px 12px', background: 'linear-gradient(180deg, #0d1118, #111820)',
          borderTop: '1px solid #1a2230',
          animation: 'raiseSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '9px', color: '#5a6a7a', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Raise to
          </div>
          <div style={{
            fontSize: '26px', fontWeight: 900, textAlign: 'center', margin: '2px 0 8px',
            color: '#d4af37', textShadow: '0 0 20px rgba(212,175,55,0.3)',
          }}>
            {raiseAmount.toLocaleString()}
          </div>
          <input
            type="range"
            min={minRaise || 0}
            max={maxRaise || myChips}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            style={{ '--fill': fillPct + '%', width: '100%', margin: '4px 0' }}
          />
          {/* Preset grid: 3 per row on mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: uniquePresets.length <= 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            gap: '5px', marginTop: '8px',
          }}>
            {uniquePresets.map((p) => (
              <button key={p.label} className="btn-preset" onClick={() => setRaiseAmount(p.val)} style={{
                padding: '8px 2px', borderRadius: '8px',
                border: `1px solid ${p.label === 'ALL IN' ? '#c0392b55' : p.label === '3-Bet' || p.label === '4-Bet' ? '#d4af3755' : '#2a3a4a'}`,
                background: p.label === 'ALL IN' ? '#1a0a0a' : p.label === '3-Bet' || p.label === '4-Bet' ? '#1a1a08' : '#0d1118',
                color: p.label === 'ALL IN' ? '#ff6050' : p.label === '3-Bet' || p.label === '4-Bet' ? '#d4af37' : '#8899aa',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}>
                <div>{p.label}</div>
                <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '1px' }}>{fmt(p.val)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', padding: '8px 6px 12px', gap: '0px',
        background: 'linear-gradient(180deg, #0a0d12, #060810)',
        borderTop: '1px solid #1a2230',
      }}>
        {/* Fold */}
        <button className="btn-action" onClick={() => { onAction('fold'); setShowRaise(false); }}
          style={{ ...BTN.base, ...BTN.fold }}>Fold</button>

        {/* Check or Call */}
        {canCheck ? (
          <button className="btn-action" onClick={() => { onAction('check'); setShowRaise(false); }}
            style={{ ...BTN.base, ...BTN.check }}>Check</button>
        ) : canCall ? (
          <button className="btn-action" onClick={() => { onAction('call'); setShowRaise(false); }}
            style={{ ...BTN.base, ...BTN.call }}>
            <div style={{ fontSize: '13px' }}>Call</div>
            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{fmt(toCall)}</div>
          </button>
        ) : null}

        {/* Raise or All-In */}
        {isAllIn ? (
          <button className="btn-action" onClick={() => { onAction('raise', myChips); setShowRaise(false); }}
            style={{ ...BTN.base, ...BTN.allin }}>
            <div style={{ fontSize: '13px' }}>All-In</div>
            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{fmt(myChips)}</div>
          </button>
        ) : (
          <button className="btn-action" onClick={handleRaise}
            style={{ ...BTN.base, ...BTN.raise }}>
            {showRaise ? 'Confirm' : 'Raise'}
          </button>
        )}
      </div>
    </div>
  );
}
