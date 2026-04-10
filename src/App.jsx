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

// ──── STYLES ────
const S = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0d12 0%, #151b28 100%)',
    color: '#e0e0e0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
    maxWidth: '500px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e2a3a',
    background: '#0a0d12',
  },
  hud: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '6px 8px',
    background: '#0d1118',
    borderBottom: '1px solid #1a2230',
    fontSize: '11px',
  },
  hudItem: { textAlign: 'center', flex: 1 },
  hudLabel: { color: '#6b7b8d', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  hudVal: { fontWeight: 700, fontSize: '13px' },
};

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ────────────────────────────────────
// LOBBY
// ────────────────────────────────────
function Lobby({ onStart, onDrills }) {
  const [format, setFormat] = useState('WSOP_Main');
  const [name, setName] = useState('');

  return (
    <div style={S.app}>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffd700', marginTop: '40px', letterSpacing: '2px' }}>
          WSOP POKER TRAINER
        </div>
        <div style={{ fontSize: '13px', color: '#6b7b8d', marginTop: '6px' }}>v3.0 — Full Tournament Emulator</div>
      </div>
      <div style={{ padding: '20px' }}>
        <label style={{ fontSize: '12px', color: '#8899aa', display: 'block', marginBottom: '6px' }}>Your Name</label>
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Hero"
          style={{
            width: '100%', padding: '12px', background: '#111820', border: '1px solid #2a3a4a',
            borderRadius: '8px', color: '#e0e0e0', fontSize: '16px', outline: 'none', marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />
        <label style={{ fontSize: '12px', color: '#8899aa', display: 'block', marginBottom: '6px' }}>Tournament</label>
        {Object.entries(FORMATS).map(([key, f]) => (
          <div key={key} onClick={() => setFormat(key)} style={{
            padding: '14px', background: format === key ? '#1a3a5c' : '#111820',
            border: `1px solid ${format === key ? '#2a6a9a' : '#1e2a3a'}`,
            borderRadius: '10px', marginBottom: '8px', cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 700, color: format === key ? '#ffd700' : '#c0d0e0' }}>{f.name}</div>
            <div style={{ fontSize: '12px', color: '#6b7b8d', marginTop: '4px' }}>
              {f.players} players — {f.startingChips.toLocaleString()} chips — ${f.buyIn.toLocaleString()}
            </div>
          </div>
        ))}
        <button onClick={() => onStart(format, name || 'Hero')} style={{
          width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1a5c3a, #27ae60)',
          border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '18px',
          cursor: 'pointer', marginTop: '8px',
        }}>START TOURNAMENT</button>
        <button onClick={onDrills} style={{
          width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1a3a5c, #2980b9)',
          border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px',
          cursor: 'pointer', marginTop: '10px',
        }}>TRAINING DRILLS</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────
// TABLE FELT
// ────────────────────────────────────
const SEATS = [
  { left: '50%', top: '88%' },
  { left: '12%', top: '72%' },
  { left: '3%',  top: '45%' },
  { left: '12%', top: '20%' },
  { left: '35%', top: '5%' },
  { left: '65%', top: '5%' },
  { left: '88%', top: '20%' },
  { left: '97%', top: '45%' },
  { left: '88%', top: '72%' },
];

function TableView({ gs }) {
  if (!gs || !gs.players) return null;

  const heroIdx = gs.heroIndex;
  const showdown = gs.phase === 'showdown';
  const showdownMap = {};
  if (showdown && gs.showdownResults) {
    for (const r of gs.showdownResults) {
      showdownMap[r.player.id] = r;
    }
  }

  // Reorder: hero at seat 0
  const seated = [];
  for (let i = 0; i < gs.players.length; i++) {
    seated.push(gs.players[(heroIdx + i) % gs.players.length]);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '370px', maxWidth: '500px', margin: '0 auto' }}>
      {/* Felt */}
      <div style={{
        position: 'absolute', top: '14%', left: '10%', width: '80%', height: '62%',
        background: 'radial-gradient(ellipse, #1a5c3a 0%, #0d3d24 70%, #0a2d1a 100%)',
        borderRadius: '120px', border: '4px solid #2a7a4a',
        boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
      }} />

      {/* Pot */}
      {gs.pot > 0 && (
        <div style={{ position: 'absolute', top: '34%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 5 }}>
          <div style={{ fontSize: '10px', color: '#8ca88c', letterSpacing: '1px' }}>POT</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffd700' }}>{fmt(gs.pot)}</div>
        </div>
      )}

      {/* Community */}
      {gs.community.length > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', gap: '4px', zIndex: 5,
        }}>
          {gs.community.map((c, i) => <Card key={i} card={c} mini delay={i * 120} />)}
        </div>
      )}

      {/* Seats */}
      {seated.map((p, seatI) => {
        if (!p || p.folded) return null;
        const pos = SEATS[seatI % SEATS.length];
        const isHero = seatI === 0;
        const sdResult = showdownMap[p.id];
        const isWinner = gs.winner && gs.winner.id === p.id;
        const isDealer = gs.players.indexOf(p) === gs.dealerIdx;

        return (
          <div key={p.id} style={{
            position: 'absolute', left: pos.left, top: pos.top,
            transform: 'translate(-50%, -50%)', textAlign: 'center', width: '72px', zIndex: 10,
            ...(isHero ? { padding: '4px', borderRadius: '10px', background: 'rgba(255,215,0,0.06)', boxShadow: '0 0 12px rgba(255,215,0,0.15)' } : {}),
            ...(isWinner ? { boxShadow: '0 0 16px rgba(255,215,0,0.5)', borderRadius: '10px', padding: '4px', background: 'rgba(255,215,0,0.1)' } : {}),
          }}>
            {/* Position label */}
            <div style={{ fontSize: '9px', color: '#6b8fa3', fontWeight: 600 }}>{p.position}</div>
            {/* Name */}
            <div style={{ fontSize: '10px', color: isHero ? '#ffd700' : '#a0b0c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.emoji || ''} {isHero ? 'Hero' : p.name}
            </div>
            {/* Cards */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0', minHeight: '36px' }}>
              {isHero && gs.heroCards.length > 0 ? (
                gs.heroCards.map((c, ci) => <Card key={ci} card={c} mini delay={ci * 200} />)
              ) : showdown && sdResult?.cards ? (
                sdResult.cards.map((c, ci) => <Card key={ci} card={c} mini delay={ci * 100} />)
              ) : !isHero ? (
                <><Card card="Xx" faceDown mini /><Card card="Xx" faceDown mini /></>
              ) : null}
            </div>
            {/* Hand name at showdown */}
            {showdown && sdResult?.hand && (
              <div style={{ fontSize: '9px', color: isWinner ? '#ffd700' : '#8899aa', fontWeight: 600 }}>
                {sdResult.hand.name}
              </div>
            )}
            {/* Chips */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: isWinner ? '#ffd700' : '#ffd700' }}>
              {fmt(p.chips)}
            </div>
            {/* Current bet */}
            {p.bet > 0 && (
              <div style={{ fontSize: '10px', color: '#4caf50', fontWeight: 600 }}>{fmt(p.bet)}</div>
            )}
            {/* All-in badge */}
            {p.allIn && (
              <div style={{ fontSize: '9px', color: '#e74c3c', fontWeight: 700 }}>ALL-IN</div>
            )}
            {/* Dealer chip */}
            {isDealer && (
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px',
                borderRadius: '50%', background: '#ffd700', color: '#000', fontSize: '10px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>D</div>
            )}
          </div>
        );
      })}

      {/* Winner announcement */}
      {gs.phase === 'showdown' && gs.winner && (
        <div style={{
          position: 'absolute', bottom: '2%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', padding: '8px 20px', borderRadius: '20px',
          fontSize: '14px', fontWeight: 700, color: '#ffd700', whiteSpace: 'nowrap', zIndex: 20,
          border: '1px solid #ffd700',
        }}>
          {gs.winner.isHero ? 'You win' : gs.winner.name + ' wins'} {fmt(gs.potWon)}!
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────
// HAND LOG
// ────────────────────────────────────
function HandLog({ entries }) {
  if (!entries || entries.length === 0) return null;

  const actionColor = { fold: '#c0392b', check: '#2980b9', call: '#27ae60', raise: '#f39c12', win: '#ffd700' };

  return (
    <div style={{
      background: '#111820', borderRadius: '10px', padding: '10px 12px', margin: '8px 12px',
      border: '1px solid #1e2a3a', maxHeight: '160px', overflowY: 'auto',
    }}>
      <div style={{ fontSize: '11px', color: '#6b7b8d', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hand Log</div>
      {entries.slice(-15).reverse().map((e, i) => (
        <div key={i} style={{
          fontSize: '12px', color: '#a0b0c0', padding: '2px 0', borderBottom: '1px solid #0d1118',
          ...(e.isHero ? { background: 'rgba(255,215,0,0.04)', borderRadius: '3px', padding: '2px 4px', margin: '0 -4px' } : {}),
        }}>
          {e.text}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────
// MAIN GAME
// ────────────────────────────────────
function Game({ director, onExit }) {
  const [view, setView] = useState('table');
  const [tournState, setTourn] = useState(() => director.getState());
  const [gs, setGs] = useState(null); // game engine state
  const [handActive, setHandActive] = useState(false);

  const dirRef = useRef(director);
  const engineRef = useRef(new GameEngine());
  const aiBotsRef = useRef({});

  // Init AI bots for hero table
  useEffect(() => {
    const state = dirRef.current.getState();
    if (state.heroTable) {
      const bots = {};
      for (const p of state.heroTable.players) {
        if (!p.isHero && p.profile) {
          bots[p.id] = new AdaptiveAI(p.profile);
        }
      }
      aiBotsRef.current = bots;
    }
  }, []);

  // Background sim
  useEffect(() => {
    const iv = setInterval(() => {
      dirRef.current.simulateBackgroundTick(3);
      dirRef.current.checkBlindLevel();
      setTourn(dirRef.current.getState());
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  // Play one hand
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

    const ok = engine.startHand(tablePlayers, dealer, blinds, aiBotsRef.current);
    if (!ok) { setHandActive(false); return; }

    setGs(engine.getState());

    await engine.runHand((state) => {
      setGs({ ...state });
    });

    // Post-hand: eliminate busted, advance dealer, notify adaptive AI
    for (const p of tablePlayers) {
      if (p.chips <= 0 && !p.eliminated) {
        dirRef.current.pool.eliminate(p.id);
      }
    }

    const heroTable = dirRef.current.tableManager.getHeroTable();
    if (heroTable) {
      const alive = heroTable.players.filter(p => !p.eliminated);
      heroTable.dealer = (heroTable.dealer + 1) % Math.max(1, alive.length);
    }

    dirRef.current.checkBlindLevel();
    setTourn(dirRef.current.getState());
    setHandActive(false);
  }, [handActive]);

  // Hero action
  const handleAction = useCallback((action, amount) => {
    engineRef.current.submitHeroAction(action, amount);
  }, []);

  if (view === 'dashboard') {
    return (
      <div style={S.app}>
        <TournamentDashboard state={tournState} onBackToTable={() => setView('table')} />
      </div>
    );
  }

  const blinds = tournState.blinds;
  const m = mRatio(tournState.heroChips, blinds.sb, blinds.bb, blinds.ante || 0, 9);
  // equity display handled in HUD via getHandValue if needed

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffd700' }}>{tournState.format.name}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setView('dashboard')} style={{
            padding: '5px 10px', background: '#1a2840', border: '1px solid #2a3a4a',
            borderRadius: '6px', color: '#8899aa', fontSize: '11px', cursor: 'pointer',
          }}>Info</button>
          <span style={{ fontSize: '12px', color: '#6b7b8d' }}>
            Lvl {blinds.level + 1} | {tournState.playersRemaining}/{tournState.totalPlayers}
          </span>
        </div>
      </div>

      {/* HUD */}
      <div style={S.hud}>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>Stack</div>
          <div style={{ ...S.hudVal, color: '#ffd700' }}>{fmt(tournState.heroChips)}</div>
        </div>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>Pot</div>
          <div style={{ ...S.hudVal, color: '#e0e0e0' }}>{fmt(gs?.pot || 0)}</div>
        </div>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>Blinds</div>
          <div style={{ ...S.hudVal, color: '#c0d0e0', fontSize: '11px' }}>{fmt(blinds.sb)}/{fmt(blinds.bb)}</div>
        </div>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>M</div>
          <div style={{ ...S.hudVal, color: m < 10 ? '#e74c3c' : m < 20 ? '#f39c12' : '#27ae60' }}>{m.toFixed(0)}</div>
        </div>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>Rank</div>
          <div style={{ ...S.hudVal, color: '#c0d0e0' }}>#{tournState.heroRank}</div>
        </div>
        <div style={S.hudItem}>
          <div style={S.hudLabel}>Pos</div>
          <div style={{ ...S.hudVal, color: '#8899aa', fontSize: '11px' }}>{gs?.heroPosition || '—'}</div>
        </div>
      </div>

      {/* Bubble alert */}
      {tournState.isBubble && (
        <div style={{ textAlign: 'center', padding: '6px', background: '#2a1010', color: '#e74c3c', fontWeight: 700, fontSize: '12px' }}>
          BUBBLE — {tournState.playersRemaining - tournState.payout.paidPlaces} from the money!
        </div>
      )}
      {tournState.isFinalTable && (
        <div style={{ textAlign: 'center', padding: '6px', background: '#2a2010', color: '#f39c12', fontWeight: 700, fontSize: '12px' }}>
          FINAL TABLE
        </div>
      )}

      {/* Table */}
      <TableView gs={gs || {
        players: tournState.heroTable?.players.filter(p => !p.eliminated).map((p, i) => ({ ...p, position: '', bet: 0, folded: false, allIn: false })) || [],
        community: [], pot: 0, heroCards: [], heroIndex: tournState.heroTable?.players.findIndex(p => p.isHero) || 0,
        dealerIdx: tournState.heroTable?.dealer || 0, phase: 'idle', showdownResults: null, winner: null, potWon: 0,
      }} />

      {/* Controls */}
      {gs?.waitingForHero && (
        <Controls
          canCheck={gs.canCheck}
          canCall={gs.toCall > 0}
          toCall={gs.toCall}
          pot={gs.pot}
          myChips={gs.heroChips}
          minRaise={gs.minRaise}
          maxRaise={gs.maxRaise}
          onAction={handleAction}
        />
      )}

      {/* Deal button */}
      {!handActive && gs?.phase !== 'showdown' && (
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <button onClick={playHand} disabled={tournState.heroEliminated} style={{
            width: '100%', padding: '16px',
            background: tournState.heroEliminated
              ? 'linear-gradient(135deg, #4a1010, #6a1010)'
              : 'linear-gradient(135deg, #1a5c3a, #27ae60)',
            border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800,
            fontSize: '16px', cursor: tournState.heroEliminated ? 'default' : 'pointer',
            opacity: tournState.heroEliminated ? 0.6 : 1,
          }}>
            {tournState.heroEliminated ? `ELIMINATED #${tournState.heroRank}` : 'DEAL NEXT HAND'}
          </button>
        </div>
      )}

      {/* Hand Log */}
      <HandLog entries={gs?.actionLog} />
    </div>
  );
}

// ────────────────────────────────────
// ROOT
// ────────────────────────────────────
const DRILL_MAP = {
  rfi: RFIDrill,
  '3bet': ThreeBetDrill,
  bbdef: BBDefenseDrill,
  pushfold: PushFoldDrill,
  postflop: PostflopDrill,
  sizing: SizingDrill,
  potodds: PotOddsDrill,
};

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | tournament | drills | drill | debrief
  const [director, setDirector] = useState(null);
  const [activeDrill, setActiveDrill] = useState(null);
  const [debriefData, setDebriefData] = useState(null);

  if (screen === 'drill' && activeDrill) {
    const DrillComp = DRILL_MAP[activeDrill];
    if (DrillComp) return <div style={S.app}><DrillComp onBack={() => setScreen('drills')} /></div>;
  }

  if (screen === 'drills') {
    return (
      <div style={S.app}>
        <DrillMenu
          onSelect={(id) => { setActiveDrill(id); setScreen('drill'); }}
          onBack={() => setScreen('lobby')}
        />
      </div>
    );
  }

  if (screen === 'debrief' && debriefData) {
    return (
      <div style={S.app}>
        <DebriefScreen
          debrief={debriefData.debrief}
          finish={debriefData.finish}
          records={debriefData.records}
          onClose={() => { setDebriefData(null); setScreen('lobby'); }}
          onExport={() => {
            const data = exportSession();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `session_${Date.now()}.json`; a.click();
          }}
        />
      </div>
    );
  }

  if (screen === 'tournament' && director) {
    return <Game director={director} onExit={(finish) => {
      const records = getRecords();
      if (records.length > 0) {
        saveSession();
        const debrief = generateDebrief(records);
        setDebriefData({ debrief, finish: finish || {}, records });
        setScreen('debrief');
      } else {
        setDirector(null);
        setScreen('lobby');
      }
    }} />;
  }

  return (
    <Lobby
      onStart={(fmt, name) => {
        startSession(fmt);
        setDirector(new TournamentDirector(fmt, name));
        setScreen('tournament');
      }}
      onDrills={() => setScreen('drills')}
    />
  );
}
