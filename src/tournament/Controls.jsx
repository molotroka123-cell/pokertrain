// Controls.jsx — Premium action buttons (Fold / Call / Raise)
import React, { useState, useEffect } from 'react';

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(0) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function Controls({ canCheck, canCall, toCall, pot, myChips, minRaise, maxRaise, onAction, disabled, bigBlind, theme }) {
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

  const currentBet = toCall || 0;
  const threeBet = Math.min(currentBet * 3 || bb * 7, myChips);
  const fourBet = Math.min(currentBet * 2.5 || bb * 20, myChips);

  const presets = [
    { label: '3-Bet', val: Math.floor(threeBet), show: currentBet > 0 && currentBet <= bb * 5 },
    { label: '4-Bet', val: Math.floor(fourBet), show: currentBet > bb * 5 && currentBet <= bb * 20 },
    { label: '5-Bet', val: Math.min(Math.floor(currentBet * 2.5), myChips), show: currentBet > bb * 20 },
    { label: '2.5x', val: Math.floor(currentBet * 2.5), show: currentBet > 0 && currentBet <= bb * 5 },
    { label: '50%', val: Math.floor(pot * 0.5), show: true },
    { label: '75%', val: Math.floor(pot * 0.75), show: true },
    { label: 'Pot', val: pot, show: true },
    { label: 'ALL IN', val: myChips, show: true },
  ].filter(p => p.show && p.val >= (minRaise || 0) && p.val <= myChips);

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

  // Theme-aware Call button color
  const callBg = theme?.callBtnBg || 'linear-gradient(160deg, #0d3020, #1a5c3a, #0d3020)';

  return (
    <div style={{
      touchAction: 'manipulation',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* Raise panel */}
      {showRaise && (
        <div style={{
          padding: '10px 14px', background: 'linear-gradient(180deg, #0d1118, #111820)',
          borderTop: '1px solid #1a2230',
          animation: 'raiseSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: '9px', color: '#5a6a7a', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Raise to
          </div>
          <div style={{
            fontSize: '28px', fontWeight: 900, textAlign: 'center', margin: '2px 0 8px',
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
            style={{ '--fill': fillPct + '%', width: '100%', margin: '4px 0', height: '32px' }}
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: uniquePresets.length <= 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            gap: '5px', marginTop: '8px',
          }}>
            {uniquePresets.map((p) => (
              <button key={p.label} className="btn-preset" onClick={() => setRaiseAmount(p.val)} style={{
                padding: '10px 2px', borderRadius: '10px', minHeight: '44px',
                border: `1px solid ${p.label === 'ALL IN' ? '#c0392b55' : p.label === '3-Bet' || p.label === '4-Bet' ? '#d4af3755' : '#2a3a4a'}`,
                background: p.label === 'ALL IN' ? '#1a0a0a' : p.label === '3-Bet' || p.label === '4-Bet' ? '#1a1a08' : '#0d1118',
                color: p.label === 'ALL IN' ? '#ff6050' : p.label === '3-Bet' || p.label === '4-Bet' ? '#d4af37' : '#8899aa',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}>
                <div>{p.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>{fmt(p.val)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — pill style like PokerStars mobile */}
      <div style={{
        display: 'flex', padding: '6px 10px 10px', gap: '8px',
        background: 'linear-gradient(180deg, #080c12, #040608)',
        borderTop: '1px solid #141a22',
      }}>
        {/* Fold — muted, pill shape */}
        <button className="btn-action" onClick={() => { onAction('fold'); setShowRaise(false); }}
          style={{
            padding: '14px 0', borderRadius: '24px', border: '1px solid #2a2020',
            fontWeight: 800, fontSize: '13px', letterSpacing: '1px',
            textTransform: 'uppercase', flex: 0.7, minHeight: '50px',
            color: '#8a6060', cursor: 'pointer',
            background: 'linear-gradient(180deg, #1a1214, #120c0e)',
          }}>FOLD</button>

        {/* Check or Call — primary action, biggest */}
        {canCheck ? (
          <button className="btn-action" onClick={() => { onAction('check'); setShowRaise(false); }}
            style={{
              padding: '14px 0', borderRadius: '24px', border: '1px solid #1a3040',
              fontWeight: 800, fontSize: '14px', letterSpacing: '1px',
              textTransform: 'uppercase', flex: 1.5, minHeight: '50px',
              color: '#e0e0e0', cursor: 'pointer',
              background: 'linear-gradient(180deg, #14283a, #0c1a28)',
              boxShadow: '0 2px 12px rgba(20,80,130,0.2)',
            }}>CHECK</button>
        ) : canCall ? (
          <button className="btn-action" onClick={() => { onAction('call'); setShowRaise(false); }}
            style={{
              padding: '10px 0', borderRadius: '24px', border: '1px solid #1a4030',
              fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px',
              textTransform: 'uppercase', flex: 1.5, minHeight: '50px',
              color: '#fff', cursor: 'pointer',
              background: callBg,
              boxShadow: '0 2px 16px rgba(30,100,60,0.25)',
            }}>
            <div style={{ fontSize: '14px' }}>CALL</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '1px', fontWeight: 600 }}>{fmt(toCall)}</div>
          </button>
        ) : null}

        {/* Raise or All-In — accent colored */}
        {isAllIn ? (
          <button className="btn-action" onClick={() => { onAction('raise', myChips); setShowRaise(false); }}
            style={{
              padding: '10px 0', borderRadius: '24px',
              border: '1.5px solid #c03030',
              fontWeight: 800, fontSize: '13px', letterSpacing: '1px',
              textTransform: 'uppercase', flex: 0.8, minHeight: '50px',
              color: '#ff4040', cursor: 'pointer',
              background: 'linear-gradient(180deg, #1a0808, #0e0404)',
              boxShadow: '0 0 16px rgba(200,40,40,0.2)',
              animation: 'pulse 1.5s infinite',
            }}>
            <div>ALL IN</div>
            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '1px' }}>{fmt(myChips)}</div>
          </button>
        ) : (
          <button className="btn-action" onClick={handleRaise}
            style={{
              padding: '14px 0', borderRadius: '24px', border: '1px solid #4a3a10',
              fontWeight: 800, fontSize: '13px', letterSpacing: '1px',
              textTransform: 'uppercase', flex: 0.8, minHeight: '50px',
              color: showRaise ? '#0a0800' : '#d4af37', cursor: 'pointer',
              background: showRaise
                ? 'linear-gradient(180deg, #d4af37, #a08020)'
                : 'linear-gradient(180deg, #1a1608, #100e04)',
              boxShadow: showRaise ? '0 2px 16px rgba(212,175,55,0.3)' : 'none',
            }}>
            {showRaise ? 'CONFIRM' : 'RAISE'}
          </button>
        )}
      </div>
    </div>
  );
}
