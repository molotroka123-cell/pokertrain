// SessionShellV2.jsx — IceCrown Engine 2.0 premium session chrome.
// Wraps any running drill with live stats (accuracy, streak fire, XP counter),
// a slim animated accuracy bar, and streak milestone banners.
import React, { useEffect, useRef, useState } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js';
import { TopBar, Screen, useCountUp } from '../ui/kit.jsx';

// ─── Streak fire styling by intensity ───
function fireLook(streak) {
  if (streak >= 20) {
    return { color: '#ff5d5d', bg: 'rgba(255,93,93,0.16)', border: 'rgba(255,93,93,0.45)', glow: SH.redGlow, scale: 1.12, flames: '🔥🔥🔥' };
  }
  if (streak >= 10) {
    return { color: C.orange, bg: 'rgba(255,171,61,0.14)', border: 'rgba(255,171,61,0.4)', glow: '0 0 16px rgba(255,171,61,0.35)', scale: 1.06, flames: '🔥🔥' };
  }
  if (streak >= 5) {
    return { color: C.gold, bg: 'rgba(232,193,90,0.12)', border: 'rgba(232,193,90,0.35)', glow: SH.goldGlow, scale: 1.02, flames: '🔥' };
  }
  return { color: C.textDim, bg: C.surface, border: C.line, glow: 'none', scale: 1, flames: '🔥' };
}

const MILESTONES = [20, 10, 5];
const MILESTONE_TEXT = { 5: '🔥 ON FIRE', 10: '🔥🔥 ON FIRE — 10 STREAK', 20: '🔥🔥🔥 UNSTOPPABLE — 20 STREAK' };

const pillBase = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 10px', borderRadius: R.pill,
  fontFamily: F.family, fontSize: 11, fontWeight: 800,
  ...F.num, whiteSpace: 'nowrap',
  transition: `all ${DUR.base}ms ${EASE.out}`,
};

export default function SessionShellV2({
  title, subtitle, onBack, children,
  correct, total, streak, xp,
}) {
  const hasScore = correct != null && total != null;
  const hasStreak = streak != null;
  const hasXP = xp != null;

  const pct = hasScore && total > 0 ? Math.round((correct / total) * 100) : 0;
  const xpTick = useCountUp(hasXP ? (xp || 0) : 0, 700);
  const fire = fireLook(hasStreak ? streak : 0);

  // ── Streak milestone banner ──
  const [banner, setBanner] = useState(null);
  const prevStreak = useRef(hasStreak ? streak : 0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hasStreak) return undefined;
    const prev = prevStreak.current;
    prevStreak.current = streak;
    const crossed = MILESTONES.find(m => streak >= m && prev < m);
    if (crossed) {
      setBanner(MILESTONE_TEXT[crossed]);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setBanner(null), 1500);
    }
    return undefined;
  }, [streak, hasStreak]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ── Live stat pills for TopBar right slot ──
  const statPills = (hasScore || hasStreak || hasXP) ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
      {hasScore && (
        <div style={{
          ...pillBase,
          background: C.surface,
          border: `1px solid ${C.lineHi}`,
          color: pct >= 80 ? C.green : pct >= 60 ? C.orange : total > 0 ? C.red : C.textDim,
        }}>
          <span style={{ color: C.textDim, fontWeight: 600 }}>✓</span>
          {correct}/{total}
        </div>
      )}
      {hasStreak && (
        <div style={{
          ...pillBase,
          background: fire.bg,
          border: `1px solid ${fire.border}`,
          color: fire.color,
          boxShadow: fire.glow,
          transform: `scale(${fire.scale})`,
        }}>
          {fire.flames} {streak}
        </div>
      )}
      {hasXP && (
        <div style={{
          ...pillBase,
          background: 'rgba(232,193,90,0.10)',
          border: `1px solid rgba(232,193,90,0.3)`,
          color: C.goldHi,
        }}>
          ⚡ {xpTick} XP
        </div>
      )}
    </div>
  ) : null;

  return (
    <Screen scroll={false} pad={false} style={{ background: GRAD.sceneBg }}>
      <div style={{ position: 'relative', zIndex: Z.topbar }}>
        <TopBar title={title} subtitle={subtitle} onBack={onBack} right={statPills} />

        {/* ── Slim animated accuracy bar ── */}
        {hasScore && (
          <div style={{
            height: 3,
            background: 'rgba(120,160,220,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: GRAD.gold,
              boxShadow: '0 0 10px rgba(232,193,90,0.5)',
              borderRadius: R.pill,
              transition: `width ${DUR.slow}ms ${EASE.out}`,
            }} />
          </div>
        )}
      </div>

      {/* ── ON FIRE floating banner ── */}
      {banner && (
        <div style={{
          position: 'fixed',
          top: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: Z.toast,
          padding: `${SP.sm}px ${SP.xl}px`,
          borderRadius: R.pill,
          background: GRAD.gold,
          color: '#1a1408',
          boxShadow: SH.goldGlow,
          fontFamily: F.family,
          ...F.h3,
          letterSpacing: 1.2,
          whiteSpace: 'nowrap',
          animation: `ic-slide-up ${DUR.base}ms ${EASE.spring} both`,
          pointerEvents: 'none',
        }}>
          {banner}
        </div>
      )}

      {/* ── Drill content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </Screen>
  );
}

// ─── WrapLegacy — instantly re-skin a V1 drill in v2 chrome ───
// Legacy drills manage their own internal stats/UI; we just give them the
// v2 background + safe mount so they look at home inside the new hub.
export function WrapLegacy({ Component, onBack, title }) {
  if (!Component) return null;
  return (
    <Screen scroll pad={false} style={{ background: GRAD.sceneBg }}>
      <div title={title || undefined} style={{ minHeight: '100vh' }}>
        <Component onBack={onBack} />
      </div>
    </Screen>
  );
}
