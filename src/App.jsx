import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TournamentDirector } from './tournament/TournamentDirector.js';
import { FORMATS } from './data/tournamentFormats.js';
import { CASH_FORMATS } from './data/cashFormats.js';
import { GameEngine, PHASE } from './engine/GameEngine.js';
import { AdaptiveAI } from './engine/adaptiveAI.js';
import { mRatio } from './engine/equity.js';
import { evaluateHand, compareHands } from './engine/evaluator.js';
import Card from './components/Card.jsx';
import Controls from './tournament/Controls.jsx';
import RangeGrid from './components/RangeGrid.jsx';
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
import PersonalizedDrill from './drills/PersonalizedDrill.jsx';
import RiverDrill from './drills/RiverDrill.jsx';
import StatsScreen from './stats/Dashboard.jsx';
import CoachScreen from './coach/Coach.jsx';
import { Sounds } from './lib/sounds.js';
import { getLiveTell } from './lib/liveTells.js';
import { getTheme } from './lib/themes.js';
import { ClaudeBossBot } from './engine/claudeAI.js';
import { generateProfile } from './data/aiProfiles.js';

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
  const [showFormats, setShowFormats] = useState(false);

  // Bankroll from localStorage
  const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
  const bankroll = 10000 + sessions.length * 500;

  const btnPress = (e) => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.filter = 'brightness(1.1)'; };
  const btnRelease = (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; };

  return (
    <div style={{
      minHeight: '100dvh', color: '#e0e0e0',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      background: '#080a0f', position: 'relative', overflow: 'hidden',
    }}>
      {/* ═══ ANIMATED BACKGROUND ═══ */}
      <style>{`
        @keyframes bgGlow {
          0%, 100% { opacity: 0.4; transform: scale(1) translateY(0); }
          50% { opacity: 0.7; transform: scale(1.1) translateY(-10px); }
        }
        @keyframes bgGlow2 {
          0%, 100% { opacity: 0.3; transform: scale(1.1) translateX(10px); }
          50% { opacity: 0.5; transform: scale(1) translateX(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Fire/amber glow orbs */}
      <div style={{ position: 'absolute', top: '-20%', left: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,40,0.15), transparent 70%)', animation: 'bgGlow 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,80,20,0.12), transparent 70%)', animation: 'bgGlow2 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '-5%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(160,120,40,0.10), transparent 70%)', animation: 'bgGlow 10s ease-in-out infinite 2s', pointerEvents: 'none' }} />

      {/* Dark gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,10,15,0.3) 0%, rgba(8,10,15,0.7) 50%, rgba(8,10,15,0.95) 100%)', pointerEvents: 'none' }} />

      {/* ═══ CONTENT ═══ */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto', padding: '0 20px' }}>

        {/* ═══ LOGO ═══ */}
        <div style={{ textAlign: 'center', paddingTop: '40px', marginBottom: '24px' }}>
          <div style={{ fontSize: '42px', lineHeight: 1, color: '#2a3a5a', marginBottom: '-4px' }}>♠</div>
          <div style={{
            fontSize: '32px', fontWeight: 900, letterSpacing: '4px',
            background: 'linear-gradient(135deg, #ffd700, #e8b830, #c8961a, #ffd700)',
            backgroundSize: '200% auto',
            animation: 'shimmer 4s linear infinite',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 12px rgba(212,175,55,0.25))',
          }}>POKER TRAINER</div>
        </div>

        {/* ═══ PLAYER CARD ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 18px', borderRadius: '14px', marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(15,20,30,0.9), rgba(20,28,40,0.9))',
          border: '1px solid #1a2a3a', backdropFilter: 'blur(8px)',
        }}>
          {/* Avatar */}
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%',
            background: 'linear-gradient(145deg, #1a2a40, #0a1520)',
            border: '2px solid #2a4060', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: '#4a6a8a', flexShrink: 0,
          }}>♠</div>
          <div style={{ flex: 1 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Hero"
              style={{
                width: '100%', padding: 0, background: 'transparent', border: 'none',
                color: '#e0e0e0', fontSize: '18px', fontWeight: 700, outline: 'none',
              }} />
          </div>
          <div style={{
            fontSize: '16px', fontWeight: 800,
            color: '#ffd700', textShadow: '0 0 10px rgba(212,175,55,0.3)',
          }}>${bankroll.toLocaleString()}</div>
        </div>

        {/* ═══ MAIN BUTTONS ROW ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => { setShowFormats(!showFormats); }} style={{
            padding: '18px 14px', borderRadius: '14px', border: '1px solid #1a4a2a',
            background: 'linear-gradient(160deg, #0a2a14, #1a5a30, #0a3018)',
            color: '#fff', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px',
            cursor: 'pointer', transition: 'transform 0.12s, filter 0.12s',
            boxShadow: '0 4px 20px rgba(30,100,50,0.2)',
          }} onMouseDown={btnPress} onMouseUp={btnRelease} onTouchStart={btnPress} onTouchEnd={btnRelease}>
            <div style={{ fontSize: '12px', marginBottom: '2px' }}>♛</div>
            START TOURNAMENT
          </button>
          <button onClick={onDrills} style={{
            padding: '18px 14px', borderRadius: '14px', border: '1px solid #1a3060',
            background: 'linear-gradient(160deg, #0a1a3a, #1a4080, #0a2050)',
            color: '#fff', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px',
            cursor: 'pointer', transition: 'transform 0.12s, filter 0.12s',
            boxShadow: '0 4px 20px rgba(30,60,130,0.2)',
          }} onMouseDown={btnPress} onMouseUp={btnRelease} onTouchStart={btnPress} onTouchEnd={btnRelease}>
            <div style={{ fontSize: '12px', marginBottom: '2px' }}>◎</div>
            TRAINING DRILLS
          </button>
        </div>

        {/* ═══ FORMAT SELECTOR (expandable) ═══ */}
        {showFormats && (
          <div style={{
            padding: '12px', borderRadius: '14px', marginBottom: '10px',
            background: 'rgba(10,14,20,0.95)', border: '1px solid #141e2a',
            animation: 'floatUp 0.25s ease-out',
          }}>
            {Object.entries(FORMATS).map(([key, f]) => (
              <div key={key} onClick={() => setFormat(key)} style={{
                padding: '10px 12px', borderRadius: '10px', marginBottom: '4px', cursor: 'pointer',
                background: format === key ? 'rgba(212,175,55,0.08)' : 'transparent',
                border: format === key ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: format === key ? '#ffd700' : '#8a9aaa' }}>{f.name}</span>
                    {f.speed && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#5a6a7a' }}>{f.speed}</span>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: format === key ? '#ffd700' : '#2a3a4a' }}>${f.buyIn.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3a4a5a', marginTop: '2px' }}>{f.players} players · {f.startingChips.toLocaleString()} chips</div>
              </div>
            ))}
            <button onClick={() => { onStart(format, name || 'Hero'); setShowFormats(false); }} style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '6px',
              background: 'linear-gradient(135deg, #1a6a3a, #22a050)',
              color: '#fff', fontWeight: 800, fontSize: '15px',
              boxShadow: '0 4px 16px rgba(34,160,80,0.25)',
            }} onMouseDown={btnPress} onMouseUp={btnRelease}>REGISTER — {FORMATS[format]?.name}</button>
          </div>
        )}

        {/* ═══ HARDCORE ═══ */}
        <div onClick={() => onStart('HARDCORE', name || 'Hero')} style={{
          padding: '16px 18px', borderRadius: '14px', cursor: 'pointer', marginBottom: '14px',
          background: 'linear-gradient(135deg, #1a0505, #3a0a0a, #2a0808)',
          border: '1px solid rgba(200,30,30,0.25)', position: 'relative', overflow: 'hidden',
          transition: 'transform 0.12s',
        }} onMouseDown={btnPress} onMouseUp={btnRelease} onTouchStart={btnPress} onTouchEnd={btnRelease}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '100%', background: 'radial-gradient(circle at 100% 50%, rgba(200,30,30,0.12), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '24px' }}>☠</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#ff4040', letterSpacing: '1px' }}>HARDCORE — 5 AI PRO vs YOU</div>
              <div style={{ fontSize: '10px', color: '#5a2a2a', marginTop: '2px' }}>6-Max, no mercy, adaptive opponents</div>
            </div>
          </div>
        </div>

        {/* ═══ CASH GAME ═══ */}
        <div style={{ fontSize: '10px', color: '#3a4a5a', fontWeight: 700, letterSpacing: '2px', marginBottom: '8px' }}>CASH GAME</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {Object.entries(CASH_FORMATS).map(([key, f]) => (
            <div key={key} onClick={() => onStart(key, name || 'Hero')} style={{
              padding: '14px', borderRadius: '12px', cursor: 'pointer',
              background: 'linear-gradient(160deg, #081410, #0c2418)',
              border: '1px solid #1a3020', transition: 'transform 0.12s',
            }} onMouseDown={btnPress} onMouseUp={btnRelease} onTouchStart={btnPress} onTouchEnd={btnRelease}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#27ae60' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#2a4a30', marginTop: '2px' }}>{f.playersPerTable}-max | {f.buyIn} chips</div>
            </div>
          ))}
        </div>

        {/* ═══ STATS & COACH ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <button onClick={onStats} style={{
            padding: '16px', borderRadius: '12px', border: '1px solid #1a2230', cursor: 'pointer',
            background: 'rgba(10,14,20,0.8)', color: '#8a9aaa', fontWeight: 700, fontSize: '14px',
            transition: 'transform 0.12s',
          }} onMouseDown={btnPress} onMouseUp={btnRelease}>Statistics</button>
          <button onClick={onCoach} style={{
            padding: '16px', borderRadius: '12px', border: '1px solid #1a2230', cursor: 'pointer',
            background: 'rgba(10,14,20,0.8)', color: '#8a9aaa', fontWeight: 700, fontSize: '14px',
            transition: 'transform 0.12s',
          }} onMouseDown={btnPress} onMouseUp={btnRelease}>AI Coach</button>
        </div>

        {/* ═══ QUICK DRILLS ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', paddingBottom: '40px' }}>
          {[
            { id: 'rfi', label: 'RFI', color: '#27ae60' },
            { id: 'pushfold', label: 'Push', color: '#e74c3c' },
            { id: 'potodds', label: 'Odds', color: '#3498db' },
            { id: 'postflop', label: 'Flop', color: '#9b59b6' },
          ].map(d => (
            <div key={d.id} onClick={() => { window.__quickDrill = d.id; onDrills(); }} style={{
              padding: '12px 4px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
              background: 'rgba(10,14,20,0.8)', border: '1px solid #141a22',
              transition: 'transform 0.12s',
            }} onMouseDown={btnPress} onMouseUp={btnRelease} onTouchStart={btnPress} onTouchEnd={btnRelease}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: d.color }}>{d.label}</div>
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

function PremiumTable({ gs, theme: T, chipsBeforeHand }) {
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
        {/* Bokeh background lights */}
        {[
          { x: '15%', y: '8%', s: 60, o: 0.06 },
          { x: '80%', y: '12%', s: 45, o: 0.04 },
          { x: '10%', y: '75%', s: 35, o: 0.03 },
          { x: '85%', y: '70%', s: 50, o: 0.05 },
          { x: '50%', y: '5%', s: 80, o: 0.07 },
          { x: '30%', y: '90%', s: 40, o: 0.03 },
          { x: '70%', y: '85%', s: 30, o: 0.04 },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', left: b.x, top: b.y, width: b.s, height: b.s,
            borderRadius: '50%', pointerEvents: 'none',
            background: `radial-gradient(circle, ${T.accent}${Math.round(b.o * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            filter: 'blur(15px)',
          }} />
        ))}

        {/* Ambient top light */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', width: '60%', height: '35%',
          transform: 'translate(-50%,-30%)',
          background: `radial-gradient(ellipse, ${T.ambientColor} 0%, transparent 70%)`,
          filter: 'blur(25px)', pointerEvents: 'none',
        }} />

        {/* Table shadow */}
        <div style={{
          position: 'absolute', top: '58%', left: '50%', width: '80%', height: '32%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.5)', borderRadius: '50%', filter: 'blur(25px)',
        }} />

        {/* Outer metallic rim — thicker, more pronounced */}
        <div style={{
          position: 'absolute', top: '9%', left: '5%', width: '90%', height: '74%',
          borderRadius: '50%/42%',
          background: T.rimBg,
          boxShadow: T.rimGlow + ', inset 0 3px 0 ' + T.rimEdge + ', inset 0 -2px 0 rgba(0,0,0,0.3)',
          border: '3px solid ' + T.rimBorder,
        }} />

        {/* Inner rim highlight */}
        <div style={{
          position: 'absolute', top: '10.2%', left: '6%', width: '88%', height: '71.6%',
          borderRadius: '50%/42%',
          border: '1.5px solid ' + T.rimEdge,
          boxShadow: 'inset 0 0 20px ' + T.ambientColor,
          pointerEvents: 'none',
        }} />

        {/* Felt — richer gradient + noise texture overlay */}
        <div style={{
          position: 'absolute', top: '13%', left: '8.5%', width: '83%', height: '66%',
          background: T.feltBg,
          borderRadius: '50%/42%',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5), inset 0 -12px 40px rgba(0,0,0,0.2), inset 0 6px 20px rgba(255,255,255,0.02)',
        }}>
          {/* Felt texture grain */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%/42%',
            opacity: 0.03, pointerEvents: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundSize: '100px',
          }} />
          {/* Light spot from above */}
          <div style={{
            position: 'absolute', top: '15%', left: '50%', width: '50%', height: '35%',
            transform: 'translate(-50%, 0)',
            background: `radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)`,
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          {/* Inner felt line */}
          <div style={{
            position: 'absolute', top: '6%', left: '5%', width: '90%', height: '88%',
            borderRadius: '50%/42%',
            border: '1.5px solid ' + T.feltInner,
          }} />
          {/* Tournament logo */}
          <div style={{
            position: 'absolute', top: '68%', left: '50%', transform: 'translate(-50%,-50%)',
            fontSize: '26px', fontWeight: 900, letterSpacing: '5px',
            fontFamily: T.logoFont || "'Georgia', serif",
            color: T.logoColor || T.accent, opacity: 0.25,
            textShadow: `0 0 30px ${T.accentGlow}, 0 2px 4px rgba(0,0,0,0.3)`,
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

        {/* ═══ Community cards — larger with shadow ═══ */}
        {gs.community.length > 0 && (
          <div style={{
            position: 'absolute', top: '51%', left: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', gap: '4px', zIndex: 15,
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
          }}>
            {gs.community.map((c, i) => <Card key={c + i} card={c} delay={i * 220} />)}
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

                {/* Avatar — style-colored circle (tappable for stats) */}
                <div onClick={() => { if (typeof gs._onSelectOpponent === 'function') gs._onSelectOpponent(p); }} style={{
                  width: 46, height: 46, borderRadius: '50%', margin: '0 auto', cursor: 'pointer',
                  background: isWinner ? T.avatarWin : (() => {
                    const sc = { TAG: '#0a2040', LAG: '#3a1800', Nit: '#1a1a1a', SemiLAG: '#1a1040', STATION: '#0a2a0a', LIMPER: '#1a2a10', Maniac: '#3a0a0a', SCARED_MONEY: '#2a2a1a', TILTER: '#3a1a00' };
                    const baseC = p._isBoss ? '#4a3510' : (sc[p.profile?.style] || '#1a2030');
                    const lightC = p._isBoss ? '#b8922a' : baseC.replace(/0/g, '4').replace(/1/g, '3');
                    return `linear-gradient(145deg, ${baseC}, ${lightC})`;
                  })(),
                  border: `2.5px solid ${isWinner ? T.accent : p._isBoss ? '#c8a230' : (() => {
                    const bc = { TAG: '#2a60a0', LAG: '#c06020', Nit: '#5a5a5a', SemiLAG: '#6a40a0', STATION: '#2a6a2a', Maniac: '#c02020' };
                    return (bc[p.profile?.style] || '#3a4a5a') + '88';
                  })()}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '17px', fontWeight: 800,
                  color: isWinner ? '#fff' : p._isBoss ? '#1a0a00' : '#8a9aaa',
                  boxShadow: isWinner
                    ? `0 0 24px ${T.accentGlow}, 0 0 48px ${T.ambientColor}`
                    : p._isBoss ? '0 0 18px rgba(212,175,55,0.5), inset 0 -4px 8px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)',
                  willChange: 'transform',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {p.emoji || (p.name || 'P')[0].toUpperCase()}
                  {/* Glossy top highlight */}
                  <div style={{
                    position: 'absolute', top: 0, left: '10%', width: '80%', height: '45%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                    borderRadius: '50%', pointerEvents: 'none',
                  }} />
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

                {/* AI PRO badge */}
                {p._isBoss && (
                  <div style={{
                    fontSize: '8px', fontWeight: 800, color: '#d4af37',
                    background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
                    padding: '1px 6px', borderRadius: '6px', display: 'inline-block',
                    letterSpacing: '1px', marginTop: '2px',
                  }}>AI PRO</div>
                )}

                {/* Stack badge */}
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: T.chipColor,
                  background: 'rgba(0,0,0,0.75)', padding: '4px 12px', borderRadius: '14px',
                  display: 'inline-block', marginTop: '3px',
                  backdropFilter: 'blur(6px)', border: `1px solid ${T.accent}25`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
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

        {/* Winner popup + chip animation */}
        {gs.phase === 'showdown' && gs.winner && (
          <>
            {/* Flying chip particles */}
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                position: 'absolute', top: '40%', left: '50%',
                width: '14px', height: '14px', borderRadius: '50%', zIndex: 25,
                background: `linear-gradient(135deg, ${i % 2 === 0 ? '#ffd700' : '#e8a800'}, ${i % 2 === 0 ? '#e8a800' : '#d4af37'})`,
                border: '1px solid rgba(255,255,255,0.3)',
                animation: `chipFly${i} 0.8s ease-out ${i * 0.1}s forwards`,
                opacity: 0,
              }} />
            ))}
            <div style={{
              position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)',
              background: T.winBg, backdropFilter: 'blur(12px)',
              padding: '10px 30px', borderRadius: '20px', zIndex: 30,
              border: '1.5px solid ' + T.winBorder,
              boxShadow: T.winGlow,
              animation: 'winPopup 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: T.accent }}>
                {gs.isSplitPot ? 'Split pot ' : gs.winner.isHero ? 'You win ' : `${gs.winner.name} wins `}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#e0e0e0' }}>+{gs.winner.isHero ? fmt(gs.heroChips - (chipsBeforeHand || 0)) : fmt(gs.potWon)}</span>
            </div>
          </>
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
        {/* Hero cards */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minHeight: '54px' }}>
          {gs.heroCards?.length > 0 && gs.heroCards.map((c, ci) => (
            <Card key={c} card={c} hero glow delay={ci * 300} />
          ))}
        </div>
        {/* Hand strength meter */}
        {gs.waitingForHero && gs.heroCards?.length > 0 && (() => {
          const str = gs.handStrength ?? 0.5;
          const barColor = str > 0.7 ? '#27ae60' : str > 0.5 ? '#f1c40f' : str > 0.3 ? '#e67e22' : '#e74c3c';
          return (
            <div style={{ width: '80%', margin: '4px auto 0', height: '3px', background: '#1a2230', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(str * 100)}%`, background: barColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
            </div>
          );
        })()}
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
function HUDBar({ heroChips, pot, mVal, position, rank, blinds, theme, level, playersRemaining, totalPlayers, isFinalTable, payouts, levelTimeRemaining }) {
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
      {/* Tournament progress bar */}
      {playersRemaining && totalPlayers > 1 && (
        <div style={{ padding: '0 12px 4px' }}>
          <div style={{ height: '3px', background: '#0a0e14', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%', borderRadius: '2px', transition: 'width 0.8s ease',
              width: `${Math.max(2, (1 - (rank || playersRemaining) / totalPlayers) * 100)}%`,
              background: rank <= Math.ceil(totalPlayers * 0.15) ? 'linear-gradient(90deg, #27ae60, #2ecc71)' :
                rank <= Math.ceil(totalPlayers * 0.20) ? 'linear-gradient(90deg, #f39c12, #e67e22)' :
                'linear-gradient(90deg, #3498db, #2980b9)',
            }} />
          </div>
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
          {levelTimeRemaining != null && (
            <span style={{
              color: levelTimeRemaining < 30 ? '#dc3545' : levelTimeRemaining < 60 ? '#d4af37' : '#5a6a7a',
              fontWeight: levelTimeRemaining < 30 ? 700 : 400,
            }}> · {Math.floor(levelTimeRemaining / 60)}:{String(Math.floor(levelTimeRemaining % 60)).padStart(2, '0')}</span>
          )}
          {playersRemaining && <span style={{ color: '#5a6a7a' }}> · {playersRemaining}/{totalPlayers}</span>}
        </div>
        {/* Right: Rank + M + Sound toggle */}
        <div style={{ textAlign: 'right', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#7a8a9a' }}>#{rank}</span>
          <span style={{
            fontWeight: 700,
            color: mVal < 10 ? '#dc3545' : mVal < 20 ? '#d4af37' : '#28a745',
          }}>M{mVal.toFixed(0)}</span>
          <span onClick={() => { Sounds.toggle(); }} style={{
            cursor: 'pointer', fontSize: '16px', opacity: 0.6,
            WebkitTapHighlightColor: 'transparent',
          }}>{Sounds.enabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'}</span>
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
      background: '#0a0d14', borderRadius: '10px', padding: '6px 12px', margin: '4px 14px 6px',
      border: '1px solid #1a2230', maxHeight: '80px', overflowY: 'auto',
    }}>
      <div style={{ fontSize: '9px', color: '#3a4a5a', fontWeight: 700, letterSpacing: '1px', marginBottom: '3px' }}>HAND LOG</div>
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
  const [showRange, setShowRange] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [postHandTip, setPostHandTip] = useState(null);
  const [botChat, setBotChat] = useState(null);
  const [tellHint, setTellHint] = useState(null);
  const [liveMode, setLiveMode] = useState(false);
  const [showTrainer, setShowTrainer] = useState(false);

  const dirRef = useRef(director);
  const engineRef = useRef(new GameEngine());
  const aiBotsRef = useRef({});
  const chipsBeforeHandRef = useRef(0);

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
        localAI.loadHistoricalProfile();
        // #26: One mirror bot per table (last non-boss bot)
        if (i === botPlayers.length - 1 && !isHardcore) {
          localAI.isMirror = true;
          p._isMirror = true;
        }
        if (isHardcore || i === bossIdx) {
          p._isBoss = true;
          localAI.exploitLevel = isHardcore ? 0.5 : 0.3;
          localAI.minHandsToExploit = isHardcore ? 3 : 5;
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
      dirRef.current.simulateBackgroundTick(3);
      dirRef.current.checkBlindLevel();
      setTourn(dirRef.current.getState());
    }, 3000); // Background sim every 3s — ~10 min to final table
    return () => clearInterval(iv);
  }, []);

  const playHand = useCallback(async () => {
    if (handActive) return;
    setHandActive(true);
    try {
    const tState = dirRef.current.getState();
    if (!tState.heroTable || tState.heroEliminated) { setHandActive(false); return; }
    const tablePlayers = tState.heroTable.players.filter(p => !p.eliminated && p.chips > 0);
    if (tablePlayers.length < 2) { setHandActive(false); return; }
    // Capture hero chips BEFORE blinds/antes are posted
    const heroBeforeHand = tablePlayers.find(p => p.isHero);
    const chipsBeforeHand = heroBeforeHand?.chips || 0;
    chipsBeforeHandRef.current = chipsBeforeHand;
    const engine = engineRef.current;
    const blinds = tState.blinds;
    const dealer = tState.heroTable.dealer % tablePlayers.length;
    if (handCount === 0) ClaudeBossBot.resetCalls();
    engine.setTournamentContext(tState.stage, tState.isFinalTable, tState.isBubble);
    if (!engine.startHand(tablePlayers, dealer, blinds, aiBotsRef.current)) { setHandActive(false); return; }
    Sounds.deal(); // Deal sound on new hand
    setGs(engine.getState());
    await engine.runHand((state) => setGs({ ...state }));
    const isCashGame = dirRef.current.format?.isCash;
    for (const p of tablePlayers) {
      if (p.chips <= 0 && !p.eliminated) {
        if (isCashGame) {
          // Cash: mark for replacement (respawn after 2-5 hands)
          p._respawnIn = 2 + Math.floor(Math.random() * 4);
          p.eliminated = true;
        } else {
          dirRef.current.pool.eliminate(p.id);
        }
      }
    }
    // Cash game: respawn eliminated bots
    if (isCashGame) {
      const heroTable = dirRef.current.tableManager?.getHeroTable();
      if (heroTable) {
        for (const p of heroTable.players) {
          if (p.eliminated && p._respawnIn != null) {
            p._respawnIn--;
            if (p._respawnIn <= 0) {
              // New player sits down with random stack (40-100% of buy-in)
              const buyIn = dirRef.current.format.startingChips || 1000;
              p.chips = Math.floor(buyIn * (0.4 + Math.random() * 0.6));
              p.eliminated = false;
              p._respawnIn = null;
              // New profile
              const newProf = generateProfile(Date.now() + Math.random() * 1000, dirRef.current.format.fieldLevel || 'micro');
              p.name = newProf.name;
              p.profile = newProf;
              p.emoji = newProf.emoji;
              p._isBoss = false;
              // New AI bot
              const newAI = new AdaptiveAI(newProf);
              newAI.loadHistoricalProfile();
              aiBotsRef.current[p.id] = newAI;
            }
          }
        }
      }
    }
    const heroTable = dirRef.current.tableManager.getHeroTable();
    if (heroTable) {
      const alive = heroTable.players.filter(p => !p.eliminated);
      heroTable.dealer = (heroTable.dealer + 1) % Math.max(1, alive.length);
    }
    dirRef.current.checkBlindLevel();
    setTourn(dirRef.current.getState());
    setHandCount(c => c + 1);
    } catch (e) {
      console.error('playHand error:', e);
    }
    setHandActive(false);
  }, [handActive]);

  const handleAction = useCallback((action, amount) => {
    // Play sound for hero action
    if (action === 'fold') Sounds.fold();
    else if (action === 'check') Sounds.check();
    else if (action === 'call') Sounds.call();
    else if (action === 'raise' && amount >= (gs?.heroChips || 0)) { Sounds.allIn(); navigator.vibrate?.(200); }
    else if (action === 'raise') Sounds.raise();
    engineRef.current.submitHeroAction(action, amount);
  }, [gs]);

  // Live tell when facing bet
  useEffect(() => {
    try {
      if (!liveMode || !gs?.waitingForHero || (gs?.toCall || 0) <= 0) { setTellHint(null); return; }
      const tell = getLiveTell(gs.handStrength || 0.5, 'raise');
      setTellHint(tell);
    } catch (e) { setTellHint(null); }
  }, [gs?.waitingForHero, gs?.toCall, liveMode]);

  // Record hero decisions after each hand completes
  useEffect(() => {
    if (!gs || gs.phase !== 'hand_over') return;
    try {
    const chipsBeforeHand = chipsBeforeHandRef.current;
    const tState = dirRef.current.getState();
    const hero = gs.players?.find(p => p.isHero);
    if (!hero) return;

    // Find hero actions from the log
    const heroActions = (gs.actionLog || []).filter(a => a.isHero && a.action !== 'win');

    // Build readable streetActions chain for each hero action
    const buildStreetChain = (upToIdx) => {
      const acts = gs.actionLog || [];
      const chain = [];
      for (let i = 0; i < upToIdx && i < acts.length; i++) {
        const a = acts[i];
        if (!a.action || a.action === 'win' || a.action === '') continue;
        const who = a.isHero ? 'Hero' : a.name;
        const pos = a.position ? `[${a.position}]` : '';
        chain.push(`${pos} ${who} ${a.action}${a.amount ? ' ' + a.amount : ''}`);
      }
      return chain;
    };

    // Classify villain's action type
    const classifyVillainAction = (prev, stage) => {
      if (!prev) return null;
      if (stage === 'preflop') {
        if (prev.action === 'raise') return 'open';
        if (prev.action === 'call') return 'call';
      }
      if (prev.action === 'raise') return 'bet';
      if (prev.action === 'check') return 'check';
      return prev.action;
    };

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
        chipsBeforeHand,
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
        villainAction: classifyVillainAction(facingAction, ha._phase || 'preflop'),
        streetActions: buildStreetChain((gs.actionLog || []).indexOf(ha)),
        chipsBeforeHand,
      });
    }

    // Sound + vibration on hand result
    const heroWon = gs.winner?.isHero;
    if (heroWon) { Sounds.win(); Sounds.chips(); navigator.vibrate?.([100, 50, 100]); }
    else if (gs.winner) Sounds.chips();

    // Check for all-in vibration (any player all-in during the hand)
    if (gs.players?.some(p => p.allIn)) navigator.vibrate?.(150);

    // Update ALL records for this hand (not just last one)
    const allRecs = getRecords().filter(r => r.handNumber === handCount + 1);

    // Calculate heroWouldWin: if hero folded, would they have won at showdown?
    let heroWouldWin = null;
    try {
      if (!heroWon && gs.heroCards?.length === 2 && gs.community?.length >= 5 && gs.allHoleCards) {
        const heroHand = evaluateHand(gs.heroCards, gs.community);
        if (heroHand) {
          heroWouldWin = true; // assume win unless beaten
          for (const [id, cards] of Object.entries(gs.allHoleCards)) {
            if (cards?.length === 2) {
              const oppHand = evaluateHand(cards, gs.community);
              if (oppHand && compareHands(heroHand, oppHand) < 0) {
                heroWouldWin = false;
                break;
              }
            }
          }
        }
      }
    } catch (e) { /* non-critical */ }

    // Collect decision times per street
    const decisionTimeMsPerStreet = {};
    for (const rec of allRecs) {
      if (rec.stage && rec.decisionTimeMs > 0) {
        decisionTimeMsPerStreet[rec.stage] = rec.decisionTimeMs;
      }
    }

    for (const rec of allRecs) {
      rec.handResult = gs.isSplitPot && heroWon ? 'split' : heroWon ? 'won' : 'lost';
      rec.potWon = heroWon ? gs.potWon : 0;
      rec.isSplitPot = gs.isSplitPot || false;
      rec.chipsAfter = hero.chips;
      rec.heroWouldWin = heroWouldWin;
      rec.decisionTimeMsPerStreet = decisionTimeMsPerStreet;
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

    // Post-hand mini analysis (safe — never crashes game)
    try {
      const lastRecs = getRecords().filter(r => r.handNumber === handCount + 1);
      const lastMistake = lastRecs.find(r => r.mistakeType);
      if (lastMistake) {
        const tips = {
          bad_fold: 'You had enough equity to call',
          bad_call: 'Calling was -EV here',
          too_passive: 'Strong enough to raise for value',
          push_fold_error: 'Short stack — should have shoved',
          icm_error: 'Bubble — survival matters more',
          draw_fold_error: 'Draw with correct odds to continue',
        };
        setPostHandTip({
          type: lastMistake.mistakeType,
          text: tips[lastMistake.mistakeType] || 'Review this decision',
          evLost: lastMistake.evLost,
          gtoAction: lastMistake.gtoAction,
          gtoFreq: lastMistake.solverResult?.bestFrequency,
        });
        setTimeout(() => setPostHandTip(null), 4000);
      } else if (heroWon) {
        setPostHandTip({ type: 'good', text: 'Well played!', evLost: 0 });
        setTimeout(() => setPostHandTip(null), 2000);
      }
    } catch (e) { /* post-hand analysis is non-critical */ }

    // #17/#24: Extended bot chat reactions
    try {
      const bl = tState.blinds || {};
      const bigPot = gs.potWon > (bl.bb || 200) * 10;
      const hugePot = gs.potWon > (bl.bb || 200) * 25;
      const loser = gs.players?.find(p => !p.isHero && !p.folded && p.id !== gs.winner?.id);
      const isSuckout = heroWon && gs.allHoleCards && (() => {
        try {
          const heroH = evaluateHand(gs.heroCards, gs.community);
          for (const [id, cards] of Object.entries(gs.allHoleCards)) {
            if (cards?.length === 2 && !gs.players?.find(p => p.id === id)?.isHero) {
              const oppH = evaluateHand(cards, gs.community);
              if (oppH && heroH && compareHands(oppH, heroH) > 0) return false; // hero had best
            }
          }
          return false;
        } catch { return false; }
      })();

      let chatMsg = null;
      if (heroWon && hugePot && loser) {
        // Hero wins huge pot — loser reacts
        const msgs = isSuckout
          ? ['lucky...', 'every time 😤', 'rigged', 'nice catch...', 'ffs']
          : ['nh', 'wp', 'gg', 'nice hand 👏'];
        chatMsg = { name: loser.name, msg: msgs[Math.floor(Math.random() * msgs.length)] };
      } else if (!heroWon && gs.winner && bigPot) {
        // Bot wins big — winner gloats
        const msgs = ['ty 🃏', 'gg', 'ez', 'too easy', 'wp me'];
        chatMsg = { name: gs.winner.name, msg: msgs[Math.floor(Math.random() * msgs.length)] };
      } else if (heroWon && bigPot && Math.random() < 0.3) {
        // Random reaction
        const msgs = ['nh', 'wp', 'gg'];
        const reactor = gs.players?.find(p => !p.isHero && !p.folded);
        if (reactor) chatMsg = { name: reactor.name, msg: msgs[Math.floor(Math.random() * msgs.length)] };
      }
      if (chatMsg) { setBotChat(chatMsg); setTimeout(() => setBotChat(null), 3000); }
    } catch(e) {}

    // Save session after every hand
    saveSession();

    // If hero eliminated — auto-show debrief
    const tStateNow = dirRef.current.getState();
    if (tStateNow.heroEliminated) {
      setTimeout(() => {
        const recs = getRecords();
        if (recs.length > 0) {
          const deb = generateDebrief(recs);
          window.__autoDebrief = { debrief: deb, finish: { position: tStateNow.heroRank, total: tStateNow.totalPlayers }, records: recs };
        }
      }, 3000);
    }
    } catch (e) { console.error('Record useEffect error:', e); }
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
      height: '100dvh', overflow: 'hidden',
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
        @keyframes chipFly0 { 0% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(-80px,60px) scale(0.5); } }
        @keyframes chipFly1 { 0% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(60px,70px) scale(0.5); } }
        @keyframes chipFly2 { 0% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(-30px,80px) scale(0.4); } }
        @keyframes chipFly3 { 0% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(40px,50px) scale(0.5); } }
        @keyframes chipFly4 { 0% { opacity:1; transform:translate(-50%,-50%); } 100% { opacity:0; transform:translate(0px,90px) scale(0.3); } }
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
        padding: '4px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #1a2230', background: 'rgba(5,7,9,0.9)',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8d48b' }}>{tournState.format.name}</div>
          <div style={{ fontSize: '9px', color: '#3a4a5a' }}>Hand #{handCount + 1} | Level {bl.level + 1}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setView('dashboard')} style={{
            padding: '6px 14px', background: '#0d1118', border: '1px solid #1a2230',
            borderRadius: '8px', color: '#5a7a8a', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
          }}>{tournState.tables > 1 ? `${tournState.tables} Tables` : 'Dashboard'}</button>
          <button onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers, apiCalls: ClaudeBossBot.totalCalls, aiBots: aiBotsRef.current })} style={{
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
        payouts={tournState.payouts?.payouts?.slice(0, 3)}
        levelTimeRemaining={tournState.levelTimeRemaining} />

      {/* Alerts */}
      {tournState.isBubble && (
        <div style={{
          textAlign: 'center', padding: '8px 12px', fontSize: '13px', fontWeight: 700,
          background: 'linear-gradient(90deg, rgba(220,53,69,0), rgba(220,53,69,0.15), rgba(220,53,69,0))',
          borderTop: '1px solid rgba(220,53,69,0.2)', borderBottom: '1px solid rgba(220,53,69,0.2)',
          animation: 'pulse 2s infinite',
        }}>
          <div style={{ color: '#e74c3c', fontSize: '14px' }}>BUBBLE — Survival {'>'} Chips</div>
          <div style={{ color: '#a08060', fontSize: '11px', marginTop: '2px' }}>
            {tournState.playersRemaining - tournState.payout.paidPlaces} to cash | Chips worth ~1.5x | Min cash: ${fmt(tournState.payout?.payouts?.[tournState.payout.paidPlaces - 1] || 0)}
          </div>
        </div>
      )}
      {tournState.isFinalTable && (
        <div style={{
          textAlign: 'center', padding: '6px', fontSize: '12px', fontWeight: 700,
          background: 'linear-gradient(90deg, #2a201000, #2a2010, #2a201000)', color: '#f39c12',
        }}>FINAL TABLE</div>
      )}

      {/* Table — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <PremiumTable chipsBeforeHand={chipsBeforeHandRef.current} theme={getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey)} gs={{ ...(gs || {
        players: tournState.heroTable?.players.filter(p => !p.eliminated).map(p => ({ ...p, position: '', bet: 0, folded: false, allIn: false })) || [],
        community: [], pot: 0, heroCards: [], heroIndex: tournState.heroTable?.players.findIndex(p => p.isHero) || 0,
        dealerIdx: tournState.heroTable?.dealer || 0, phase: 'idle', showdownResults: null, winner: null, potWon: 0,
      }), _onSelectOpponent: setSelectedOpponent }} />

      {/* Opponent Profile Popup */}
      {selectedOpponent && (
        <div onClick={() => setSelectedOpponent(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0d1118', borderRadius: '16px', padding: '20px',
            border: '1px solid #1a2230', width: '85%', maxWidth: '320px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffd700' }}>{selectedOpponent.name}</div>
              <div onClick={() => setSelectedOpponent(null)} style={{
                width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                background: '#1a2230', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6b7b8d', fontSize: '14px', fontWeight: 700,
              }}>X</div>
            </div>
            <div style={{ fontSize: '13px', color: selectedOpponent.style === 'TAG' ? '#27ae60' : selectedOpponent.style === 'LAG' ? '#f39c12' : selectedOpponent.style === 'Nit' ? '#3498db' : '#e74c3c', marginBottom: '10px', fontWeight: 600 }}>
              {selectedOpponent.style || 'Unknown'} — {selectedOpponent.profile?.style || selectedOpponent.style || '?'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: 'VPIP', val: selectedOpponent.observedVpip ? Math.round(selectedOpponent.observedVpip * 100) + '%' : selectedOpponent.profile?.vpip ? Math.round(selectedOpponent.profile.vpip * 100) + '%' : '?' },
                { label: 'PFR', val: selectedOpponent.profile?.pfr ? Math.round(selectedOpponent.profile.pfr * 100) + '%' : '?' },
                { label: 'AF', val: selectedOpponent.profile?.af?.toFixed(1) || '?' },
                { label: '3-Bet', val: selectedOpponent.profile?.threeBet ? Math.round(selectedOpponent.profile.threeBet * 100) + '%' : '?' },
                { label: 'Stack', val: fmt(selectedOpponent.chips) },
                { label: 'Position', val: selectedOpponent.position || '?' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '8px', background: '#0a0d12', borderRadius: '8px', border: '1px solid #141a22' }}>
                  <div style={{ fontSize: '10px', color: '#5a6a7a', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#c0d0e0', marginTop: '2px' }}>{s.val}</div>
                </div>
              ))}
            </div>
            {/* Opponent Notes */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '10px', color: '#5a7a8a' }}>Notes</label>
              <textarea
                defaultValue={(() => { try { const notes = JSON.parse(localStorage.getItem('pokertrain_notes') || '{}'); return notes[selectedOpponent.name] || ''; } catch (e) { return ''; } })()}
                onChange={e => { try { const notes = JSON.parse(localStorage.getItem('pokertrain_notes') || '{}'); notes[selectedOpponent.name] = e.target.value; localStorage.setItem('pokertrain_notes', JSON.stringify(notes)); } catch(e){} }}
                placeholder="e.g., nit, folds to 3-bet 90%, never bluffs river"
                style={{ width: '100%', height: '60px', padding: '8px', background: '#0a0d12', border: '1px solid #1a2230', borderRadius: '8px', color: '#c0d0e0', fontSize: '12px', resize: 'none', outline: 'none', boxSizing: 'border-box', marginTop: '4px' }}
              />
            </div>
          </div>
        </div>
      )}

      </div>{/* end flex table area */}

      {/* Live tell hint */}
      {tellHint && liveMode && gs?.waitingForHero && (
        <div style={{
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '8px', padding: '6px 12px', margin: '2px 12px',
          fontSize: '11px', color: '#c4b5fd', textAlign: 'center', fontStyle: 'italic',
        }}>
          <span>👁 {tellHint.text}</span>
          <span style={{ fontSize: '9px', color: '#7c6faa', marginLeft: '6px' }}>({tellHint.reliability})</span>
        </div>
      )}

      {/* Personal trainer — pot odds + range reading */}
      {showTrainer && gs?.waitingForHero && gs?.toCall > 0 && (
        <div style={{
          background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.25)',
          borderRadius: '8px', padding: '6px 12px', margin: '2px 12px',
          fontSize: '11px', color: '#a0d8b0', textAlign: 'center',
        }}>
          <div>Pot odds: <b>{Math.round((gs.toCall / (gs.pot + gs.toCall)) * 100)}%</b> — need {Math.round((gs.toCall / (gs.pot + gs.toCall)) * 100)}% equity</div>
          {gs.heroCards?.length === 2 && <div style={{ fontSize: '10px', color: '#6a9a7a', marginTop: '1px' }}>Equity: ~{Math.round((gs.handStrength || 0.5) * 100)}%{(gs.handStrength || 0) > (gs.toCall / (gs.pot + gs.toCall)) ? ' ✓ +EV' : ' ✗ -EV'}</div>}
        </div>
      )}

      {/* Controls + Range button + toggles */}
      {gs?.waitingForHero && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '4px 0' }}>
            <button onClick={() => setShowRange(true)} style={{
              padding: '6px 16px', background: '#0d1118', border: '1px solid #1a2230',
              borderRadius: '8px', color: '#6b7b8d', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer',
            }}>Range Chart</button>
            <button onClick={() => setShowTrainer(t => !t)} style={{
              padding: '6px 12px', background: showTrainer ? '#1a3a2a' : '#0d1118', border: `1px solid ${showTrainer ? '#27ae6044' : '#1a2230'}`,
              borderRadius: '8px', color: showTrainer ? '#27ae60' : '#6b7b8d', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            }}>Coach</button>
            <button onClick={() => setLiveMode(l => !l)} style={{
              padding: '6px 12px', background: liveMode ? '#2a1a40' : '#0d1118', border: `1px solid ${liveMode ? '#8b5cf644' : '#1a2230'}`,
              borderRadius: '8px', color: liveMode ? '#c4b5fd' : '#6b7b8d', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            }}>Live</button>
          </div>
          <Controls canCheck={gs.canCheck} canCall={gs.toCall > 0} toCall={gs.toCall}
            pot={gs.pot} myChips={gs.heroChips} minRaise={gs.minRaise} maxRaise={gs.maxRaise}
            bigBlind={bl.bb} onAction={handleAction}
            theme={getTheme(tournState.isFinalTable ? 'FINAL_TABLE' : tournState.formatKey)} />
        </>
      )}

      {/* Range Grid Overlay */}
      {showRange && (
        <RangeGrid
          position={gs?.heroPosition || 'BTN'}
          heroCards={gs?.heroCards}
          facingRaise={gs?.toCall > (bl.bb || 0)}
          onClose={() => setShowRange(false)}
        />
      )}

      {/* Deal / Eliminated button */}
      {!handActive && (!gs || gs.phase === 'hand_over' || gs.phase === 'idle') && (
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          {tournState.heroEliminated ? (
            <>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#e74c3c', marginBottom: '10px' }}>
                ELIMINATED #{tournState.heroRank} / {tournState.totalPlayers}
              </div>
              <button className="btn-action" onClick={() => onExit({ position: tournState.heroRank, total: tournState.totalPlayers, apiCalls: ClaudeBossBot.totalCalls, aiBots: aiBotsRef.current })} style={{
                width: '100%', padding: '18px', border: 'none', borderRadius: '14px',
                background: 'linear-gradient(135deg, #1a3a6c, #2980b9)',
                color: '#fff', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(41,128,185,0.3)',
              }}>VIEW RESULTS</button>
            </>
          ) : (
            <button className="btn-action" onClick={playHand} style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a6a3a, #27ae60)',
              color: '#fff', fontWeight: 800, fontSize: '16px', letterSpacing: '0.5px',
              boxShadow: '0 4px 20px rgba(39,174,96,0.25)',
            }}>DEAL</button>
          )}
        </div>
      )}

      {/* Post-hand analysis + GTO overlay */}
      {postHandTip && (
        <div style={{
          textAlign: 'center', padding: '8px 14px',
          background: postHandTip.type === 'good' ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.12)',
          borderTop: `1px solid ${postHandTip.type === 'good' ? '#27ae6033' : '#e74c3c33'}`,
          animation: 'winPopup 0.3s ease',
        }}>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: postHandTip.type === 'good' ? '#27ae60' : '#f39c12',
          }}>
            {postHandTip.type === 'good' ? '✓ ' : '⚠ '}{postHandTip.text}
          </span>
          {postHandTip.evLost > 0 && (
            <span style={{ fontSize: '11px', color: '#e74c3c', marginLeft: '8px' }}>EV lost: ~{postHandTip.evLost}</span>
          )}
          {postHandTip.gtoAction && postHandTip.type !== 'good' && (
            <div style={{ fontSize: '11px', color: '#5a8a5a', marginTop: '3px' }}>
              GTO: {postHandTip.gtoAction.toUpperCase()}{postHandTip.gtoFreq ? ` (${postHandTip.gtoFreq}%)` : ''}
            </div>
          )}
        </div>
      )}

      {/* Coaching tip — shows when hero is deciding */}
      {gs?.waitingForHero && gs?.heroPosition && (
        <div style={{
          textAlign: 'center', padding: '4px 10px', fontSize: '11px',
          color: '#6a8a6a', background: 'rgba(10,20,10,0.6)',
          borderTop: '1px solid #1a2a1a',
        }}>
          {gs.heroPosition === 'BTN' ? 'BTN — open wide, you have position' :
           gs.heroPosition === 'CO' ? 'CO — second best position, open 30%+' :
           gs.heroPosition === 'SB' ? 'SB — 3-bet or fold, calling is -EV' :
           gs.heroPosition === 'BB' ? 'BB — defend wide vs steals, you close the action' :
           gs.heroPosition === 'UTG' ? 'UTG — play tight, 5 players behind you' :
           'Play your position and stack depth'}
        </div>
      )}

      {/* Bot chat */}
      {botChat && (
        <div style={{
          textAlign: 'center', padding: '6px 12px', fontSize: '12px',
          background: 'rgba(20,20,30,0.7)', borderTop: '1px solid #1a2230',
          animation: 'winPopup 0.3s ease',
        }}>
          <span style={{ color: '#6b7b8d' }}>{botChat.name}: </span>
          <span style={{ color: '#c0d0e0' }}>{botChat.msg}</span>
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
  personalized: PersonalizedDrill, river: RiverDrill,
};

// Error boundary to prevent white/black screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: '40px', textAlign: 'center', color: '#e0e0e0', background: '#0a0d12', minHeight: '100vh' } },
        React.createElement('h2', { style: { color: '#e74c3c' } }, 'Something went wrong'),
        React.createElement('p', { style: { color: '#6b7b8d', margin: '10px 0' } }, String(this.state.error)),
        React.createElement('button', {
          onClick: () => { this.setState({ hasError: false }); window.location.reload(); },
          style: { padding: '12px 24px', background: '#27ae60', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '16px', cursor: 'pointer', marginTop: '16px' },
        }, 'Restart')
      );
    }
    return this.props.children;
  }
}

function AppInner() {
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
      records={debriefData.records} aiExploit={debriefData.aiExploit}
      onClose={() => { setDebriefData(null); setScreen('lobby'); }}
      onDrill={(mistakeType) => {
        const drillMap = { bad_fold: 'potodds', bad_call: 'potodds', too_passive: 'sizing', push_fold_error: 'pushfold', icm_error: 'pushfold', draw_fold_error: 'potodds' };
        const drillId = drillMap[mistakeType] || 'rfi';
        setActiveDrill(drillId);
        setScreen('drill');
      }}
      onExport={() => {
        const data = exportSession();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = `session_${Date.now()}.json`; a.click();
      }} /></div>;
  }
  if (screen === 'tournament' && director) {
    return <Game director={director} onExit={(finish) => {
      try {
        const records = getRecords();
        saveSession();
        let aiExploit = null;
        try {
          const bots = Object.values(finish?.aiBots || {});
          const bot = bots.find(b => b.getHeroSummary);
          if (bot) aiExploit = bot.getHeroSummary();
        } catch (e) {}
        const debrief = records.length > 0 ? generateDebrief(records) : { totalMistakes: 0, criticalMistakes: 0, top5: [], estimatedEVLost: 0, summary: 'No data.', patterns: [] };
        setDebriefData({ debrief, finish: finish || {}, records, aiExploit });
        setScreen('debrief');
      } catch (e) {
        console.error('Exit error:', e);
        setDirector(null); setScreen('lobby');
      }
    }} />;
  }

  return <Lobby
    onStart={(fmt, name) => { startSession(fmt); setDirector(new TournamentDirector(fmt, name)); setScreen('tournament'); }}
    onDrills={() => setScreen('drills')}
    onStats={() => setScreen('stats')}
    onCoach={() => setScreen('coach')} />;
}

export default function App() {
  return React.createElement(ErrorBoundary, null, React.createElement(AppInner));
}
