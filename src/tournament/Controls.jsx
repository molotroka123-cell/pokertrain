// Controls.jsx — Casino-style action buttons
import React, { useState, useEffect } from 'react';

const BTN = {
  base: {
    padding: '15px 0', borderRadius: '16px', border: 'none',
    fontWeight: 800, fontSize: '14px', letterSpacing: '1.5px',
    textTransform: 'uppercase', flex: 1, margin: '0 4px',
    color: '#fff', position: 'relative', overflow: 'hidden',
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
};

export default function Controls({ canCheck, canCall, toCall, pot, myChips, minRaise, maxRaise, onAction, disabled }) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise || 0);
  const [showRaise, setShowRaise] = useState(false);

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

  const presets = [
    { label: '50%', val: Math.floor(pot * 0.5) },
    { label: '67%', val: Math.floor(pot * 0.67) },
    { label: 'Pot', val: pot },
    { label: 'All-In', val: myChips },
  ].filter(p => p.val >= (minRaise || 0) && p.val <= myChips);

  const fillPct = maxRaise > (minRaise || 0)
    ? ((raiseAmount - (minRaise || 0)) / (maxRaise - (minRaise || 0))) * 100
    : 50;

  return (
    <div>
      {/* Raise panel */}
      {showRaise && (
        <div style={{
          padding: '12px 16px', background: 'linear-gradient(180deg, #0d1118, #111820)',
          borderTop: '1px solid #1a2230',
          animation: 'raiseSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '10px', color: '#5a6a7a', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Raise to
          </div>
          <div style={{
            fontSize: '28px', fontWeight: 900, textAlign: 'center', margin: '4px 0 10px',
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
            style={{ '--fill': fillPct + '%' }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            {presets.map((p) => (
              <button key={p.label} className="btn-preset" onClick={() => setRaiseAmount(p.val)} style={{
                flex: 1, padding: '8px 4px', borderRadius: '10px',
                border: '1px solid #2a3a4a', background: '#0d1118',
                color: '#8899aa', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', padding: '10px 8px 14px',
        background: 'linear-gradient(180deg, #0a0d12, #060810)',
        borderTop: '1px solid #1a2230',
      }}>
        <button className="btn-action" onClick={() => { onAction('fold'); setShowRaise(false); }}
          style={{ ...BTN.base, ...BTN.fold }}>Fold</button>

        {canCheck ? (
          <button className="btn-action" onClick={() => { onAction('check'); setShowRaise(false); }}
            style={{ ...BTN.base, ...BTN.check }}>Check</button>
        ) : canCall ? (
          <button className="btn-action" onClick={() => { onAction('call'); setShowRaise(false); }}
            style={{ ...BTN.base, ...BTN.call }}>
            Call {toCall > 0 ? toCall.toLocaleString() : ''}
          </button>
        ) : null}

        <button className="btn-action" onClick={handleRaise}
          style={{ ...BTN.base, ...BTN.raise }}>
          {showRaise ? 'Confirm' : myChips <= (minRaise || 0) ? 'All-In' : 'Raise'}
        </button>
      </div>
    </div>
  );
}
