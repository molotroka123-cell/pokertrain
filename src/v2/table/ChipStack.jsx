// ChipStack.jsx — IceCrown Engine 2.0: poker chip stack with fly-to-pot animation.
// x/y are percentage coords inside the table container (absolute positioning,
// translate(-50%,-50%) centering). When `flying` is true the stack glides to
// the table center via transform+opacity only (DUR.slow, EASE.out).
import React, { useState, useEffect, useRef } from 'react';
import { C, F, EASE, DUR, Z } from '../ui/tokens.js';
import { TABLE_CENTER } from './seatLayout.js';

const DISC = 18;      // chip diameter px
const STEP = 4;       // vertical offset per stacked chip px

// Chip color tier by magnitude
function chipColors(amount) {
  if (amount < 500)   return { hi: '#8ba7c4', base: '#5b7a9d', lo: '#33475e' }; // grey-blue
  if (amount < 2000)  return { hi: '#5fe09a', base: C.green,   lo: C.greenDeep }; // green
  if (amount < 10000) return { hi: '#c49bff', base: C.purple,  lo: '#5c2ea8' }; // purple
  return               { hi: C.goldHi,  base: C.gold,    lo: C.goldDeep }; // gold
}

function formatAmount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString('en-US');
}

export default function ChipStack({ amount = 0, x = 50, y = 50, flying = false, delay = 0 }) {
  const ref = useRef(null);
  // Pixel delta from this stack to the table center, measured from the
  // positioned ancestor so the flight is a pure transform (no left/top thrash).
  const [flyDelta, setFlyDelta] = useState(null);

  useEffect(() => {
    if (flying && ref.current) {
      const parent = ref.current.offsetParent;
      if (parent) {
        setFlyDelta({
          dx: ((TABLE_CENTER.x - x) / 100) * parent.clientWidth,
          dy: ((TABLE_CENTER.y - y) / 100) * parent.clientHeight,
        });
        return;
      }
    }
    setFlyDelta(null);
  }, [flying, x, y]);

  if (!amount || amount <= 0) return null;

  const colors = chipColors(amount);
  // 1..5 discs, scaled by order of magnitude of the amount
  const discs = Math.min(5, Math.max(1, Math.floor(Math.log10(Math.max(1, amount)))));
  const inFlight = flying && flyDelta;

  const transform = inFlight
    ? `translate(-50%, -50%) translate(${flyDelta.dx}px, ${flyDelta.dy}px) scale(0.5)`
    : 'translate(-50%, -50%)';

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform,
        opacity: inFlight ? 0 : 1,
        transition: `transform ${DUR.slow}ms ${EASE.out}, opacity ${DUR.slow}ms ${EASE.in}`,
        transitionDelay: `${Math.max(0, delay)}ms`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        zIndex: Z.chips,
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    >
      {/* stacked chip discs */}
      <div style={{ position: 'relative', width: DISC, height: DISC + (discs - 1) * STEP }}>
        {Array.from({ length: discs }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              bottom: i * STEP,
              width: DISC,
              height: DISC,
              borderRadius: '50%',
              boxSizing: 'border-box',
              background: `radial-gradient(circle at 35% 30%, ${colors.hi} 0%, ${colors.base} 52%, ${colors.lo} 100%)`,
              // dashed border edge = chip stripes
              border: '2px dashed rgba(255,255,255,0.75)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      {/* amount label */}
      <div
        style={{
          ...F.num,
          fontFamily: F.family,
          fontSize: 10,
          fontWeight: 800,
          color: C.text,
          background: 'rgba(2,4,9,0.72)',
          border: `1px solid ${C.line}`,
          borderRadius: 999,
          padding: '1px 6px',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}
      >
        {formatAmount(amount)}
      </div>
    </div>
  );
}
