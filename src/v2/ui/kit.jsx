// kit.jsx — IceCrown Engine 2.0 component kit. "Midnight Casino" aesthetic:
// glass panels, metallic gold, depth shadows, smooth EASE.out motion.
// Requires <GlobalStyles/> mounted once for ic-* keyframes/utility classes.
import React from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from './tokens.js';

const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0));

/* ─── Btn ─── */
const BTN_SIZES = {
  sm: { height: 34, padding: '0 14px', fontSize: 12, borderRadius: R.sm },
  md: { height: 44, padding: '0 20px', fontSize: 14, borderRadius: R.md },
  lg: { height: 52, padding: '0 26px', fontSize: 15, borderRadius: R.md },
};

const BTN_VARIANTS = {
  primary: {
    background: GRAD.cyan,
    color: C.bgDeep,
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: SH.cyanGlow,
  },
  gold: {
    background: GRAD.gold,
    color: C.bgDeep,
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: SH.goldGlow,
    fontWeight: 800,
  },
  danger: {
    background: GRAD.red,
    color: C.text,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: SH.redGlow,
  },
  ghost: {
    background: 'transparent',
    color: C.textDim,
    border: `1px solid ${C.lineHi}`,
    boxShadow: 'none',
  },
  glass: {
    color: C.text,
    border: `1px solid ${C.line}`,
    boxShadow: SH.panel,
  },
};

export function Btn({
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  onClick,
  style,
  children,
}) {
  const sz = BTN_SIZES[size] || BTN_SIZES.md;
  const vr = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  const cls = [
    'ic-press',
    'ic-num',
    variant === 'gold' && !disabled ? 'ic-shimmer-hover' : '',
    variant === 'glass' ? 'ic-glass' : '',
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SP.sm,
        width: full ? '100%' : undefined,
        fontFamily: F.family,
        fontWeight: 700,
        letterSpacing: 0.3,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        outline: 'none',
        ...sz,
        ...vr,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Panel ─── */
const TINTS = {
  gold:  { border: `1px solid ${C.gold}55`,  glow: SH.goldGlow },
  cyan:  { border: `1px solid ${C.cyan}55`,  glow: SH.cyanGlow },
  red:   { border: `1px solid ${C.red}55`,   glow: SH.redGlow },
  green: { border: `1px solid ${C.green}55`, glow: SH.greenGlow },
};

export function Panel({ glow, tint, style, children, onClick }) {
  const t = tint ? TINTS[tint] : null;
  return (
    <div
      className={onClick ? 'ic-press' : undefined}
      onClick={onClick}
      style={{
        background: GRAD.panel,
        border: t ? t.border : `1px solid ${C.line}`,
        borderRadius: R.lg,
        boxShadow: glow ? (t ? t.glow : SH.goldGlow) : SH.panel,
        padding: SP.lg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── TopBar ─── */
export function TopBar({ title, subtitle, onBack, right }) {
  return (
    <div
      className="ic-glass"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: Z.topbar,
        display: 'flex',
        alignItems: 'center',
        gap: SP.md,
        padding: `calc(env(safe-area-inset-top, 0px) + ${SP.sm}px) ${SP.lg}px ${SP.sm}px`,
        borderBottom: `1px solid ${C.line}`,
        minHeight: 56,
      }}
    >
      {onBack && (
        <button
          type="button"
          className="ic-press"
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 44,
            height: 44,
            flex: '0 0 44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: C.surfaceHi,
            border: `1px solid ${C.line}`,
            borderRadius: R.sm,
            cursor: 'pointer',
            padding: 0,
            marginLeft: -SP.xs,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14.5 5 8 12l6.5 7" stroke={C.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 20,
            letterSpacing: 0.8,
            color: C.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ ...F.small, color: C.textDim, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

/* ─── StatChip ─── */
export function StatChip({ label, value, color, icon }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: `${SP.sm}px ${SP.md}px`,
        borderRadius: R.sm,
        background: C.surface,
        border: `1px solid ${C.line}`,
        minWidth: 72,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...F.micro, color: C.textFaint }}>
        {icon != null && <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className="ic-num"
        style={{
          fontFamily: F.family,
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.1,
          color: color || C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── ProgressRing ─── */
export function ProgressRing({ pct = 0, size = 64, stroke = 6, color, label }) {
  const p = clampPct(pct);
  const c = color || C.gold;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - p / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={C.line}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            '--ic-ring-circ': circ,
            transition: `stroke-dashoffset ${DUR.slow}ms ${EASE.out}`,
            animation: `ic-ring-dash ${DUR.slow}ms ${EASE.out}`,
            filter: `drop-shadow(0 0 6px ${c}66)`,
          }}
        />
      </svg>
      <div
        className="ic-num"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.family,
          fontSize: Math.max(10, Math.round(size / 4.6)),
          fontWeight: 800,
          color: C.text,
          textAlign: 'center',
          padding: stroke + 2,
        }}
      >
        {label != null ? label : `${Math.round(p)}%`}
      </div>
    </div>
  );
}

/* ─── Modal ─── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z.modal,
        background: 'rgba(2,4,9,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: SP.lg,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${SP.lg}px)`,
        animation: `ic-fade-in ${DUR.base}ms ${EASE.out} both`,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '82vh',
          overflowY: 'auto',
          background: GRAD.panel,
          border: `1px solid ${C.lineHi}`,
          borderRadius: R.xl,
          boxShadow: SH.pop,
          padding: SP.xl,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          animation: `ic-slide-up ${DUR.scene}ms ${EASE.out} both`,
        }}
      >
        {(title != null || onClose) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.md, marginBottom: SP.lg }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: F.display,
                fontSize: 19,
                letterSpacing: 0.6,
                color: C.text,
              }}
            >
              {title}
            </div>
            {onClose && (
              <button
                type="button"
                className="ic-press"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 44,
                  height: 44,
                  flex: '0 0 44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: C.surfaceHi,
                  border: `1px solid ${C.line}`,
                  borderRadius: R.pill,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke={C.textDim} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─── Screen ─── */
export function Screen({ scroll = true, pad = true, children, style }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: GRAD.sceneBg,
        display: 'flex',
        justifyContent: 'center',
        overflowY: scroll ? 'auto' : 'hidden',
        overflowX: 'hidden',
        fontFamily: F.family,
        color: C.text,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          flexDirection: 'column',
          padding: pad
            ? `calc(env(safe-area-inset-top, 0px) + ${SP.lg}px) ${SP.lg}px calc(env(safe-area-inset-bottom, 0px) + ${SP.xl}px)`
            : 0,
          animation: `ic-fade-in ${DUR.base}ms ${EASE.out} both`,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── SectionTitle ─── */
export function SectionTitle({ children, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SP.md,
        margin: `${SP.lg}px 0 ${SP.sm}px`,
      }}
    >
      <div style={{ ...F.micro, color: C.gold }}>{children}</div>
      {right}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({ color, children }) {
  const cc = color || C.gold;
  return (
    <span
      className="ic-num"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: R.pill,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.5,
        lineHeight: 1.6,
        color: cc,
        background: `${cc}1f`,
        border: `1px solid ${cc}44`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/* ─── ListItem ─── */
export function ListItem({ icon, iconBg, title, desc, right, onClick, isNew, badge }) {
  return (
    <div
      className={onClick ? 'ic-press ic-hover-lift' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SP.md,
        padding: SP.md,
        borderRadius: R.md,
        background: GRAD.panel,
        border: `1px solid ${C.line}`,
        boxShadow: SH.panel,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        minHeight: 60,
      }}
    >
      {icon != null && (
        <div
          style={{
            width: 44,
            height: 44,
            flex: '0 0 44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            lineHeight: 1,
            background: iconBg || C.surfaceHi,
            border: `1px solid ${C.line}`,
            borderRadius: R.sm,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, minWidth: 0 }}>
          <span
            style={{
              ...F.h3,
              color: C.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
          {isNew && <Badge color={C.green}>NEW</Badge>}
          {badge != null && <Badge>{badge}</Badge>}
        </div>
        {desc && (
          <div
            style={{
              ...F.small,
              color: C.textDim,
              marginTop: 2,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {desc}
          </div>
        )}
      </div>
      {right != null ? (
        right
      ) : (
        onClick && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: '0 0 16px' }}>
            <path d="m9.5 5 6.5 7-6.5 7" stroke={C.textFaint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      )}
    </div>
  );
}

/* ─── XPBar ─── */
export function XPBar({ level = 1, pct = 0 }) {
  const p = clampPct(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
      <div
        className="ic-num"
        style={{
          width: 36,
          height: 36,
          flex: '0 0 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: R.pill,
          background: GRAD.gold,
          color: C.bgDeep,
          fontFamily: F.family,
          fontSize: 14,
          fontWeight: 800,
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: SH.goldGlow,
        }}
      >
        {level}
      </div>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: R.pill,
          background: C.line,
          boxShadow: SH.inner,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${p}%`,
            height: '100%',
            borderRadius: R.pill,
            background: GRAD.gold,
            boxShadow: '0 0 10px rgba(232,193,90,0.5)',
            transition: `width ${DUR.slow}ms ${EASE.out}`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── useCountUp ─── */
// Animated counter: eases toward `target` with rAF + cubic ease-out,
// re-animating from the currently displayed value whenever `target` changes.
export function useCountUp(target = 0, dur = 800) {
  const [val, setVal] = React.useState(0);
  const valRef = React.useRef(0);

  React.useEffect(() => {
    const to = Number(target) || 0;
    const from = valRef.current;
    if (from === to) {
      setVal(to);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / Math.max(1, dur));
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const v = from + (to - from) * eased;
      valRef.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);

  return Number.isInteger(Number(target)) ? Math.round(val) : val;
}
