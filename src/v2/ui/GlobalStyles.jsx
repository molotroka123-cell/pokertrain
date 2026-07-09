// GlobalStyles.jsx — IceCrown Engine 2.0 keyframe & utility injector.
// Injects a single <style id="ic-global-styles"> tag into document.head (idempotent).
// All animations are transform/opacity driven (plus box-shadow for glow pulses) for 60fps.
import React, { useEffect } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from './tokens.js';

const STYLE_ID = 'ic-global-styles';

const CSS = `
/* ─── IceCrown v2 keyframes ─── */
@keyframes ic-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ic-slide-up {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ic-slide-in-right {
  from { opacity: 0; transform: translateX(52px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ic-slide-out-left {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-52px); }
}
@keyframes ic-pop {
  0%   { opacity: 0; transform: scale(0.45); }
  55%  { opacity: 1; transform: scale(1.08); }
  80%  { transform: scale(0.985); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ic-pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232,193,90,0), 0 0 12px rgba(232,193,90,0.18); }
  50%      { box-shadow: 0 0 0 3px rgba(232,193,90,0.10), 0 0 26px rgba(232,193,90,0.42); }
}
@keyframes ic-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -120% 0; }
}
@keyframes ic-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}
@keyframes ic-card-flip {
  0%   { transform: perspective(700px) rotateY(92deg); opacity: 0.4; }
  55%  { transform: perspective(700px) rotateY(-8deg); opacity: 1; }
  100% { transform: perspective(700px) rotateY(0deg); opacity: 1; }
}
@keyframes ic-chip-fly {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: translate(var(--ic-fly-x, 0px), var(--ic-fly-y, -64px)) scale(var(--ic-fly-scale, 0.55)); opacity: 0; }
}
@keyframes ic-ring-dash {
  from { stroke-dashoffset: var(--ic-ring-circ, 264); }
}
@keyframes ic-confetti-fall {
  0%   { transform: translate3d(0, -6vh, 0) rotate(0deg); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translate3d(var(--ic-drift, 0px), 106vh, 0) rotate(var(--ic-spin, 640deg)); opacity: 0; }
}
@keyframes ic-turn-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(232,193,90,0.35); }
  50%      { transform: scale(1.035); box-shadow: 0 0 0 7px rgba(232,193,90,0); }
}
@keyframes ic-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-7px); }
  30% { transform: translateX(6px); }
  45% { transform: translateX(-5px); }
  60% { transform: translateX(4px); }
  75% { transform: translateX(-2px); }
  90% { transform: translateX(1px); }
}
@keyframes ic-glow-win {
  0%   { box-shadow: 0 0 0 0 rgba(232,193,90,0); }
  30%  { box-shadow: 0 0 34px 6px rgba(232,193,90,0.55); }
  100% { box-shadow: 0 0 16px 2px rgba(232,193,90,0.28); }
}

/* ─── Utility classes ─── */
.ic-press {
  transition: transform ${DUR.fast}ms ${EASE.out};
  -webkit-tap-highlight-color: transparent;
}
.ic-press:active { transform: scale(0.96); }

.ic-hover-lift {
  transition: transform ${DUR.base}ms ${EASE.out}, box-shadow ${DUR.base}ms ${EASE.out};
}
.ic-hover-lift:hover { transform: translateY(-2px); box-shadow: ${SH.pop}; }
.ic-hover-lift:active { transform: translateY(0) scale(0.98); }

.ic-glass {
  background: ${C.surface};
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
}

.ic-num { font-variant-numeric: tabular-nums; }

/* gradient sweep on hover — used by gold Btn */
.ic-shimmer-hover { position: relative; overflow: hidden; isolation: isolate; }
.ic-shimmer-hover::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, rgba(255,255,255,0) 32%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0) 68%);
  background-size: 240% 100%;
  background-position: 200% 0;
  opacity: 0;
  transition: opacity ${DUR.base}ms ${EASE.smooth};
  pointer-events: none;
}
.ic-shimmer-hover:hover::after {
  opacity: 1;
  animation: ic-shimmer 1200ms ${EASE.smooth} infinite;
}

/* ─── Scrollbars ─── */
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: ${C.lineHi}; border-radius: ${R.pill}px; }
*::-webkit-scrollbar-thumb:hover { background: rgba(120,160,220,0.35); }
*::-webkit-scrollbar-corner { background: transparent; }
`;

export default function GlobalStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return; // idempotent
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
    // intentionally NOT removed on unmount — styles are global and other
    // v2 surfaces may still be mounted; the id check keeps it single.
  }, []);
  return null;
}
