import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TournamentDirector } from './tournament/TournamentDirector.js';
import { FORMATS } from './data/tournamentFormats.js';
import { GameEngine, PHASE } from './engine/GameEngine.js';
import { AdaptiveAI } from './engine/adaptiveAI.js';
import { mRatio } from './engine/equity.js';
import Card from './components/Card.jsx';
import Controls from './tournament/Controls.jsx';
import TournamentDashboard from './tournament/TournamentDashboard.jsx';
import DebriefScreen from './stats/DebriefScreen.jsx';
import { startSession, recordDecision, recordHandHistory, updateHandResult, saveSession, exportSession, getRecords } from './recorder/ActionRecorder.js';
import { generateDebrief } from './recorder/autoDebrief.js';
import DrillMenu from './drills/DrillMenu.jsx';
import RFIDrill from './drills/RFIDrill.jsx';
import ThreeBetDrill from './drills/ThreeBetDrill.jsx';
import BBDefenseDrill from './drills/BBDefenseDrill.jsx';
import PushFoldDrill from './drills/PushFoldDrill.jsx';
import PostflopDrill from './drills/PostflopDrill.jsx';
import SizingDrill from './drills/SizingDrill.jsx';
import PotOddsDrill from './drills/PotOddsDrill.jsx';
import StatsScreen from './stats/Dashboard.jsx';
import CoachScreen from './coach/Coach.jsx';
import { Sounds } from './lib/sounds.js';
import { getTheme } from './lib/themes.js';
import { ClaudeBossBot } from './engine/claudeAI.js';

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ════════════════════════════════════════════
// PREMIUM LOBBY — V3 Design
// ════════════════════════════════════════════
function Lobby({ onStart, onDrills, onStats, onCoach }) {
  const [format, setFormat] = useState('WSOP_Main');
  const [name, setName] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a2540 0%, #0a0d14 60%, #050709 100%)',
      color: '#e0e0e0', fontFamily: "'Segoe UI', -apple-system, sans-serif",
    }}>
      {/* Hero banner */}
      <div style={{
        textAlign: 'center', padding: '48px 20px 24px',
        background: 'linear-gradient(180deg, rgba(255,215,0,0.06) 0%, transparent 100%)',
      }}>
        <div style={{ fontSize: '14px', color: '#8899aa', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px' }}>World Series of Poker</div>
        <div style={{
          fontSize: '36px', fontWeight: 900, letterSpacing: '3px',
          background: 'linear-gradient(135deg, #ffd700, #ffaa00, #ffd700)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textShadow: 'none', filter: 'drop-shadow(0 2px 4px rgba(255,215,0,0.2))',
        }}>POKER TRAINER</div>
        <div style={{ fontSize: '13px', color: '#5a6a7a', marginTop: '6px' }}>v3.0 — Full Tournament Emulator</div>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 20px 40px' }}>
        {/* Name input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#5a6a7a', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Player Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Hero"
            style={{
              width: '100%', padding: '14px 16px', background: '#0d1118', border: '1px solid #1e2a3a',
              borderRadius: '10px', color: '#e0e0e0', fontSize: '16px', outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#ffd700'}
            onBlur={e => e.target.style.borderColor = '#1e2a3a'}
          />
        </div>

        {/* Format selector */}
        <label style={{ fontSize: '11px', color: '#5a6a7a', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Tournament Format</label>
        {Object.entries(FORMATS).map(([key, f]) => (
          <div key={key} onClick={() => setFormat(key)} style={{
            padding: '16px', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer',
            background: format === key ? 'linear-gradient(135deg, #1a2a4a, #1a3a5c)' : '#0d1118',
            border: `1.5px solid ${format === key ? '#3a6a9a' : '#1a2230'}`,
            transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
            boxShadow: format === key ? '0 4px 20px rgba(42,106,154,0.2)' : 'none',
          }}>
            {format === key && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#ffd700', borderRadius: '3px 0 0 3px' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: format === key ? '#ffd700' : '#c0d0e0' }}>{f.name}</div>
                <div style={{ fontSize: '12px', color: '#5a6a7a', marginTop: '3px' }}>
                  {f.players} players | {f.startingChips.toLocaleString()} chips
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: format === key ? '#ffd700' : '#3a4a5a' }}>
                ${f.buyIn.toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {/* Start button */}
        <button onClick={() => onStart(format, name || 'Hero')} style={{
          width: '100%', padding: '18px', border: 'none', borderRadius: '14px', cursor: 'pointer',
          background: 'linear-gradient(135deg, #1a6a3a, #27ae60, #2ecc71)',
          color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '1px',
          boxShadow: '0 4px 20px rgba(39,174,96,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transition: 'transform 0.15s, box-shadow 0.15s', marginTop: '8px',
        }}
        onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
        onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
        >START TOURNAMENT</button>

        {/* Drills button */}
        <button onClick={onDrills} style={{
          width: '100%', padding: '16px', border: 'none', borderRadius: '14px', cursor: 'pointer',
          background: 'linear-gradient(135deg, #1a3a6c, #2980b9)',
          color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px',
          boxShadow: '0 4px 16px rgba(41,128,185,0.25)',
          marginTop: '12px', transition: 'transform 0.15s',
        }}
        onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
        onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
        >TRAINING DRILLS</button>

        {/* Hardcore mode */}
        <button onClick={() => onStart('HARDCORE', name || 'Hero')} style={{
          width: '100%', padding: '14px', border: 'none', borderRadius: '14px', cursor: 'pointer',
          background: 'linear-gradient(135deg, #3a0a0a, #cc2020, #8a1010)',
          color: '#fff', fontWeight: 800, fontSize: '15px', letterSpacing: '1px',
          boxShadow: '0 4px 20px rgba(204,32,32,0.3)',
          marginTop: '10px', transition: 'transform 0.15s',
        }}
        onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
        onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
        >HARDCORE — 5 AI PRO vs YOU</button>

        {/* Secondary buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <button onClick={onStats} style={{
            padding: '14px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '12px',
            color: '#8899aa', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>📊 Statistics</button>
          <button onClick={onCoach} style={{
            padding: '14px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '12px',
            color: '#8899aa', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>🧠 AI Coach</button>
        </div>

        {/* Quick drill buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginTop: '12px' }}>
          {[
            { id: 'rfi', icon: '🎯', name: 'RFI', color: '#27ae60' },
            { id: 'pushfold', icon: '💣', name: 'Push', color: '#e74c3c' },
            { id: 'potodds', icon: '🧮', name: 'Odds', color: '#3498db' },
            { id: 'postflop', icon: '🃏', name: 'Flop', color: '#9b59b6' },
          ].map(d => (
            <div key={d.id} onClick={() => { window.__quickDrill = d.id; onDrills(); }} style={{
              padding: '10px 4px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '10px',
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px' }}>{d.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: d.color, marginTop: '2px' }}>{d.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// PREMIUM TABLE — V3
// ════════════════════════════════════════════
const SEATS_9 = [
  { x: 50, y: 90 },  // 0: Hero (bottom)
  { x: 10, y: 75 },  // 1
  { x: 2,  y: 48 },  // 2
  { x: 10, y: 20 },  // 3
  { x: 32, y: 5 },   // 4
  { x: 68, y: 5 },   // 5
  { x: 90, y: 20 },  // 6
  { x: 98, y: 48 },  // 7
  { x: 90, y: 75 },  // 8
];

// Chip stack visual component
function ChipStack({ amount, x, y, animate = false }) {
  if (!amount || amount <= 0) return null;
  // Determine chip colors by amount
  const colors = amount >= 10000 ? ['#e74c3c','#c0392b'] : amount >= 1000 ? ['#2980b9','#2471a3'] : amount >= 100 ? ['#27ae60','#1e8449'] : ['#95a5a6','#7f8c8d'];
  const numChips = Math.min(5, Math.ceil(Math.log10(Math.max(amount, 2))));

  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)',
      zIndex: 18, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center',
      animation: animate ? 'chipSlide 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
    }}>
      {Array.from({ length: numChips }).map((_, i) => (
        <div key={i} style={{
          width: 22, height: 6, borderRadius: '50%',
          background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
          border: '1px solid rgba(255,255,255,0.2)',
          marginTop: i === 0 ? 0 : -3,
          boxShadow: i === numChips - 1 ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
        }} />
      ))}
      <div style={{
        fontSize: '10px', fontWeight: 700, color: '#ffd700',
        background: 'rgba(0,0,0,0.65)', padding: '1px 6px', borderRadius: '8px',
        marginTop: '2px', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,215,0,0.15)',
      }}>{fmt(amount)}</div>
    </div>
  );
}

// Bet position relative to seat (towards center of table)
const BET_OFFSETS = [
  { dx: 0, dy: -45 },   // 0: hero → up
  { dx: 35, dy: -25 },  // 1
  { dx: 40, dy: 0 },    // 2
  { dx: 35, dy: 20 },   // 3
  { dx: 20, dy: 30 },   // 4
  { dx: -20, dy: 30 },  // 5
  { dx: -35, dy: 20 },  // 6
  { dx: -40, dy: 0 },   // 7
  { dx: -35, dy: -25 }, // 8
];

function PremiumTable({ gs, theme: T }) {
  if (!gs || !gs.players) return null;
  if (!T) T = getTheme('WSOP_Main');
  const heroIdx = gs.heroIndex;
  const showdown = gs.phase === 'showdown';
  const sdMap = {};
  if (showdown && gs.showdownResults) {
    for (const r of gs.showdownResults) sdMap[r.player.id] = r;
  }

  const seated = [];
  for (let i = 0; i < gs.players.length; i++) {
    seated.push(gs.players[(heroIdx + i) % gs.players.length]);
  }

  // Don't render hero in seat layout — hero area is separate below table
  const opponents = seated.slice(1);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '750px', margin: '0 auto' }}>
      {/* ═══ TABLE AREA ═══ */}
      <div style={{
        position: 'relative', width: '100%', height: 'min(340px, 44dvh)',
        overflow: 'visible', contain: 'layout style',
      }}>
        {/* Ambient light */}
        <div style={{
          position: 'absolute', top: '15%', left: '50%', width: '50%', height: '30%',
          transform: 'translate(-50%,-30%)',
          background: `radial-gradient(ellipse, ${T.ambientColor} 0%, transparent 70%)`,
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />

        {/* Table shadow */}
        <div style={{
          position: 'absolute', top: '58%', left: '50%', width: '78%', height: '30%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.4)', borderRadius: '50%', filter: 'blur(30px)',
        }} />

        {/* Outer metallic rim */}
        <div style={{
          position: 'absolute', top: '10%', left: '6%', width: '88%', height: '72%',
          borderRadius: '50%/42%',
          background: T.rimBg,
          boxShadow: T.rimGlow + ', inset 0 2px 0 ' + T.rimEdge,
          border: '2px solid ' + T.rimBorder,
        }} />

        {/* Inner rim glow */}
        <div style={{
          position: 'absolute', top: '10.8%', left: '6.8%', width: '86.4%', height: '70.4%',
          borderRadius: '50%/42%',
          border: '1px solid ' + T.rimEdge,
          boxShadow: 'inset 0 0 15px ' + T.ambientColor,
          pointerEvents: 'none',
        }} />

        {/* Felt */}
        <div style={{
          position: 'absolute', top: '14%', left: '9%', width: '82%', height: '64%',
          background: T.feltBg,
          borderRadius: '50%/42%',
          boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4), inset 0 -8px 30px rgba(0,0,0,0.15)',
        }}>
          {/* Light spot */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%', width: '45%', height: '30%',
            transform: 'translate(-50%, 0)',
            background: `radial-gradient(ellipse, ${T.feltLight} 0%, transparent 70%)`,
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          {/* Inner line */}
          <div style={{
            position: 'absolute', top: '6%', left: '5%', width: '90%', height: '88%',
            borderRadius: '50%/42%',
            border: '1px solid ' + T.feltInner,
          }} />
          {/* Tournament logo */}
          <div style={{
            position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%,-50%)',
            fontSize: '24px', fontWeight: 900, letterSpacing: '4px',
            fontFamily: T.logoFont || "'Georgia', serif",
            color: T.logoColor || T.accent, opacity: 0.22,
            textShadow: `0 0 25px ${T.accentGlow}`,
            userSelect: 'none', pointerEvents: 'none',
          }}>{T.logo || ''}</div>
        </div>

        {/* ═══ Pot + To Call ═══ */}
        {gs.pot > 0 && (
          <div style={{
            position: 'absolute', top: '33%', left: '50%', transform: 'translate(-50%,-50%)',
            textAlign: 'center', zIndex: 20,
          }}>
            <div style={{ fontSize: '14px', color: '#a0a890', letterSpacing: '1px' }}>
              Pot: <span style={{
                fontSize: '24px', fontWeight: 800, color: T.potColor,
                textShadow: T.potShadow,
              }}>{fmt(gs.pot)}</span>
            </div>
            {gs.toCall > 0 && gs.waitingForHero && (
              <div style={{ fontSize: '13px', color: '#908a78', letterSpacing: '0.5px', marginTop: '2px' }}>
                To call: <span style={{ color: '#d0c090', fontWeight: 700, fontSize: '15px' }}>{fmt(gs.toCall)}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ Community cards ═══ */}
        {gs.community.length > 0 && (
          <div style={{
            position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', gap: '5px', zIndex: 15,
          }}>
            {gs.community.map((c, i) => <Card key={c + i} card={c} mini delay={i * 220} />)}
          </div>
        )}

        {/* ═══ Opponent Seats (no hero — hero is below table) ═══ */}
        {opponents.map((p, oi) => {
          if (!p || (p.folded && gs.phase !== 'showdown')) return null;
          const si = oi + 1; // seat index (1-8)
          const pos = SEATS_9[si % SEATS_9.length];
          const sd = sdMap[p.id];
          const isWinner = gs.winner?.id === p.id;
          const isDealer = gs.players.indexOf(p) === gs.dealerIdx;
          const betOff = BET_OFFSETS[si % BET_OFFSETS.length];

          return (
            <React.Fragment key={p.id}>
              {/* Bet chips */}
              {p.bet > 0 && (
                <ChipStack
                  amount={p.bet}
                  x={`calc(${pos.x}% + ${betOff.dx}px)`}
                  y={`calc(${pos.y}% + ${betOff.dy}px)`}
                  animate
                />
              )}

              <div style={{
                position: 'absolute', left: pos.x + '%', top: pos.y + '%',
                transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 10,
                width: '72px', transition: 'opacity 0.4s ease',
                opacity: p.folded ? 0.3 : 1,
              }}>
                {/* ALL-IN callout above avatar */}
                {p.allIn && (
                  <div style={{
                    fontSize: '10px', fontWeight: 800, color: T.allInColor,
                    background: T.allInBg, padding: '3px 10px', borderRadius: '10px',
                    marginBottom: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    animation: 'pulse 1.5s infinite',
                  }}>ALL IN</div>
                )}

                {/* Avatar circle — initial letter, no emoji */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', margin: '0 auto',
                  background: isWinner ? T.avatarWin : p._isBoss ? 'linear-gradient(135deg, #5a4010, #d4af37)' : T.avatarBot,
                  border: `2.5px solid ${isWinner ? T.accent : p._isBoss ? '#d4af37' : '#2a3a4a55'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 800,
                  color: isWinner ? '#fff' : p._isBoss ? '#fff' : '#8a9aaa',
                  boxShadow: isWinner
                    ? `0 0 20px ${T.accentGlow}`
                    : p._isBoss ? '0 0 14px rgba(212,175,55,0.4)' : '0 3px 10px rgba(0,0,0,0.5)',
                  willChange: 'transform',
                }}>
                  {(p.name || 'P')[0].toUpperCase()}
                </div>

                {/* Showdown cards */}
                {showdown && sd?.cards && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '3px 0' }}>
                    {sd.cards.map((c, ci) => <Card key={c} card={c} mini delay={200 + ci * 200} />)}
                  </div>
                )}

                {/* Showdown hand name */}
                {showdown && sd?.hand && (
                  <div style={{
                    fontSize: '9px', fontWeight: 700,
                    color: isWinner ? '#ffd700' : '#5a7a8a',
                    background: isWinner ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.35)',
                    padding: '2px 8px', borderRadius: '10px', display: 'inline-block',
                    border: isWinner ? '1px solid rgba(255,215,0,0.2)' : 'none',
                  }}>{sd.hand.name}</div>
                )}

                {/* Stack badge */}
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: T.chipColor,
                  background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: '12px',
                  display: 'inline-block', marginTop: '3px',
                  backdropFilter: 'blur(4px)', border: `1px solid ${T.accent}18`,
                }}>${fmt(p.chips)}</div>

                {/* Dealer chip */}
                {isDealer && (
                  <div style={{
                    position: 'absolute', top: '2px', right: '-2px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ffd700, #e8a800)',
                    color: '#1a1a00', fontSize: '10px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(255,215,0,0.5)',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                  }}>D</div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* Winner popup */}
        {gs.phase === 'showdown' && gs.winner && (
          <div style={{
            position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)',
            background: T.winBg, backdropFilter: 'blur(12px)',
            padding: '10px 30px', borderRadius: '20px', zIndex: 30,
            border: '1.5px solid ' + T.winBorder,
            boxShadow: T.winGlow,
            animation: 'winPopup 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: T.accent }}>
              {gs.winner.isHero ? 'You win ' : `${gs.winner.name} wins `}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#e0e0e0' }}>{fmt(gs.potWon)}</span>
          </div>
        )}
      </div>

      {/* ═══ HERO AREA — below table ═══ */}
      <div style={{
        textAlign: 'center', padding: '6px 0 2px', position: 'relative',
      }}>
        {/* Hero bet chips */}
        {seated[0]?.bet > 0 && (
          <ChipStack amount={seated[0].bet} x="50%" y="-10px" animate />
        )}
        {/* Hero cards — larger */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', minHeight: '68px' }}>
          {gs.heroCards?.length > 0 && gs.heroCards.map((c, ci) => (
            <Card key={c} card={c} hero glow delay={ci * 300} />
          ))}
        </div>
        {/* Stack label */}
        <div style={{
          fontSize: '13px', fontWeight: 700, color: T.chipColor, marginTop: '4px',
          textShadow: `0 0 12px ${T.accentGlow}`,
        }}>
          Stack: {fmt(seated[0]?.chips || 0)}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// TOURNAMENT HEADER — Premium info bar
// ════════════════════════════════════════════
function HUDBar({ heroChips, pot, mVal, position, rank, blinds, theme, level, playersRemaining, totalPlayers, isFinalTable, payouts }) {
  const T = theme || getTheme('WSOP_Main');
  return (
    <div style={{
      background: T.headerBg, borderBottom: `1px solid ${T.rimBorder}`,
      backdropFilter: 'blur(8px)', paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Final Table banner */}
      {isFinalTable && (
        <div style={{
          textAlign: 'center', padding: '6px 10px 4px',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.12), transparent)',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
        }}>
          <div style={{
            fontSize: '16px', fontWeight: 900, color: '#d4af37', letterSpacing: '3px',
            textShadow: '0 0 20px rgba(212,175,55,0.4)',
          }}>✦ FINAL TABLE ✦</div>
          {payouts && payouts.length >= 3 && (
            <div style={{ fontSize: '11px', color: '#b0a070', marginTop: '2px' }}>
              1st: ${fmt(payouts[0])}  2nd: ${fmt(payouts[1])}  3rd: ${fmt(payouts[2])}
            </div>
          )}
        </div>
      )}
      {/* Main info row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px',
      }}>
        {/* Left: Tournament name */}
        <div style={{
          fontSize: '13px', fontWeight: 800, color: T.headerColor,
          fontFamily: T.logoFont || 'inherit', letterSpacing: '1px',
        }}>{T.logo || 'POKER'}</div>
        {/* Center: Blinds info */}
        <div style={{
          fontSize: '11px', color: '#7a8a9a', textAlign: 'center',
        }}>
          {fmt(blinds.sb)}/{fmt(blinds.bb)}{blinds.ante > 0 ? `·${fmt(blinds.ante)}` : ''}
          {level != null && <span style={{ color: '#5a6a7a' }}> · Lvl {level + 1}</span>}
          {playersRemaining && <span style={{ color: '#5a6a7a' }}> · {playersRemaining}/{totalPlayers}</span>}
        </div>
        {/* Right: Rank + M */}
        <div style={{ textAlign: 'right', fontSize: '11px' }}>
          <span style={{ color: '#7a8a9a' }}>#{rank}</span>
          <span style={{
            marginLeft: '8px', fontWeight: 700,
            color: mVal < 10 ? '#dc3545' : mVal < 20 ? '#d4af37' : '#28a745',
          }}>M{mVal.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// HAND LOG — Premium
// ════════════════════════════════════════════
function HandLog({ entries }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div style={{
      background: '#0a0d14', borderRadius: '12px', padding: '10px 14px', margin: '8px 14px',
      border: '1px solid #1a2230', maxHeight: '140px', overflowY: 'auto',
    }}>
      <div style={{ fontSize: '10px', color: '#3a4a5a', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>HAND LOG</div>
      {entries.slice(-12).reverse().map((e, i) => (
        <div key={i} style={{
          fontSize: '11px', color: '#6b7b8d', padding: '2px 0',
          ...(e.isHero ? { color: '#c0d0e0', fontWeight: 500 } : {}),
          ...(e.action === 'win' ? { color: '#ffd700', fontWeight: 600 } : {}),
        }}>
          {e.text}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════
// MAIN GAME SCREEN
// ════════════════════════════════════════════
function Game({ director, onExit }) {
  const [view, setView] = useState('table');
  const [tournState, setTourn] = useState(() => director.getState());
  const [gs, setGs] = useState(null);
  const [handActive, setHandActive] = useState(false);
  const [handCount, setHandCount] = useState(0);

  const dirRef = useRef(director);
  const engineRef = useRef(new GameEngine());
  const aiBotsRef = useRef({});

  useEffect(() => {
    const state = dirRef.current.getState();
    if (state.heroTable) {
      const bots = {};
      const players = state.heroTable.players;
      const botPlayers = players.filter(p => !p.isHero && p.profile);
      const isHardcore = dirRef.current.format?.isHardcore;
      // In Hardcore: ALL bots are boss. Regular: 1 random boss.
      const bossIdx = !isHardcore && botPlayers.length > 0 ? Math.floor(Math.random() * botPlayers.length) : -1;
      for (let i = 0; i < botPlayers.length; i++) {
        const p = botPlayers[i];
        // Hardcore: make all bots tough (TAG/LAG mix)
        if (isHardcore) {
          const styles = ['TAG', 'LAG', 'TAG', 'SemiLAG', 'LAG'];
          p.profile.style = styles[i % styles.length];
          p.profile.vpip = 0.20 + Math.random() * 0.10;
          p.profile.pfr = p.profile.vpip - 0.03;
          p.profile.af = 2.5 + Math.random() * 2.0;
          p.profile.threeBet = 0.06 + Math.random() * 0.06;
        }
        const localAI = new AdaptiveAI(p.profile);
        if (isHardcore || i === bossIdx) {
          p._isBoss = true;
          localAI.exploitLevel = isHardcore ? 0.5 : 0.3;
          localAI.minHandsToExploit = isHardcore ? 3 : 5;
          // Boss bots use Claude API for key decisions
          bots[p.id] = new ClaudeBossBot(localAI);
        } else {
          bots[p.id] = localAI;
        }
      }
      aiBotsRef.current = bots;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      dirRef.current.simulateBackgroundTick(6);
      dirRef.current.checkBlindLevel();
      setTourn(dirRef.current.getState());
    }, 3000); // Background sim every 3s — ~10 min to final table
    return () => clearInterval(iv);
  }, []);

  const playHand = useCallback(async () => {
    if (handActive) return;
    setHandActive(true);
    const tState = dirRef.current.getState();
    if (!tState.heroTable || tState.heroEliminated) { setHandActive(false); return; }
    const tablePlayers = tState.heroTable.players.filter(p => !p.eliminated && p.chips > 0);
    if (tablePlayers.length < 2) { setHandActive(false); return; }
    const engine = engineRef.current;
    const blinds = tState.blinds;
    const dealer = tState.heroTable.dealer % tablePlayers.length;
    if (handCount === 0) ClaudeBossBot.resetCalls(); // Reset API counter for new game
    if (!engine.startHand(tablePlayers, dealer, blinds, aiBotsRef.current)) { setHandActive(false); return; }
    setGs(engine.getState());
    await engine.runHand((state) => setGs({ ...state }));
    for (const p of tablePlayers) {
      if (p.chips <= 0 && !p.eliminated) dirRef.current.pool.eliminate(p.id);
    }
    const heroTable = dirRef.current.tableManager.getHeroTable();
    if (heroTable) {
      const alive = heroTable.players.filter(p => !p.eliminated);
      heroTable.dealer = (heroTable.dealer + 1) % Math.max(1, alive.length);
    }
    dirRef.current.checkBlindLevel();
    setTourn(dirRef.current.getState());
    setHandCount(c => c + 1);
    setHandActive(false);
  }, [handActive]);

  const handleAction = useCallback((action, amount) => {
    engineRef.current.submitHeroAction(action, amount);
  }, []);

  // Record hero decisions after each hand completes
  useEffect(() => {
    if (!gs || gs.phase !== 'hand_over') return;
    const tState = dirRef.current.getState();
    const hero = gs.players?.find(p => p.isHero);
    if (!hero) return;

    // Find hero actions from the log
    const heroActions = (gs.actionLog || []).filter(a => a.isHero && a.action !== 'win');

    // Record BB walks (hero had no decisions — everyone folded to BB)
    if (heroActions.length === 0) {
      recordDecision({
        handNumber: handCount + 1,
        blindLevel: tState.blindLevel, blinds: tState.blinds,
        playersRemaining: tState.playersRemaining, totalPlayers: tState.totalPlayers,
        averageStack: tState.averageStack, isBubble: tState.isBubble, isFinalTable: tState.isFinalTable,
        tableId: tState.heroTable?.id, playersAtTable: gs.players?.length || 9,
        stage: 'preflop', position: gs.heroPosition || 'BB',
        holeCards: gs.heroCards || [], community: [],
        potSize: gs.pot || 0, currentBet: 0, toCall: 0,
        myChips: hero.chips, myBet: 0, opponents: [],
        action: 'bb_walk', raiseAmount: null, decisionTimeMs: 0,
        tournamentFormat: tState.formatKey || null,
      });
    }

    // Record each hero action with DECISION-TIME snapshots from GameEngine meta
    const allActions = gs.actionLog || [];
    for (const ha of heroActions) {
      // Extract what opponent action hero was facing
      const haIdx = allActions.indexOf(ha);
      let facingAction = null;
      for (let i = haIdx - 1; i >= 0; i--) {
        const prev = allActions[i];
        if (!prev.isHero && prev.action && prev.action !== 'win' && prev.action !== '') {
          facingAction = { action: prev.action, position: prev.position, amount: prev.amount, name: prev.name };
          break;
        }
      }

      recordDecision({
        handNumber: handCount + 1,
        blindLevel: tState.blindLevel, blinds: tState.blinds,
        playersRemaining: tState.playersRemaining, totalPlayers: tState.totalPlayers,
        averageStack: tState.averageStack, isBubble: tState.isBubble, isFinalTable: tState.isFinalTable,
        tableId: tState.heroTable?.id, playersAtTable: gs.players?.length || 9,
        stage: ha._phase || 'preflop',
        position: ha.position || gs.heroPosition,
        holeCards: gs.heroCards || [],
        community: ha._community || [],                // Decision-time board from meta
        potSize: ha._pot || 0,                         // Decision-time pot
        currentBet: ha._currentBet || 0,               // Decision-time bet
        toCall: ha._toCall || 0,
        myChips: ha._myChips ?? hero.chips,             // Decision-time chips
        myBet: ha._myBet ?? ha.amount ?? 0,
        // Use decision-time opponent snapshot if available, fallback to end-of-hand
        opponents: ha._opponents || gs.players?.filter(p => !p.isHero && !p.folded).map(p => ({
          name: p.name, position: p.position, chips: p.chips,
          style: p.profile?.style, observedVpip: p.profile?.vpip,
        })) || [],
        action: ha.action,
        raiseAmount: ha.action === 'raise' ? ha.amount : null,
        decisionTimeMs: ha._decisionTimeMs || 0,
        tournamentFormat: tState.formatKey || null,
        facingAction,
      });
    }

    // Update ALL records for this hand (not just last one)
    const heroWon = gs.winner?.isHero;
    const allRecs = getRecords().filter(r => r.handNumber === handCount + 1);
    for (const rec of allRecs) {
      rec.handResult = heroWon ? 'won' : 'lost';
      rec.potWon = heroWon ? gs.potWon : 0;
      rec.chipsAfter = hero.chips;
      if (gs.allHoleCards) {
        rec.opponentCards = {};
        for (const [id, cards] of Object.entries(gs.allHoleCards)) {
          if (cards?.length === 2) rec.opponentCards[id] = cards.join(' ');
        }
      }
    }

    // Record full hand history (action chain for pattern analysis)
    recordHandHistory(handCount + 1, {
      heroCards: gs.heroCards,
      community: gs.community,
      heroPosition: gs.heroPosition,
      blinds: tState.blinds,
      actionLog: allActions.filter(a => a.action && a.action !== 'win' && a.action !== '').map(a => ({
        action: a.action, position: a.position, name: a.name,
        amount: a.amount, isHero: a.isHero,
      })),
      result: heroWon ? 'won' : 'lost',
      potWon: heroWon ? gs.potWon : 0,
      allHoleCards: gs.allHoleCards || null,
    });

    // Save session after every hand
    saveSession();

    // If hero eliminated — auto-show debrief
    const tStateNow = dirRef.current.getState();
    if (tStateNow.heroEliminated) {
      setTimeout(() => {
        const recs = getRecords();
        if (recs.length > 0) {
          const deb = generateDebrief(recs);
          // Trigger exit with debrief
          window.__autoDebrief = { debrief: deb, finish: { position: tStateNow.heroRank, total: tStateNow.totalPlayers }, records: recs };
        }
      }, 3000); // Wait for showdown animation
    }
  }, [gs?.phase, handCount]);

  if (view === 'dashboard') {
    return (
      <div style={{ minHeight: '100vh', background: '#050709', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" }}>
        <TournamentDashboard state={tournState} onBackToTable={() => setView('table')} />
      </div>
    );
  }

  const bl = tournState.blinds;
  const m = mRatio(tournState.heroChips, bl.sb, bl.bb, bl.ante || 0, 9);

  return (
    <div style={{
      minHeight: '100dvh',
      background: getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey).bg,
      color: '#e0e0e0', fontFamily: "'Segoe UI', -apple-system, sans-serif",
      maxWidth: '800px', margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes chipSlide {
          0% { opacity:0; transform:translate(-50%,-50%) scale(0.3) translateY(20px); }
          60% { opacity:1; transform:translate(-50%,-50%) scale(1.1) translateY(-3px); }
          100% { transform:translate(-50%,-50%) scale(1) translateY(0); }
        }
        @keyframes winPopup {
          0% { opacity:0; transform:translateX(-50%) scale(0.5) translateY(15px); }
          60% { transform:translateX(-50%) scale(1.08) translateY(-2px); }
          100% { opacity:1; transform:translateX(-50%) scale(1) translateY(0); }
        }
        @keyframes dealCard {
          0% { opacity:0; transform:translateY(-50px) rotate(-15deg) scale(0.3); }
          70% { opacity:1; transform:translateY(-3px) rotate(1deg) scale(1.03); }
          100% { transform:translateY(0) rotate(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #1a2230', background: 'rgba(5,7,9,0.9)',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8d48b' }}>{tournState.format.name}</div>
          <div style={{ fontSize: '10px', color: '#3a4a5a' }}>Hand #{handCount + 1} | Level {bl.level + 1}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setView('dashboard')} style={{
            padding: '6px 14px', background: '#0d1118', border: '1px solid #1a2230',
            borderRadius: '8px', color: '#5a7a8a', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
          }}>Dashboard</button>
          <button onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers, apiCalls: ClaudeBossBot.totalCalls })} style={{
            padding: '6px 14px', background: '#1a1015', border: '1px solid #3a1a20',
            borderRadius: '8px', color: '#8a5a5a', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
          }}>Exit</button>
        </div>
      </div>

      {/* HUD */}
      <HUDBar heroChips={tournState.heroChips} pot={gs?.pot || 0} mVal={m}
        position={gs?.heroPosition || '—'} rank={tournState.heroRank}
        blinds={bl} theme={getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey)}
        level={tournState.blindLevel} playersRemaining={tournState.playersRemaining}
        totalPlayers={tournState.totalPlayers} isFinalTable={tournState.isFinalTable}
        payouts={tournState.payouts?.payouts?.slice(0, 3)} />

      {/* Alerts */}
      {tournState.isBubble && (
        <div style={{
          textAlign: 'center', padding: '6px', fontSize: '12px', fontWeight: 700,
          background: 'linear-gradient(90deg, #2a101000, #2a1010, #2a101000)', color: '#e74c3c',
          animation: 'pulse 2s infinite',
        }}>BUBBLE — {tournState.playersRemaining - tournState.payout.paidPlaces} from the money</div>
      )}
      {tournState.isFinalTable && (
        <div style={{
          textAlign: 'center', padding: '6px', fontSize: '12px', fontWeight: 700,
          background: 'linear-gradient(90deg, #2a201000, #2a2010, #2a201000)', color: '#f39c12',
        }}>FINAL TABLE</div>
      )}

      {/* Table */}
      <PremiumTable theme={getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey)} gs={gs || {
        players: tournState.heroTable?.players.filter(p => !p.eliminated).map(p => ({ ...p, position: '', bet: 0, folded: false, allIn: false })) || [],
        community: [], pot: 0, heroCards: [], heroIndex: tournState.heroTable?.players.findIndex(p => p.isHero) || 0,
        dealerIdx: tournState.heroTable?.dealer || 0, phase: 'idle', showdownResults: null, winner: null, potWon: 0,
      }} />

      {/* Controls */}
      {gs?.waitingForHero && (
        <Controls canCheck={gs.canCheck} canCall={gs.toCall > 0} toCall={gs.toCall}
          pot={gs.pot} myChips={gs.heroChips} minRaise={gs.minRaise} maxRaise={gs.maxRaise}
          bigBlind={bl.bb} onAction={handleAction}
          theme={getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey)} />
      )}

      {/* Deal / Eliminated button */}
      {!handActive && (!gs || gs.phase === 'hand_over' || gs.phase === 'idle') && (
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          {tournState.heroEliminated ? (
            <>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#e74c3c', marginBottom: '10px' }}>
                ELIMINATED #{tournState.heroRank} / {tournState.totalPlayers}
              </div>
              <button className="btn-action" onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers, apiCalls: ClaudeBossBot.totalCalls })} style={{
                width: '100%', padding: '18px', border: 'none', borderRadius: '14px',
                background: 'linear-gradient(135deg, #1a3a6c, #2980b9)',
                color: '#fff', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(41,128,185,0.3)',
              }}>VIEW RESULTS</button>
            </>
          ) : (
            <button className="btn-action" onClick={playHand} style={{
              width: '100%', padding: '18px', border: 'none', borderRadius: '14px',
              background: 'linear-gradient(135deg, #1a6a3a, #27ae60)',
              color: '#fff', fontWeight: 800, fontSize: '17px', letterSpacing: '0.5px',
              boxShadow: '0 4px 20px rgba(39,174,96,0.25)',
            }}>DEAL</button>
          )}
        </div>
      )}

      {/* Hand Log */}
      <HandLog entries={gs?.actionLog} />
    </div>
  );
}

// ════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════
const DRILL_MAP = {
  rfi: RFIDrill, '3bet': ThreeBetDrill, bbdef: BBDefenseDrill,
  pushfold: PushFoldDrill, postflop: PostflopDrill, sizing: SizingDrill, potodds: PotOddsDrill,
};

export default function App() {
  const [screen, setScreen] = useState('lobby');
  const [director, setDirector] = useState(null);
  const [activeDrill, setActiveDrill] = useState(null);
  const [debriefData, setDebriefData] = useState(null);

  const appBg = { minHeight: '100vh', background: '#050709', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" };

  if (screen === 'stats') {
    return <div style={appBg}><StatsScreen onBack={() => setScreen('lobby')} /></div>;
  }
  if (screen === 'coach') {
    return <div style={appBg}><CoachScreen onBack={() => setScreen('lobby')} /></div>;
  }
  if (screen === 'drill' && activeDrill) {
    const D = DRILL_MAP[activeDrill];
    if (D) return <div style={appBg}><D onBack={() => setScreen('drills')} /></div>;
  }
  if (screen === 'drills') {
    return <div style={appBg}><DrillMenu
      onSelect={(id) => { setActiveDrill(id); setScreen('drill'); }}
      onBack={() => setScreen('lobby')} /></div>;
  }
  if (screen === 'debrief' && debriefData) {
    return <div style={appBg}><DebriefScreen debrief={debriefData.debrief} finish={debriefData.finish}
      records={debriefData.records} onClose={() => { setDebriefData(null); setScreen('lobby'); }}
      onExport={() => {
        const data = exportSession();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = `session_${Date.now()}.json`; a.click();
      }} /></div>;
  }
  if (screen === 'tournament' && director) {
    return <Game director={director} onExit={(finish) => {
      const records = getRecords();
      if (records.length > 0) {
        saveSession();
        setDebriefData({ debrief: generateDebrief(records), finish: finish || {}, records });
        setScreen('debrief');
      } else { setDirector(null); setScreen('lobby'); }
    }} />;
  }

  return <Lobby
    onStart={(fmt, name) => { startSession(fmt); setDirector(new TournamentDirector(fmt, name)); setScreen('tournament'); }}
    onDrills={() => setScreen('drills')}
    onStats={() => setScreen('stats')}
    onCoach={() => setScreen('coach')} />;
}
