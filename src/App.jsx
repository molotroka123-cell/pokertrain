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
import { startSession, recordDecision, saveSession, exportSession, getRecords } from './recorder/ActionRecorder.js';
import { generateDebrief } from './recorder/autoDebrief.js';
import DrillMenu from './drills/DrillMenu.jsx';
import RFIDrill from './drills/RFIDrill.jsx';
import ThreeBetDrill from './drills/ThreeBetDrill.jsx';
import BBDefenseDrill from './drills/BBDefenseDrill.jsx';
import PushFoldDrill from './drills/PushFoldDrill.jsx';
import PostflopDrill from './drills/PostflopDrill.jsx';
import SizingDrill from './drills/SizingDrill.jsx';
import PotOddsDrill from './drills/PotOddsDrill.jsx';

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ════════════════════════════════════════════
// PREMIUM LOBBY — V3 Design
// ════════════════════════════════════════════
function Lobby({ onStart, onDrills }) {
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

        {/* Quick drill buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
          {[
            { id: 'rfi', icon: '🎯', name: 'RFI', color: '#27ae60' },
            { id: 'pushfold', icon: '💣', name: 'Push/Fold', color: '#e74c3c' },
            { id: 'potodds', icon: '🧮', name: 'Pot Odds', color: '#3498db' },
            { id: 'postflop', icon: '🃏', name: 'Postflop', color: '#9b59b6' },
          ].map(d => (
            <div key={d.id} onClick={() => { window.__quickDrill = d.id; onDrills(); }} style={{
              padding: '12px', background: '#0d1118', border: '1px solid #1a2230', borderRadius: '10px',
              cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.2s',
            }}>
              <div style={{ fontSize: '20px' }}>{d.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: d.color, marginTop: '4px' }}>{d.name}</div>
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

function PremiumTable({ gs }) {
  if (!gs || !gs.players) return null;
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
      position: 'relative', width: '100%', maxWidth: '700px', height: '420px',
      margin: '0 auto', overflow: 'hidden',
    }}>
      {/* Table shadow */}
      <div style={{
        position: 'absolute', top: '52%', left: '50%', width: '78%', height: '30%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.4)', borderRadius: '50%', filter: 'blur(30px)',
      }} />

      {/* Felt */}
      <div style={{
        position: 'absolute', top: '12%', left: '8%', width: '84%', height: '66%',
        background: 'radial-gradient(ellipse at 50% 45%, #1b6b3f 0%, #145a32 40%, #0e4225 70%, #0a3019 100%)',
        borderRadius: '50%/40%',
        border: '6px solid #2a2015',
        boxShadow: `
          inset 0 0 60px rgba(0,0,0,0.4),
          inset 0 0 20px rgba(0,0,0,0.2),
          0 0 0 3px #1a1508,
          0 0 0 8px #352a15,
          0 8px 32px rgba(0,0,0,0.6)
        `,
      }}>
        {/* Table line */}
        <div style={{
          position: 'absolute', top: '8%', left: '6%', width: '88%', height: '84%',
          borderRadius: '50%/40%', border: '1.5px solid rgba(255,215,0,0.08)',
        }} />
      </div>

      {/* Pot */}
      {gs.pot > 0 && (
        <div style={{
          position: 'absolute', top: '32%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', zIndex: 20,
          animation: 'fadeInUp 0.3s ease',
        }}>
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: '20px',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,215,0,0.15)',
          }}>
            <span style={{ fontSize: '11px', color: '#8ca88c', letterSpacing: '1px' }}>POT </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffd700' }}>{fmt(gs.pot)}</span>
          </div>
        </div>
      )}

      {/* Community cards */}
      {gs.community.length > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', gap: '5px', zIndex: 15,
        }}>
          {gs.community.map((c, i) => <Card key={c + i} card={c} mini delay={i * 180} />)}
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

        return (
          <div key={p.id} style={{
            position: 'absolute', left: pos.x + '%', top: pos.y + '%',
            transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 10,
            width: isHero ? '90px' : '78px',
            transition: 'all 0.4s ease',
            opacity: p.folded ? 0.35 : 1,
          }}>
            {/* Avatar circle */}
            <div style={{
              width: isHero ? 44 : 36, height: isHero ? 44 : 36, borderRadius: '50%',
              margin: '0 auto 3px',
              background: isWinner ? 'linear-gradient(135deg, #ffd700, #ff8c00)' :
                         isHero ? 'linear-gradient(135deg, #1a5c3a, #27ae60)' :
                         'linear-gradient(135deg, #1a2a4a, #2a3a5a)',
              border: `2px solid ${isWinner ? '#ffd700' : isHero ? '#27ae60' : '#2a3a5a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isHero ? '18px' : '14px',
              boxShadow: isWinner ? '0 0 20px rgba(255,215,0,0.4)' : isHero ? '0 0 12px rgba(39,174,96,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
            }}>
              {p.emoji || (isHero ? '👤' : '🤖')}
            </div>

            {/* Position label */}
            <div style={{
              fontSize: '9px', fontWeight: 700, color: '#5a7a8a', letterSpacing: '0.5px',
              marginBottom: '1px',
            }}>{p.position}</div>

            {/* Name */}
            <div style={{
              fontSize: isHero ? '11px' : '10px', fontWeight: 600,
              color: isHero ? '#ffd700' : '#8899aa',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: isHero ? '88px' : '76px',
            }}>
              {isHero ? 'HERO' : p.name}
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '3px 0', minHeight: '32px' }}>
              {isHero && gs.heroCards?.length > 0 ? (
                gs.heroCards.map((c, ci) => <Card key={c} card={c} mini glow delay={ci * 250} />)
              ) : showdown && sd?.cards ? (
                sd.cards.map((c, ci) => <Card key={c} card={c} mini delay={ci * 150} />)
              ) : !isHero && !p.folded ? (
                <><Card card="Xx" faceDown mini delay={0} /><Card card="Xx" faceDown mini delay={80} /></>
              ) : null}
            </div>

            {/* Hand name at showdown */}
            {showdown && sd?.hand && (
              <div style={{
                fontSize: '9px', fontWeight: 700,
                color: isWinner ? '#ffd700' : '#6b8fa3',
                background: isWinner ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.3)',
                padding: '1px 6px', borderRadius: '8px', display: 'inline-block',
              }}>{sd.hand.name}</div>
            )}

            {/* Chips */}
            <div style={{
              fontSize: '11px', fontWeight: 700, color: '#e8d48b',
              background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '10px',
              display: 'inline-block', marginTop: '2px',
            }}>{fmt(p.chips)}</div>

            {/* Bet chip */}
            {p.bet > 0 && (
              <div style={{
                position: 'absolute',
                left: si === 0 ? '50%' : si < 5 ? '110%' : '-10%',
                top: si === 0 ? '-10%' : '50%',
                transform: 'translate(-50%,-50%)',
                fontSize: '10px', fontWeight: 700, color: '#ffd700',
                background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '12px',
                border: '1px solid rgba(255,215,0,0.2)',
                whiteSpace: 'nowrap',
              }}>{fmt(p.bet)}</div>
            )}

            {/* All-in badge */}
            {p.allIn && (
              <div style={{
                fontSize: '9px', fontWeight: 800, color: '#fff',
                background: '#e74c3c', padding: '1px 6px', borderRadius: '8px',
                display: 'inline-block', marginTop: '2px',
                animation: 'pulse 1.5s infinite',
              }}>ALL-IN</div>
            )}

            {/* Dealer button */}
            {isDealer && (
              <div style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                color: '#000', fontSize: '10px', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(255,215,0,0.4)',
                border: '1px solid #fff3',
              }}>D</div>
            )}
          </div>
        );
      })}

      {/* Winner popup */}
      {gs.phase === 'showdown' && gs.winner && (
        <div style={{
          position: 'absolute', bottom: '1%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          padding: '10px 28px', borderRadius: '24px', zIndex: 30,
          border: '1.5px solid rgba(255,215,0,0.3)',
          boxShadow: '0 4px 20px rgba(255,215,0,0.15)',
          animation: 'fadeInUp 0.4s ease',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffd700' }}>
            {gs.winner.isHero ? '🏆 You win ' : `${gs.winner.name} wins `}
          </span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#27ae60' }}>{fmt(gs.potWon)}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// HUD BAR — Premium
// ════════════════════════════════════════════
function HUDBar({ heroChips, pot, mVal, position, rank, blinds, playersLeft, total }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: '8px 12px',
      background: 'linear-gradient(180deg, #0a0d14 0%, #0d1118 100%)',
      borderBottom: '1px solid #1a2230', fontSize: '11px',
    }}>
      {[
        { label: 'STACK', val: fmt(heroChips), color: '#ffd700' },
        { label: 'POT', val: fmt(pot), color: '#e0e0e0' },
        { label: 'BLINDS', val: `${fmt(blinds.sb)}/${fmt(blinds.bb)}`, color: '#8899aa', small: true },
        { label: 'M', val: mVal.toFixed(0), color: mVal < 10 ? '#e74c3c' : mVal < 20 ? '#f39c12' : '#27ae60' },
        { label: 'RANK', val: `#${rank}`, color: '#c0d0e0' },
        { label: 'POS', val: position || '—', color: '#5a7a8a', small: true },
      ].map((h, i) => (
        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ color: '#3a4a5a', fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>{h.label}</div>
          <div style={{ color: h.color, fontWeight: 700, fontSize: h.small ? '11px' : '14px', marginTop: '1px' }}>{h.val}</div>
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
      for (const p of state.heroTable.players) {
        if (!p.isHero && p.profile) bots[p.id] = new AdaptiveAI(p.profile);
      }
      aiBotsRef.current = bots;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      dirRef.current.simulateBackgroundTick(3);
      dirRef.current.checkBlindLevel();
      setTourn(dirRef.current.getState());
    }, 4000);
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
      background: 'radial-gradient(ellipse at 50% 30%, #0d1520 0%, #060810 60%, #030406 100%)',
      color: '#e0e0e0', fontFamily: "'Segoe UI', -apple-system, sans-serif",
      maxWidth: '800px', margin: '0 auto',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
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
      <PremiumTable gs={gs || {
        players: tournState.heroTable?.players.filter(p => !p.eliminated).map(p => ({ ...p, position: '', bet: 0, folded: false, allIn: false })) || [],
        community: [], pot: 0, heroCards: [], heroIndex: tournState.heroTable?.players.findIndex(p => p.isHero) || 0,
        dealerIdx: tournState.heroTable?.dealer || 0, phase: 'idle', showdownResults: null, winner: null, potWon: 0,
      }} />

      {/* Controls */}
      {gs?.waitingForHero && (
        <Controls canCheck={gs.canCheck} canCall={gs.toCall > 0} toCall={gs.toCall}
          pot={gs.pot} myChips={gs.heroChips} minRaise={gs.minRaise} maxRaise={gs.maxRaise}
          onAction={handleAction} />
      )}

      {/* Deal button */}
      {!handActive && (!gs || gs.phase === 'hand_over' || gs.phase === 'idle') && (
        <div style={{ padding: '14px 16px', textAlign: 'center' }}>
          <button onClick={playHand} disabled={tournState.heroEliminated} style={{
            width: '100%', padding: '18px', border: 'none', borderRadius: '14px', cursor: 'pointer',
            background: tournState.heroEliminated
              ? 'linear-gradient(135deg, #2a1010, #3a1515)'
              : 'linear-gradient(135deg, #1a6a3a, #27ae60)',
            color: '#fff', fontWeight: 800, fontSize: '17px', letterSpacing: '0.5px',
            boxShadow: tournState.heroEliminated ? 'none' : '0 4px 20px rgba(39,174,96,0.25)',
            opacity: tournState.heroEliminated ? 0.6 : 1,
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => { if (!tournState.heroEliminated) e.target.style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
          >{tournState.heroEliminated ? `ELIMINATED #${tournState.heroRank}` : 'DEAL'}</button>
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
    onDrills={() => setScreen('drills')} />;
}
