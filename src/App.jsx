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
import { startSession, recordDecision, updateHandResult, saveSession, exportSession, getRecords } from './recorder/ActionRecorder.js';
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

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: '750px', height: 'min(440px, 55vh)',
      margin: '0 auto', overflow: 'hidden',
    }}>
      {/* Ambient light from above */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', width: '50%', height: '30%',
        transform: 'translate(-50%,-30%)',
        background: `radial-gradient(ellipse, ${T.ambientColor} 0%, transparent 70%)`,
        filter: 'blur(30px)', pointerEvents: 'none',
      }} />

      {/* Table shadow on floor */}
      <div style={{
        position: 'absolute', top: '56%', left: '50%', width: '78%', height: '30%',
        transform: 'translate(-50%,-50%)',
        background: 'rgba(0,0,0,0.4)', borderRadius: '50%', filter: 'blur(30px)',
      }} />

      {/* Outer dark rim */}
      <div style={{
        position: 'absolute', top: '10%', left: '6%', width: '88%', height: '70%',
        borderRadius: '50%/42%',
        background: T.rimBg,
        boxShadow: T.rimGlow + ', inset 0 2px 0 ' + T.rimEdge,
        border: '1px solid ' + T.rimBorder,
      }} />

      {/* Edge glow line */}
      <div style={{
        position: 'absolute', top: '10.5%', left: '6.5%', width: '87%', height: '69%',
        borderRadius: '50%/42%',
        border: '1px solid ' + T.rimEdge,
        boxShadow: 'inset 0 0 15px ' + T.ambientColor,
        pointerEvents: 'none',
      }} />

      {/* Felt */}
      <div style={{
        position: 'absolute', top: '13%', left: '9%', width: '82%', height: '64%',
        background: T.feltBg,
        borderRadius: '50%/42%',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.4), inset 0 -10px 40px rgba(0,0,0,0.15)',
      }}>
        {/* Light spot */}
        <div style={{
          position: 'absolute', top: '25%', left: '50%', width: '40%', height: '30%',
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
        {/* Tournament logo on felt */}
        <div style={{
          position: 'absolute', top: '68%', left: '50%', transform: 'translate(-50%,-50%)',
          fontSize: '18px', fontWeight: 900, letterSpacing: '3px',
          color: T.logoColor || T.accent, opacity: 0.12,
          textShadow: `0 0 20px ${T.accentGlow}`,
          userSelect: 'none', pointerEvents: 'none',
        }}>{T.logo || ''}</div>
      </div>

      {/* Pot + To Call — center of table */}
      {gs.pot > 0 && (
        <div style={{
          position: 'absolute', top: '32%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', zIndex: 20,
        }}>
          <div style={{
            fontSize: '13px', color: '#b0b8a8', letterSpacing: '1px', marginBottom: '2px',
          }}>Pot: <span style={{
            fontSize: '22px', fontWeight: 800, color: T.potColor,
            textShadow: T.potShadow,
          }}>{fmt(gs.pot)}</span></div>
          {gs.toCall > 0 && gs.waitingForHero && (
            <div style={{ fontSize: '12px', color: '#8a8a78', letterSpacing: '0.5px' }}>
              To call: <span style={{ color: '#c0b080', fontWeight: 700 }}>{fmt(gs.toCall)}</span>
            </div>
          )}
        </div>
      )}

      {/* Community cards */}
      {gs.community.length > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', gap: '6px', zIndex: 15,
        }}>
          {gs.community.map((c, i) => <Card key={c + i} card={c} mini delay={i * 220} />)}
        </div>
      )}

      {/* Seats */}
      {seated.map((p, si) => {
        if (!p || (p.folded && gs.phase !== 'showdown')) return null;
        const pos = SEATS_9[si % SEATS_9.length];
        const isHero = si === 0;
        const sd = sdMap[p.id];
        const isWinner = gs.winner?.id === p.id;
        const isDealer = gs.players.indexOf(p) === gs.dealerIdx;
        const betOff = BET_OFFSETS[si % BET_OFFSETS.length];

        return (
          <React.Fragment key={p.id}>
            {/* Bet chips (separate from seat, positioned between seat and center) */}
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
              width: isHero ? '92px' : '80px',
              transition: 'opacity 0.4s ease',
              opacity: p.folded ? 0.3 : 1,
            }}>
              {/* Avatar */}
              <div style={{
                width: isHero ? 46 : p._isBoss ? 42 : 38, height: isHero ? 46 : p._isBoss ? 42 : 38, borderRadius: '50%',
                margin: '0 auto 2px',
                background: isWinner ? T.avatarWin : isHero ? T.avatarHero : p._isBoss ? 'linear-gradient(135deg, #8a6a10, #d4af37)' : T.avatarBot,
                border: `${p._isBoss ? '3px' : '2.5px'} solid ${isWinner ? T.accent : isHero ? T.accent + '88' : p._isBoss ? '#d4af37' : '#2a3a5a44'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isHero ? '18px' : '14px',
                boxShadow: isWinner
                  ? `0 0 24px ${T.accentGlow}, 0 0 48px ${T.ambientColor}`
                  : isHero ? `0 0 16px ${T.accentGlow}`
                  : p._isBoss ? '0 0 16px rgba(212,175,55,0.5), 0 0 32px rgba(212,175,55,0.2)'
                  : '0 3px 10px rgba(0,0,0,0.4)',
                animation: p._isBoss && !isWinner ? 'goldPulse 2s ease-in-out infinite' : 'none',
                transition: 'box-shadow 0.5s ease',
              }}>
                {p.emoji || (isHero ? '👤' : '🤖')}
              </div>

              {/* Position */}
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#4a6a7a', letterSpacing: '0.5px' }}>{p.position}</div>

              {/* Name */}
              <div style={{
                fontSize: isHero ? '11px' : '10px', fontWeight: 600,
                color: isHero ? T.accent : '#7a8a9a',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px',
              }}>
                {isHero ? 'HERO' : p.name}
              </div>
              {p._isBoss && !isHero && (
                <div style={{
                  fontSize: '8px', fontWeight: 800, color: '#d4af37',
                  background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
                  padding: '1px 6px', borderRadius: '6px', display: 'inline-block',
                  letterSpacing: '1px',
                }}>👑 AI PRO</div>
              )}

              {/* Cards */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '3px 0', minHeight: isHero ? '52px' : '34px' }}>
                {isHero && gs.heroCards?.length > 0 ? (
                  gs.heroCards.map((c, ci) => <Card key={c} card={c} hero glow delay={ci * 300} />)
                ) : showdown && sd?.cards ? (
                  sd.cards.map((c, ci) => <Card key={c} card={c} mini delay={200 + ci * 200} />)
                ) : !isHero && !p.folded ? (
                  <><Card card="Xx" faceDown mini delay={si * 60} /><Card card="Xx" faceDown mini delay={si * 60 + 80} /></>
                ) : null}
              </div>

              {/* Timer bar — only for hero when waiting */}
              {isHero && gs.waitingForHero && (
                <div style={{
                  width: '80%', height: '4px', borderRadius: '2px', margin: '4px auto 0',
                  background: '#1a2230', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    background: 'linear-gradient(90deg, #28a745, #d4af37, #dc3545)',
                    animation: 'timerShrink 30s linear forwards',
                  }} />
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

              {/* Chip count */}
              <div style={{
                fontSize: '11px', fontWeight: 700, color: T.chipColor,
                background: 'rgba(0,0,0,0.5)', padding: '2px 10px', borderRadius: '12px',
                display: 'inline-block', marginTop: '2px',
                backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.04)',
              }}>{fmt(p.chips)}</div>

              {/* All-in */}
              {p.allIn && (
                <div style={{
                  fontSize: '9px', fontWeight: 800, color: '#fff',
                  background: T.allInBg, color: T.allInColor,
                  padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '2px',
                  animation: 'pulse 1.5s infinite',
                  boxShadow: '0 0 8px rgba(231,76,60,0.4)',
                }}>ALL-IN</div>
              )}

              {/* Dealer */}
              {isDealer && (
                <div style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                  color: '#1a1a00', fontSize: '11px', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(255,215,0,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                }}>D</div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Winner popup */}
      {gs.phase === 'showdown' && gs.winner && (
        <div style={{
          position: 'absolute', bottom: '2%', left: '50%', transform: 'translateX(-50%)',
          background: T.winBg, backdropFilter: 'blur(12px)',
          padding: '10px 30px', borderRadius: '24px', zIndex: 30,
          border: '1.5px solid ' + T.winBorder,
          boxShadow: T.winGlow,
          animation: 'winPopup 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: T.accent }}>
            {gs.winner.isHero ? '🏆 You win ' : `${gs.winner.name} wins `}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#e0e0e0' }}>{fmt(gs.potWon)}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// HUD BAR — Cinematic minimal
// ════════════════════════════════════════════
function HUDBar({ heroChips, pot, mVal, position, rank, blinds }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: '6px 10px',
      background: 'linear-gradient(180deg, rgba(10,13,18,0.95), rgba(13,17,24,0.95))',
      borderBottom: '1px solid #1a223055', fontSize: '11px',
      backdropFilter: 'blur(8px)',
    }}>
      {[
        { label: 'STACK', val: fmt(heroChips), color: '#d4af37' },
        { label: 'POT', val: fmt(pot), color: '#c0c0c0' },
        { label: 'BLINDS', val: `${fmt(blinds.sb)}/${fmt(blinds.bb)}`, color: '#6a7a8a', small: true },
        { label: 'M', val: mVal.toFixed(0), color: mVal < 10 ? '#dc3545' : mVal < 20 ? '#d4af37' : '#28a745' },
        { label: 'RANK', val: `#${rank}`, color: '#9aa' },
        { label: 'POS', val: position || '—', color: '#6a7a8a', small: true },
      ].map((h, i) => (
        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ color: '#4a5a6a', fontSize: '9px', letterSpacing: '1px', fontWeight: 600 }}>{h.label}</div>
          <div style={{
            color: h.color, fontWeight: 700, fontSize: h.small ? '11px' : '14px', marginTop: '1px',
            textShadow: h.color === '#d4af37' ? '0 0 10px rgba(212,175,55,0.2)' : 'none',
          }}>{h.val}</div>
        </div>
      ))}
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
        const ai = new AdaptiveAI(p.profile);
        if (isHardcore || i === bossIdx) {
          p._isBoss = true;
          ai.exploitLevel = isHardcore ? 0.5 : 0.3;
          ai.minHandsToExploit = isHardcore ? 3 : 5;
        }
        bots[p.id] = ai;
      }
      aiBotsRef.current = bots;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      dirRef.current.simulateBackgroundTick(3);
      dirRef.current.checkBlindLevel();
      setTourn(dirRef.current.getState());
    }, 5000); // Background sim every 5s
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
    for (const ha of heroActions) {
      recordDecision({
        handNumber: handCount,
        blindLevel: tState.blindLevel,
        blinds: tState.blinds,
        playersRemaining: tState.playersRemaining,
        totalPlayers: tState.totalPlayers,
        averageStack: tState.averageStack,
        isBubble: tState.isBubble,
        isFinalTable: tState.isFinalTable,
        tableId: tState.heroTable?.id,
        playersAtTable: gs.players?.length || 9,
        stage: ha._phase || 'preflop',
        position: ha.position || gs.heroPosition,
        holeCards: gs.heroCards || [],
        community: gs.community || [],
        potSize: gs.pot || 0,
        currentBet: gs.currentBet || 0,
        toCall: ha._toCall || 0,
        myChips: hero.chips,
        myBet: ha.amount || 0,
        opponents: gs.players?.filter(p => !p.isHero && !p.folded).map(p => ({
          name: p.name, position: p.position, chips: p.chips,
          style: p.profile?.style, observedVpip: p.profile?.vpip,
        })) || [],
        action: ha.action,
        raiseAmount: ha.action === 'raise' ? ha.amount : null,
        decisionTimeMs: ha._decisionTimeMs || 0,
      });
    }

    // Update hand result
    const heroWon = gs.winner?.isHero;
    updateHandResult(handCount, heroWon ? 'won' : 'lost', heroWon ? gs.potWon : 0, hero.chips, gs.allHoleCards);

    // Auto-save session after every hand (so data is never lost)
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
      minHeight: '100vh',
      background: getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey).bg,
      color: '#e0e0e0', fontFamily: "'Segoe UI', -apple-system, sans-serif",
      maxWidth: '800px', margin: '0 auto',
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
          <button onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers })} style={{
            padding: '6px 14px', background: '#1a1015', border: '1px solid #3a1a20',
            borderRadius: '8px', color: '#8a5a5a', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
          }}>Exit</button>
        </div>
      </div>

      {/* HUD */}
      <HUDBar heroChips={tournState.heroChips} pot={gs?.pot || 0} mVal={m}
        position={gs?.heroPosition || '—'} rank={tournState.heroRank}
        blinds={bl} playersLeft={tournState.playersRemaining} total={tournState.totalPlayers} />

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
          bigBlind={bl.bb} onAction={handleAction} />
      )}

      {/* Deal / Eliminated button */}
      {!handActive && (!gs || gs.phase === 'hand_over' || gs.phase === 'idle') && (
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          {tournState.heroEliminated ? (
            <>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#e74c3c', marginBottom: '10px' }}>
                ELIMINATED #{tournState.heroRank} / {tournState.totalPlayers}
              </div>
              <button className="btn-action" onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers })} style={{
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
