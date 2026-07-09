// CardV2.jsx — IceCrown Engine 2.0: premium playing card with 3D flip reveal.
// Transform/opacity only — GPU-composited, no layout thrash.
// Assumes GlobalStyles.jsx registers the `ic-glow-win` keyframe globally.
import React, { useState, useEffect } from 'react';
import { GRAD, SH, EASE, DUR } from '../ui/tokens.js';

const SUIT_SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_DISP = { T: '10' };

const RED = '#e04444';
const BLACK = '#1c2430';

const SIZES = {
  sm:   { w: 30, h: 42, r: 6, rank: 9,  pip: 7,  center: 15, pad: 2 },
  md:   { w: 44, h: 62, r: 7, rank: 13, pip: 10, center: 22, pad: 3 },
  lg:   { w: 52, h: 74, r: 7, rank: 15, pip: 11, center: 26, pad: 4 },
  hero: { w: 60, h: 86, r: 8, rank: 17, pip: 13, center: 30, pad: 4 },
};

export default function Card({
  card = null,
  faceDown = false,
  size = 'md',
  delay = 0,
  winner = false,
  dimmed = false,
}) {
  const S = SIZES[size] || SIZES.md;
  // 'hidden' → drop-in entrance; 'in' → settled + flipped to face (unless faceDown)
  const [phase, setPhase] = useState('hidden');

  useEffect(() => {
    setPhase('hidden');
    const t = setTimeout(() => setPhase('in'), Math.max(0, delay) + 30);
    return () => clearTimeout(t);
  }, [card, delay]);

  const hasFace = !!card && card !== 'Xx' && !faceDown;
  const showFace = hasFace && phase === 'in';

  const rank = card ? String(card)[0] : '';
  const suit = card ? String(card)[1] : '';
  const isRed = suit === 'h' || suit === 'd';
  const clr = isRed ? RED : BLACK;
  const sym = SUIT_SYM[suit] || '';
  const disp = RANK_DISP[rank] || rank;

  const faceStyle = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    borderRadius: S.r,
    background: 'linear-gradient(165deg, #ffffff 0%, #f4f6f8 45%, #e9edf1 100%)',
    boxShadow: winner
      ? `0 0 18px rgba(232,193,90,0.55), ${SH.card}`
      : SH.card,
    border: '1px solid rgba(140,155,175,0.28)',
    overflow: 'hidden',
    animation: winner ? 'ic-glow-win 1.4s ease-in-out infinite' : 'none',
  };

  const backStyle = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    borderRadius: S.r,
    background: GRAD.cardBack,
    boxShadow: SH.card,
    border: '1px solid rgba(40,70,140,0.7)',
  };

  return (
    <div
      style={{
        width: S.w, height: S.h,
        display: 'inline-block',
        perspective: 700,
        flex: 'none',
        opacity: dimmed ? 0.35 : phase === 'hidden' ? 0 : 1,
        filter: dimmed ? 'grayscale(0.9)' : 'none',
        transform: phase === 'hidden' ? 'translateY(-16px) scale(0.7)' : 'none',
        transition: `opacity ${DUR.deal}ms ${EASE.out}, transform ${DUR.deal}ms ${EASE.spring}, filter ${DUR.base}ms ${EASE.smooth}`,
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: showFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: `transform ${DUR.deal}ms ${EASE.spring}`,
        }}
      >
        {/* ── Back ── */}
        <div style={backStyle}>
          {/* thin gold inner border + diamond lattice */}
          <div
            style={{
              position: 'absolute', inset: S.pad,
              borderRadius: Math.max(2, S.r - 3),
              border: '1px solid rgba(232,193,90,0.55)',
              background:
                'repeating-linear-gradient(45deg, rgba(232,193,90,0.13) 0px, rgba(232,193,90,0.13) 1px, transparent 1px, transparent 6px), ' +
                'repeating-linear-gradient(-45deg, rgba(232,193,90,0.13) 0px, rgba(232,193,90,0.13) 1px, transparent 1px, transparent 6px)',
            }}
          />
        </div>

        {/* ── Face ── */}
        {hasFace && (
          <div style={faceStyle}>
            {/* subtle sheen */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '42%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none',
              }}
            />
            {/* rank + suit, top-left */}
            <div style={{ position: 'absolute', top: S.pad, left: S.pad + 1, lineHeight: 1, color: clr }}>
              <div style={{ fontSize: S.rank, fontWeight: 900, letterSpacing: -0.5 }}>{disp}</div>
              <div style={{ fontSize: S.pip, marginTop: 0 }}>{sym}</div>
            </div>
            {/* big center suit glyph */}
            <div
              style={{
                position: 'absolute', top: '54%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: S.center, color: clr, opacity: 0.9, lineHeight: 1,
              }}
            >
              {sym}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
