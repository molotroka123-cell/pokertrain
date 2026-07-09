// TableViewV2.jsx — IceCrown Engine 2.0: cinematic poker table.
// Contract (see docs/V2_TZ.md §3):
//   <TableViewV2 seats board pot stage blinds message showdown heroSeatIdx maxSeats />
// Computes its own elliptical seating (hero always bottom-center), animates
// chip flight to the pot on street change, active-seat pulse, card flips,
// winner glow. Transform/opacity animations only — no layout thrash.
// Assumes GlobalStyles.jsx registers keyframes: ic-turn-pulse, ic-glow-win, ic-slide-up.
import React, { useState, useEffect, useRef } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js';
import { computeSeats, TABLE_CENTER } from './seatLayout.js';
import Card from './CardV2.jsx';
import ChipStack from './ChipStack.jsx';

// ─── helpers ───

function formatChips(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return v.toLocaleString('en-US');
}

function initials(name) {
  const s = String(name || '?').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : s.slice(0, 2)).toUpperCase();
}

const ACTION_STYLE = {
  FOLD:     { bg: 'rgba(138,37,37,0.9)',  clr: '#ffd9d9' },
  CALL:     { bg: 'rgba(26,74,138,0.9)',  clr: '#cfe4ff' },
  CHECK:    { bg: 'rgba(70,82,100,0.9)',  clr: '#dbe3ee' },
  BET:      { bg: 'rgba(21,106,62,0.9)',  clr: '#d2ffe6' },
  RAISE:    { bg: 'rgba(21,106,62,0.9)',  clr: '#d2ffe6' },
  'ALL-IN': { bg: 'rgba(170,96,10,0.95)', clr: '#ffe9c4' },
};

function normalizeAction(a) {
  if (!a) return null;
  const u = String(a).toUpperCase().replace(/[_\s]/g, '-');
  if (u.includes('ALL')) return 'ALL-IN';
  if (ACTION_STYLE[u]) return u;
  return u.slice(0, 8);
}

// Internal count-up (rAF) — deliberately NOT imported from kit to stay decoupled.
function useCountUp(target, dur = 450) {
  const t = Math.round(Number(target) || 0);
  const [val, setVal] = useState(t);
  const fromRef = useRef(t);
  useEffect(() => {
    const from = fromRef.current;
    if (from === t) return undefined;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (t - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = t;
    };
  }, [t, dur]);
  return val;
}

// ─── lastAction badge: mounts visible, fades out after ~1.6s (opacity transition) ───

function ActionBadge({ action }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(t);
  }, [action]);
  const a = normalizeAction(action);
  if (!a) return null;
  const s = ACTION_STYLE[a] || ACTION_STYLE.CHECK;
  return (
    <div
      style={{
        ...F.micro,
        fontFamily: F.family,
        position: 'absolute',
        top: -10,
        left: '50%',
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, -6px)',
        opacity: visible ? 1 : 0,
        transition: `opacity 500ms ${EASE.smooth}, transform 500ms ${EASE.smooth}`,
        background: s.bg,
        color: s.clr,
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: R.pill,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {a}
    </div>
  );
}

// ─── single seat ───

function Seat({ seat, layout, showdown, isHeroSeat, handLive }) {
  const avatarSize = isHeroSeat ? 48 : 42;
  const folded = !!seat.folded;
  const eliminated = !!seat.eliminated;
  const isTurn = !!seat.isTurn && !eliminated;
  const showCards = !eliminated && !folded && (handLive || !!seat.cards);
  const faceUp = isHeroSeat ? !!seat.cards : !!(showdown && seat.cards);
  const cards = Array.isArray(seat.cards) && seat.cards.length ? seat.cards : [null, null];

  return (
    <div
      style={{
        position: 'absolute',
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: `translate(-50%, -50%) ${isTurn ? 'scale(1.05)' : 'scale(1)'}`,
        transition: `transform ${DUR.base}ms ${EASE.spring}, opacity ${DUR.base}ms ${EASE.smooth}, filter ${DUR.base}ms ${EASE.smooth}`,
        opacity: eliminated ? 0.45 : folded ? 0.4 : 1,
        filter: eliminated ? 'grayscale(1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: isHeroSeat ? Z.seats + 5 : Z.seats,
        width: 76,
        willChange: 'transform, opacity',
      }}
    >
      <ActionBadge key={`${seat.id}-${seat.lastAction || ''}`} action={folded && !seat.lastAction ? 'fold' : seat.lastAction} />

      {/* hole cards — behind/above avatar (hero cards render large in the fan layer) */}
      {showCards && !isHeroSeat && (
        <div style={{ display: 'flex', gap: 2, marginBottom: -14, zIndex: 0 }}>
          <Card card={faceUp ? cards[0] : null} faceDown={!faceUp} size="sm" delay={0} />
          <Card card={faceUp ? cards[1] : null} faceDown={!faceUp} size="sm" delay={90} />
        </div>
      )}

      {/* avatar */}
      <div
        style={{
          position: 'relative',
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          background: 'linear-gradient(165deg, rgba(36,52,80,0.95), rgba(14,22,38,0.98))',
          border: isTurn ? `2px solid ${C.gold}` : `1.5px solid ${isHeroSeat ? C.goldDeep : C.lineHi}`,
          boxShadow: isTurn ? SH.goldGlow : SH.panel,
          animation: isTurn ? 'ic-turn-pulse 1.3s ease-in-out infinite' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: seat.avatar ? avatarSize * 0.5 : 14,
          fontWeight: 800,
          fontFamily: F.family,
          color: C.text,
          zIndex: 1,
          userSelect: 'none',
        }}
      >
        {seat.avatar || initials(seat.name)}
        {eliminated && (
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(2,4,9,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: C.red,
            }}
          >
            ✕
          </div>
        )}
        {/* dealer disc pinned to seat edge */}
        {seat.isDealer && !eliminated && (
          <div
            style={{
              position: 'absolute',
              right: -7,
              top: '58%',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: GRAD.gold,
              color: '#241a05',
              fontSize: 9,
              fontWeight: 900,
              fontFamily: F.family,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          >
            D
          </div>
        )}
      </div>

      {/* name + stack plate */}
      <div
        style={{
          marginTop: 3,
          minWidth: 58,
          maxWidth: 76,
          textAlign: 'center',
          background: 'rgba(5,8,15,0.78)',
          border: `1px solid ${isTurn ? 'rgba(232,193,90,0.45)' : C.line}`,
          borderRadius: R.sm,
          padding: '2px 6px 3px',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          transition: `border-color ${DUR.base}ms ${EASE.smooth}`,
          zIndex: 1,
        }}
      >
        {seat.position ? (
          <div style={{ ...F.micro, fontFamily: F.family, color: C.textFaint, fontSize: 7.5 }}>{seat.position}</div>
        ) : null}
        <div
          style={{
            fontFamily: F.family, fontSize: 10, fontWeight: 700, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {seat.name || '—'}
        </div>
        <div style={{ ...F.num, fontFamily: F.family, fontSize: 11, fontWeight: 800, color: eliminated ? C.textFaint : C.gold }}>
          {eliminated ? 'OUT' : formatChips(seat.stack)}
        </div>
      </div>
    </div>
  );
}

// ─── main component ───

export default function TableViewV2({
  seats = [],
  board = [],
  pot = 0,
  stage = '',
  blinds = null,
  message = null,
  showdown = false,
  heroSeatIdx = 0,
  maxSeats = 9,
}) {
  const safeSeats = Array.isArray(seats) ? seats.filter(Boolean) : [];
  const safeBoard = Array.isArray(board) ? board.filter(Boolean).slice(0, 5) : [];
  const n = Math.max(2, Math.min(maxSeats || 9, safeSeats.length || 2));

  // Hero index: prefer explicit isHero flag, fall back to heroSeatIdx prop.
  let heroIdx = safeSeats.findIndex((s) => s && s.isHero);
  if (heroIdx < 0) heroIdx = Math.min(Math.max(0, heroSeatIdx || 0), Math.max(0, safeSeats.length - 1));

  const layout = computeSeats(n, heroIdx);

  // A hand is "live" if we're on a real street — gates opponent card backs
  // so idle tables don't show phantom holdings.
  const st = String(stage || '').toUpperCase();
  const handLive = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'].includes(st) || !!showdown;

  // ── chip flight: when stage changes, previous street's bets fly to the pot ──
  const prevStageRef = useRef(stage);
  const prevBetsRef = useRef([]);
  const [flyingChips, setFlyingChips] = useState([]);

  useEffect(() => {
    if (stage !== prevStageRef.current) {
      prevStageRef.current = stage;
      const old = prevBetsRef.current;
      if (old.length) {
        setFlyingChips(old);
        const t = setTimeout(() => setFlyingChips([]), DUR.slow + 200);
        return () => clearTimeout(t);
      }
    }
    return undefined;
  }, [stage]);

  // Snapshot current bets after every commit (runs after the stage effect above,
  // so on the street-change render the effect still sees last street's bets).
  useEffect(() => {
    prevBetsRef.current = safeSeats
      .map((s, i) => ({ id: s.id != null ? s.id : i, amount: Number(s.bet) || 0, x: layout[i] ? layout[i].betX : 50, y: layout[i] ? layout[i].betY : 50 }))
      .filter((b) => b.amount > 0);
  });

  // ── pot: count-up + scale pop on increase ──
  const potShown = useCountUp(pot, 450);
  const prevPotRef = useRef(Number(pot) || 0);
  const [potPop, setPotPop] = useState(false);
  useEffect(() => {
    const p = Number(pot) || 0;
    let t;
    if (p > prevPotRef.current) {
      setPotPop(true);
      t = setTimeout(() => setPotPop(false), 220);
    }
    prevPotRef.current = p;
    return () => clearTimeout(t);
  }, [pot]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 520,
        aspectRatio: '520 / 420',
        margin: '0 auto',
        fontFamily: F.family,
        userSelect: 'none',
        overflow: 'visible',
      }}
    >
      {/* ── felt + wooden rim ── */}
      <div
        style={{
          position: 'absolute',
          left: '9%',
          top: '13%',
          width: '82%',
          height: '62%',
          borderRadius: '50%',
          background: `linear-gradient(180deg, #5a3a22 0%, ${C.feltRim} 45%, #150c05 100%)`,
          boxShadow: `0 14px 40px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.12)`,
          zIndex: Z.table,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: GRAD.felt,
            boxShadow: `${SH.inner}, inset 0 0 60px rgba(0,0,0,0.35)`,
            border: '1px solid rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* center logo */}
          <div
            style={{
              fontFamily: F.display,
              fontSize: 26,
              letterSpacing: 8,
              color: '#bfe8d2',
              opacity: 0.07,
              transform: 'translateY(-8px)',
              pointerEvents: 'none',
            }}
          >
            ICECROWN
          </div>
        </div>
      </div>

      {/* ── blinds info, top-left ── */}
      {blinds && (blinds.sb || blinds.bb) ? (
        <div
          style={{
            ...F.micro,
            position: 'absolute',
            top: SP.xs,
            left: SP.xs,
            color: C.textDim,
            background: 'rgba(5,8,15,0.6)',
            border: `1px solid ${C.line}`,
            borderRadius: R.pill,
            padding: '3px 8px',
            zIndex: Z.hud,
          }}
        >
          <span style={F.num}>
            {formatChips(blinds.sb)}/{formatChips(blinds.bb)}
            {blinds.ante ? ` (${formatChips(blinds.ante)})` : ''}
          </span>
        </div>
      ) : null}

      {/* ── pot: chips + pill ── */}
      {(Number(pot) || 0) > 0 && (
        <>
          <ChipStack amount={pot} x={TABLE_CENTER.x} y={TABLE_CENTER.y - 12} />
          <div
            style={{
              ...F.num,
              position: 'absolute',
              left: '50%',
              top: `${TABLE_CENTER.y - 5}%`,
              transform: `translate(-50%, -50%) scale(${potPop ? 1.14 : 1})`,
              transition: `transform ${DUR.fast}ms ${EASE.spring}`,
              background: 'rgba(4,7,13,0.85)',
              border: `1px solid rgba(232,193,90,0.55)`,
              boxShadow: potPop ? SH.goldGlow : '0 2px 10px rgba(0,0,0,0.5)',
              borderRadius: R.pill,
              padding: '3px 12px',
              fontSize: 12,
              fontWeight: 800,
              color: C.goldHi,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
              zIndex: Z.chips + 1,
              willChange: 'transform',
            }}
          >
            <span style={{ ...F.micro, color: C.textDim, marginRight: 6 }}>POT</span>
            {Math.round(potShown).toLocaleString('en-US')}
          </div>
        </>
      )}

      {/* ── board: 5 card slots ── */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${TABLE_CENTER.y + 8}%`,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          gap: 5,
          zIndex: Z.cards,
        }}
      >
        {Array.from({ length: 5 }, (_, i) =>
          safeBoard[i] ? (
            <Card key={`b-${i}-${safeBoard[i]}`} card={safeBoard[i]} size="md" delay={i * 120} />
          ) : (
            <div
              key={`slot-${i}`}
              style={{
                width: 44,
                height: 62,
                borderRadius: 7,
                border: '1px dashed rgba(200,230,215,0.16)',
                background: 'rgba(0,0,0,0.12)',
                flex: 'none',
              }}
            />
          )
        )}
      </div>

      {/* ── seats ── */}
      {safeSeats.slice(0, n).map((seat, i) => (
        <Seat
          key={seat.id != null ? seat.id : i}
          seat={seat}
          layout={layout[i]}
          showdown={!!showdown}
          isHeroSeat={i === heroIdx}
          handLive={handLive}
        />
      ))}

      {/* ── hero cards: large fan at bottom center ── */}
      {(() => {
        const hero = safeSeats[heroIdx];
        if (!hero || !Array.isArray(hero.cards) || !hero.cards.length || hero.eliminated) return null;
        return (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: `${layout[heroIdx] ? layout[heroIdx].y - 15 : 73}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              zIndex: Z.cards + 5,
              opacity: hero.folded ? 0.4 : 1,
              filter: hero.folded ? 'grayscale(0.8)' : 'none',
              transition: `opacity ${DUR.base}ms ${EASE.smooth}, filter ${DUR.base}ms ${EASE.smooth}`,
              pointerEvents: 'none',
            }}
          >
            {hero.cards.slice(0, 2).map((c, ci) => (
              <div
                key={`hero-${ci}-${c}`}
                style={{
                  transform: `rotate(${ci === 0 ? -6 : 6}deg) translateY(${ci === 0 ? 0 : 2}px)`,
                  marginLeft: ci === 0 ? 0 : -12,
                  zIndex: ci,
                }}
              >
                <Card card={c} size="hero" delay={ci * 140} winner={!!hero.winner && !!showdown} dimmed={!!hero.folded} />
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── live bets ── */}
      {safeSeats.slice(0, n).map((seat, i) => {
        const bet = Number(seat.bet) || 0;
        if (bet <= 0 || !layout[i]) return null;
        return (
          <ChipStack
            key={`bet-${seat.id != null ? seat.id : i}`}
            amount={bet}
            x={layout[i].betX}
            y={layout[i].betY}
          />
        );
      })}

      {/* ── previous street's bets flying to the pot ── */}
      {flyingChips.map((b, i) => (
        <ChipStack key={`fly-${b.id}-${stage}`} amount={b.amount} x={b.x} y={b.y} flying delay={i * 40} />
      ))}

      {/* ── message banner ── */}
      {message ? (
        <div
          key={String(message)}
          style={{
            position: 'absolute',
            bottom: '1%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: GRAD.panel,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(232,193,90,0.4)',
            boxShadow: SH.goldGlow,
            borderRadius: R.pill,
            padding: `${SP.xs + 2}px ${SP.lg}px`,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0.4,
            color: C.goldHi,
            whiteSpace: 'nowrap',
            maxWidth: '92%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: Z.hud + 5,
            animation: `ic-slide-up ${DUR.base}ms ${EASE.out} both`,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
