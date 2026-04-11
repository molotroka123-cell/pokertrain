import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TournamentDirector } from './tournament/TournamentDirector.js';
import { FORMATS } from './data/tournamentFormats.js';
import { CASH_FORMATS } from './data/cashFormats.js';
import { GameEngine, PHASE } from './engine/GameEngine.js';
import { AdaptiveAI } from './engine/adaptiveAI.js';
import { mRatio } from './engine/equity.js';
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
import StatsScreen from './stats/Dashboard.jsx';
import CoachScreen from './coach/Coach.jsx';
import { Sounds } from './lib/sounds.js';
import { getLiveTell } from './lib/liveTells.js';
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
  const [tab, setTab] = useState('mtt');
  const [format, setFormat] = useState('WSOP_Main');
  const [name, setName] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState({ sleep: true, focus: true, tilt: true, goal: true });
  const [sessionGoal, setSessionGoal] = useState('');

  // Quick stats from localStorage
  const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
  const totalSessions = sessions.length;
  const totalHands = sessions.reduce((a, s) => a + (s.totalHands || 0), 0);
  const bestFinish = sessions.length > 0 ? Math.min(...sessions.filter(s => s.records?.[0]?.totalPlayers).map(s => {
    const last = s.records?.[s.records.length - 1];
    return last?.playersRemaining || 999;
  })) : null;

  const tabStyle = (active) => ({
    flex: 1, padding: '11px 0', border: 'none', borderRadius: 0, cursor: 'pointer',
    background: active ? 'transparent' : 'transparent',
    color: active ? '#ffd700' : '#4a5a6a', fontWeight: 700, fontSize: '12px',
    letterSpacing: '1.5px', textTransform: 'uppercase', transition: 'color 0.2s',
    borderBottom: active ? '2px solid #ffd700' : '2px solid transparent',
  });

  const cardBtn = (isSelected) => ({
    padding: '14px 16px', borderRadius: '12px', marginBottom: '6px', cursor: 'pointer',
    background: isSelected ? 'linear-gradient(135deg, #10192a, #162040)' : '#080c14',
    border: `1px solid ${isSelected ? 'rgba(212,175,55,0.25)' : '#111820'}`,
    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
    boxShadow: isSelected ? '0 2px 16px rgba(212,175,55,0.08)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#060810',
      color: '#e0e0e0', fontFamily: "'Segoe UI', -apple-system, sans-serif",
      paddingTop: 'env(safe-area-inset-top, 0px)', display: 'flex', flexDirection: 'column',
    }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{
        padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(180deg, #0c1018 0%, #060810 100%)',
      }}>
        <div>
          <div style={{
            fontSize: '22px', fontWeight: 900, letterSpacing: '2px',
            background: 'linear-gradient(135deg, #ffd700, #f0c030, #d4af37)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>POKERTRAIN</div>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Hero"
          style={{
            width: '110px', padding: '8px 12px', background: '#0c1018', border: '1px solid #1a2230',
            borderRadius: '8px', color: '#c0d0e0', fontSize: '13px', outline: 'none',
            textAlign: 'right', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#d4af37'}
          onBlur={e => e.target.style.borderColor = '#1a2230'}
        />
      </div>

      {/* ═══ QUICK STATS ROW ═══ */}
      {totalSessions > 0 && (
        <div style={{
          display: 'flex', gap: '1px', margin: '10px 16px 0', borderRadius: '10px', overflow: 'hidden',
          background: '#111820',
        }}>
          {[
            { label: 'Sessions', val: totalSessions },
            { label: 'Hands', val: totalHands > 999 ? (totalHands / 1000).toFixed(1) + 'K' : totalHands },
            { label: 'Best', val: bestFinish && bestFinish < 999 ? '#' + bestFinish : '-' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', background: '#0a0e14' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#c0d0e0' }}>{s.val}</div>
              <div style={{ fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB BAR ═══ */}
      <div style={{
        display: 'flex', margin: '12px 16px 0', borderBottom: '1px solid #141a22',
      }}>
        {[
          { id: 'mtt', label: 'Tournaments' },
          { id: 'cash', label: 'Cash' },
          { id: 'train', label: 'Training' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>

        {/* ═══ MTT TAB ═══ */}
        {tab === 'mtt' && (<>
          {/* HARDCORE — featured card */}
          <div onClick={() => onStart('HARDCORE', name || 'Hero')} style={{
            padding: '18px', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px',
            background: 'linear-gradient(135deg, #1a0808, #2a0a0a, #1a0505)',
            border: '1px solid rgba(220,40,40,0.25)', position: 'relative', overflow: 'hidden',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '100%', background: 'radial-gradient(circle at 100% 50%, rgba(220,40,40,0.12), transparent 70%)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#cc3030', fontWeight: 800, letterSpacing: '3px', marginBottom: '4px' }}>FEATURED</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#ff4040', letterSpacing: '2px' }}>HARDCORE 6-Max</div>
                <div style={{ fontSize: '11px', color: '#6a3030', marginTop: '4px' }}>5 AI Pro bots vs You — no mercy</div>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #cc2020, #ff4040)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 900, color: '#fff',
                boxShadow: '0 0 20px rgba(220,40,40,0.3)',
              }}>VS</div>
            </div>
          </div>

          {/* Tournament list */}
          {Object.entries(FORMATS).map(([key, f]) => (
            <div key={key} onClick={() => setFormat(key)} style={cardBtn(format === key)}>
              {format === key && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#d4af37' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: format === key ? '#ffd700' : '#a0b0c0' }}>
                    {f.name}
                    {f.speed && <span style={{
                      fontSize: '9px', fontWeight: 700, marginLeft: '8px',
                      padding: '2px 6px', borderRadius: '4px',
                      background: f.speed === 'Turbo' || f.speed === 'Hyper Turbo' ? 'rgba(220,53,69,0.15)' : 'rgba(90,106,122,0.1)',
                      color: f.speed === 'Turbo' || f.speed === 'Hyper Turbo' ? '#ff5040' : '#6a7a8a',
                    }}>{f.speed}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#3a4a5a', marginTop: '3px' }}>
                    {f.players} entrants  ·  {f.startingChips.toLocaleString()} chips  ·  {f.blindLevels[0].mins}m levels
                  </div>
                </div>
                <div style={{
                  fontSize: '14px', fontWeight: 800,
                  color: format === key ? '#ffd700' : '#2a3a4a',
                  minWidth: '60px', textAlign: 'right',
                }}>${f.buyIn.toLocaleString()}</div>
              </div>
            </div>
          ))}

          {/* Register button */}
          <button onClick={() => { if (!showChecklist) { setShowChecklist(true); return; } onStart(format, name || 'Hero'); }} style={{
            width: '100%', padding: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #1a6a3a, #22a050)',
            color: '#fff', fontWeight: 800, fontSize: '16px', letterSpacing: '1px',
            boxShadow: '0 4px 20px rgba(34,160,80,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            transition: 'transform 0.12s', marginTop: '8px',
          }}
          onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
          >{showChecklist ? 'REGISTER & PLAY' : 'REGISTER'}</button>

          {/* Mental game checklist — collapsed by default */}
          {showChecklist && (
            <div style={{ padding: '12px', background: '#080c14', borderRadius: '12px', marginTop: '8px', border: '1px solid #141a22' }}>
              <div style={{ fontSize: '11px', color: '#d4af37', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>PRE-GAME CHECK</div>
              {[
                { key: 'sleep', label: 'Well rested' },
                { key: 'focus', label: 'Can focus 30+ min' },
                { key: 'tilt', label: 'Not tilted' },
                { key: 'goal', label: 'Have a goal' },
              ].map(item => (
                <div key={item.key} onClick={() => setChecklist(c => ({ ...c, [item.key]: !c[item.key] }))} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 10px', cursor: 'pointer', borderRadius: '8px', marginBottom: '3px',
                  background: checklist[item.key] ? 'rgba(34,160,80,0.08)' : 'rgba(200,50,50,0.06)',
                  border: `1px solid ${checklist[item.key] ? '#22a05020' : '#c8323220'}`,
                }}>
                  <span style={{ fontSize: '12px', color: '#a0b0c0' }}>{item.label}</span>
                  <span style={{ fontSize: '14px', color: checklist[item.key] ? '#22a050' : '#c03030' }}>{checklist[item.key] ? '✓' : '✗'}</span>
                </div>
              ))}
              <input value={sessionGoal} onChange={e => setSessionGoal(e.target.value)} placeholder="Session goal..."
                style={{ width: '100%', padding: '8px 10px', background: '#060810', border: '1px solid #141a22', borderRadius: '8px', color: '#a0b0c0', fontSize: '12px', marginTop: '6px', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          )}
        </>)}

        {/* ═══ CASH TAB ═══ */}
        {tab === 'cash' && (<>
          <div style={{ fontSize: '11px', color: '#3a5a4a', fontWeight: 700, letterSpacing: '2px', marginBottom: '10px' }}>SELECT STAKES</div>
          {Object.entries(CASH_FORMATS).map(([key, f]) => (
            <div key={key} onClick={() => onStart(key, name || 'Hero')} style={{
              padding: '16px', borderRadius: '12px', marginBottom: '6px', cursor: 'pointer',
              background: '#080c14', border: '1px solid #0a1a14',
              transition: 'all 0.2s',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.borderColor = '#1a4a2a'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#0a1a14'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#27ae60' }}>{f.name}</div>
                  <div style={{ fontSize: '11px', color: '#3a5a4a', marginTop: '2px' }}>{f.playersPerTable}-max  ·  {f.buyIn} chips  ·  Rake {f.rake * 100}%</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a4a2a' }}>PLAY</div>
              </div>
            </div>
          ))}
        </>)}

        {/* ═══ TRAINING TAB ═══ */}
        {tab === 'train' && (<>
          {/* Warm up */}
          <div onClick={() => {
            const allRecs = sessions.flatMap(s => s.records || []);
            const mistakes = allRecs.filter(r => r.mistakeType);
            const typeCounts = {};
            for (const m of mistakes) typeCounts[m.mistakeType] = (typeCounts[m.mistakeType] || 0) + 1;
            const worst = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
            const drillMap = { bad_fold: 'potodds', bad_call: 'potodds', too_passive: 'sizing', push_fold_error: 'pushfold', icm_error: 'pushfold', draw_fold_error: 'potodds' };
            window.__quickDrill = worst ? (drillMap[worst[0]] || 'rfi') : 'rfi';
            onDrills();
          }} style={{
            padding: '18px', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px',
            background: 'linear-gradient(135deg, #140a20, #1a1030)',
            border: '1px solid rgba(120,60,180,0.2)',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            <div style={{ fontSize: '11px', color: '#7a4aaa', fontWeight: 800, letterSpacing: '2px', marginBottom: '4px' }}>SMART WARMUP</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#b080e0' }}>Practice Your Weak Spots</div>
            <div style={{ fontSize: '11px', color: '#5a3a7a', marginTop: '3px' }}>Auto-detects your most common mistakes</div>
          </div>

          {/* All drills button */}
          <button onClick={onDrills} style={{
            width: '100%', padding: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #0a1a3a, #1a3a6a)',
            color: '#70a0d0', fontWeight: 700, fontSize: '15px',
            boxShadow: '0 2px 12px rgba(40,120,190,0.15)',
            marginBottom: '12px',
          }}
          onMouseDown={e => { e.target.style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { e.target.style.transform = 'scale(1)'; }}
          >ALL TRAINING DRILLS</button>

          {/* Quick drills grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { id: 'rfi', label: 'Preflop Ranges', sub: 'Open/Fold by position', color: '#27ae60', bg: '#0a1a12' },
              { id: 'pushfold', label: 'Push/Fold', sub: 'Short stack ICM', color: '#e74c3c', bg: '#1a0a0a' },
              { id: 'potodds', label: 'Pot Odds', sub: 'Call/fold math', color: '#3498db', bg: '#0a1220' },
              { id: 'postflop', label: 'Postflop Play', sub: 'Flop/Turn/River', color: '#9b59b6', bg: '#140a1a' },
              { id: 'sizing', label: 'Bet Sizing', sub: 'Value & protection', color: '#f39c12', bg: '#1a1408' },
              { id: 'threebet', label: '3-Bet Pots', sub: 'Defend & attack', color: '#e74c3c', bg: '#1a0c0c' },
            ].map(d => (
              <div key={d.id} onClick={() => { window.__quickDrill = d.id; onDrills(); }} style={{
                padding: '14px', background: d.bg, border: `1px solid ${d.color}15`,
                borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.12s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: d.color }}>{d.label}</div>
                <div style={{ fontSize: '10px', color: '#4a5a6a', marginTop: '2px' }}>{d.sub}</div>
              </div>
            ))}
          </div>
        </>)}
      </div>

      {/* ═══ BOTTOM NAV ═══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, #080c14, #060810)',
        borderTop: '1px solid #111820', display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        zIndex: 100,
      }}>
        {[
          { label: 'Play', icon: '♠', action: () => setTab('mtt') , active: tab === 'mtt' || tab === 'cash' },
          { label: 'Train', icon: '◎', action: () => setTab('train'), active: tab === 'train' },
          { label: 'Stats', icon: '▤', action: onStats, active: false },
          { label: 'Coach', icon: '☆', action: onCoach, active: false },
        ].map((n, i) => (
          <button key={i} onClick={n.action} style={{
            flex: 1, padding: '8px 0 6px', border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span style={{ fontSize: '20px', color: n.active ? '#ffd700' : '#2a3a4a', lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: n.active ? '#ffd700' : '#2a3a4a', letterSpacing: '0.5px' }}>{n.label}</span>
          </button>
        ))}
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
                {gs.winner.isHero ? 'You win ' : `${gs.winner.name} wins `}
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
        {/* Hero cards — larger */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', minHeight: '68px' }}>
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
        localAI.loadHistoricalProfile(); // Load hero leaks from past sessions
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

    // Bot chat messages (realistic table talk)
    try {
      const bl = tState.blinds || {};
      if (gs.winner && !gs.winner.isHero && gs.potWon > (bl.bb || 200) * 10) {
        const msgs = ['nh 🃏', 'ty', 'gg', 'ez', 'lol', 'wp'];
        setBotChat({ name: gs.winner.name, msg: msgs[Math.floor(Math.random() * msgs.length)] });
        setTimeout(() => setBotChat(null), 3000);
      }
      if (gs.winner?.isHero && gs.potWon > (bl.bb || 200) * 20) {
        const tiltMsgs = ['nice hand...', 'so lucky 😤', 'every time', 'rigged'];
        const loser = gs.players?.find(p => !p.isHero && !p.folded && p.id !== gs.winner?.id);
        if (loser) {
          setBotChat({ name: loser.name, msg: tiltMsgs[Math.floor(Math.random() * tiltMsgs.length)] });
          setTimeout(() => setBotChat(null), 3500);
        }
      }
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

      {/* Table */}
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

      {/* Live tell hint */}
      {tellHint && liveMode && gs?.waitingForHero && (
        <div style={{
          background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '8px', padding: '8px 12px', margin: '4px 12px',
          fontSize: '12px', color: '#c4b5fd', textAlign: 'center', fontStyle: 'italic',
        }}>
          <span>👁 {tellHint.text}</span>
          <span style={{ fontSize: '10px', color: '#7c6faa', marginLeft: '6px' }}>({tellHint.reliability})</span>
        </div>
      )}

      {/* Personal trainer — pot odds + range reading */}
      {showTrainer && gs?.waitingForHero && gs?.toCall > 0 && (
        <div style={{
          background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.25)',
          borderRadius: '8px', padding: '8px 12px', margin: '4px 12px',
          fontSize: '12px', color: '#a0d8b0', textAlign: 'center',
        }}>
          <div>Pot odds: <b>{Math.round((gs.toCall / (gs.pot + gs.toCall)) * 100)}%</b> — you need {Math.round((gs.toCall / (gs.pot + gs.toCall)) * 100)}% equity to call</div>
          {gs.heroCards?.length === 2 && <div style={{ fontSize: '11px', color: '#6a9a7a', marginTop: '2px' }}>Your equity: ~{Math.round((gs.handStrength || 0.5) * 100)}%{(gs.handStrength || 0) > (gs.toCall / (gs.pot + gs.toCall)) ? ' ✓ +EV call' : ' ✗ -EV fold'}</div>}
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
              width: '100%', padding: '18px', border: 'none', borderRadius: '14px',
              background: 'linear-gradient(135deg, #1a6a3a, #27ae60)',
              color: '#fff', fontWeight: 800, fontSize: '17px', letterSpacing: '0.5px',
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
            <span style={{ fontSize: '11px', color: '#e74c3c', marginLeft: '8px' }}>(-{postHandTip.evLost} EV)</span>
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
  personalized: PersonalizedDrill,
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
