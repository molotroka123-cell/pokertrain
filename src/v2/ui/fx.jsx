// fx.jsx — IceCrown Engine 2.0 ambient & celebration effects.
// Requires <GlobalStyles/> mounted once for ic-* keyframes.
// All effects are pointer-transparent and animate transform/opacity only.
import React from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from './tokens.js';

/* ─── Confetti ───
 * Renders a burst of 40-60 falling particles when `burst` is truthy.
 * Re-keying by `burst` value restarts the shower; particles auto-clean
 * after the longest fall completes. */
const CONFETTI_LIFETIME = 4000;

export function Confetti({ burst }) {
  const [alive, setAlive] = React.useState(false);

  React.useEffect(() => {
    if (!burst) {
      setAlive(false);
      return undefined;
    }
    setAlive(true);
    const t = setTimeout(() => setAlive(false), CONFETTI_LIFETIME);
    return () => clearTimeout(t);
  }, [burst]);

  const parts = React.useMemo(() => {
    if (!burst) return [];
    const colors = [C.gold, C.goldHi, C.green, C.cyan];
    const n = 40 + Math.floor(Math.random() * 21); // 40-60
    return Array.from({ length: n }, (_, i) => {
      const round = Math.random() < 0.4;
      const s = 5 + Math.random() * 5;
      return {
        id: i,
        left: Math.random() * 100,
        w: round ? s : 4 + Math.random() * 4,
        h: round ? s : 8 + Math.random() * 7,
        color: colors[i % colors.length],
        round,
        delay: Math.random() * 550,
        dur: 2200 + Math.random() * 1200,
        drift: (Math.random() - 0.5) * 260,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
      };
    });
  }, [burst]);

  if (!burst || !alive) return null;

  return (
    <div
      key={String(burst)}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: Z.fx,
      }}
    >
      {parts.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            willChange: 'transform, opacity',
            '--ic-drift': `${p.drift}px`,
            '--ic-spin': `${p.spin}deg`,
            animation: `ic-confetti-fall ${p.dur}ms ${EASE.in} ${p.delay}ms both`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── FloatingText ───
 * Floating reward texts ("+50 XP") that rise and fade out.
 * items: [{ id, text, color, x, y }] — x/y position within the parent
 * (parent should be position:relative). */
export function FloatingText({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: Z.fx,
        overflow: 'hidden',
      }}
    >
      {items.map((it) => (
        <span
          key={it.id}
          style={{
            position: 'absolute',
            left: it.x,
            top: it.y,
            transform: 'translateX(-50%)',
          }}
        >
          <span
            className="ic-num"
            style={{
              display: 'inline-block',
              fontFamily: F.family,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              color: it.color || C.gold,
              textShadow: '0 2px 8px rgba(0,0,0,0.65)',
              willChange: 'transform, opacity',
              '--ic-fly-x': '0px',
              '--ic-fly-y': '-72px',
              '--ic-fly-scale': '1.15',
              animation: `ic-chip-fly 1100ms ${EASE.out} both`,
            }}
          >
            {it.text}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ─── GlowOrb ───
 * Soft radial ambient orb for scene backgrounds. Position via `style`
 * (parent should be position:relative or the orb given fixed coords). */
export function GlowOrb({ color, size = 280, style }) {
  const cc = color || C.gold;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${cc}2e 0%, ${cc}14 38%, rgba(0,0,0,0) 70%)`,
        pointerEvents: 'none',
        willChange: 'transform',
        animation: `ic-float 7s ${EASE.smooth} infinite`,
        ...style,
      }}
    />
  );
}

/* ─── Sparkle ───
 * Tiny star twinkle — position/tune via `style` (top/left/fontSize/animationDelay). */
export function Sparkle({ style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        color: C.goldHi,
        fontSize: 10,
        lineHeight: 1,
        textShadow: `0 0 6px ${C.gold}, 0 0 14px ${C.gold}66`,
        pointerEvents: 'none',
        animation: `ic-fade-in 950ms ${EASE.smooth} infinite alternate both`,
        ...style,
      }}
    >
      ✦
    </span>
  );
}
