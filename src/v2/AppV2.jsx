// AppV2.jsx — IceCrown Engine 2.0 composition root.
// GlobalStyles + ErrorBoundary + SceneProvider/SceneMount. V2 scenes (profiles,
// lobby, drill hub) wrap the proven legacy screens, which are all code-split via
// React.lazy. Tournament + debrief flow state (director, debriefData) lives here.
import React, { useState, useRef, useEffect, useContext, createContext, Suspense } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from './ui/tokens.js';
import GlobalStyles from './ui/GlobalStyles.jsx';
import { SceneProvider, SceneMount, useScene } from './engine/SceneRouter.jsx';
import ProfileSelectV2 from './scenes/ProfileSelectV2.jsx';
import LobbyV2 from './scenes/LobbyV2.jsx';

// Game-start / debrief logic (same modules V1 wires — kept eager, they are the core loop)
import { TournamentDirector } from '../tournament/TournamentDirector.js';
import { FORMATS } from '../data/tournamentFormats.js';
import { CASH_FORMATS } from '../data/cashFormats.js';
import { startSession, getRecords, saveSession, exportSession } from '../recorder/ActionRecorder.js';
import { generateDebrief } from '../recorder/autoDebrief.js';
import { updateBankroll } from '../lib/achievements.js';
import { submitCurrentStats } from '../lib/leaderboardAPI.js';

// ─── Lazy legacy scenes (code-splitting) ───
const lazyNamed = (loader, name) => React.lazy(() => loader().then((m) => ({ default: m[name] })));

const Game = lazyNamed(() => import('../App.jsx'), 'Game'); // V1 monolith chunk, loaded on demand
const WrapLegacy = lazyNamed(() => import('./drills/SessionShellV2.jsx'), 'WrapLegacy');
const DrillHubV2 = React.lazy(() => import('./drills/DrillHubV2.jsx'));

const DebriefScreen = React.lazy(() => import('../stats/DebriefScreen.jsx'));
const StatsScreen = React.lazy(() => import('../stats/Dashboard.jsx'));
const GTOAnalyzer = React.lazy(() => import('../stats/GTOAnalyzer.jsx'));
const LeakFinder = React.lazy(() => import('../stats/LeakFinder.jsx'));
const Leaderboard = React.lazy(() => import('../stats/Leaderboard.jsx'));
const GameHistory = React.lazy(() => import('../stats/GameHistory.jsx'));
const RealAnalysis = React.lazy(() => import('../stats/RealAnalysis.jsx'));
const CoachScreen = React.lazy(() => import('../coach/Coach.jsx'));
const Settings = React.lazy(() => import('../components/Settings.jsx'));
const PrivacyPolicy = React.lazy(() => import('../legal/PrivacyPolicy.jsx'));
const TermsOfService = React.lazy(() => import('../legal/TermsOfService.jsx'));
const LeakDrill = React.lazy(() => import('../drills/leak/LeakDrill.jsx'));
const HandHistoryScreen = React.lazy(() => import('../drills/leak/HandHistoryScreen.jsx'));
const DrillHistory = React.lazy(() => import('../drills/DrillHistory.jsx'));

// Legacy drill registry — same ids as V1's DRILL_MAP in App.jsx
const DRILL_MAP = {
  rfi: React.lazy(() => import('../drills/RFIDrill.jsx')),
  '3bet': React.lazy(() => import('../drills/ThreeBetDrill.jsx')),
  bbdef: React.lazy(() => import('../drills/BBDefenseDrill.jsx')),
  pushfold: React.lazy(() => import('../drills/PushFoldDrill.jsx')),
  solverpf: React.lazy(() => import('../drills/SolverPushFoldDrill.jsx')),
  multiway: React.lazy(() => import('../drills/MultiwayDrill.jsx')),
  drawcomplete: React.lazy(() => import('../drills/DrawCompletionDrill.jsx')),
  threebetpot: React.lazy(() => import('../drills/ThreeBetPotDrill.jsx')),
  ahighcbet: React.lazy(() => import('../drills/AHighCbetDrill.jsx')),
  custom: React.lazy(() => import('../drills/CustomDrillBuilder.jsx')),
  postflop: React.lazy(() => import('../drills/PostflopDrill.jsx')),
  sizing: React.lazy(() => import('../drills/SizingDrill.jsx')),
  potodds: React.lazy(() => import('../drills/PotOddsDrill.jsx')),
  personalized: React.lazy(() => import('../drills/PersonalizedDrill.jsx')),
  river: React.lazy(() => import('../drills/RiverDrill.jsx')),
};

const DRILL_NAMES = {
  rfi: 'RFI Drill', '3bet': '3-Bet Drill', bbdef: 'BB Defense', pushfold: 'Push/Fold',
  solverpf: 'Solver Push/Fold', multiway: 'Multiway Postflop', drawcomplete: 'Draw Completion',
  threebetpot: '3-Bet Pot Lines', ahighcbet: 'A-high Cbet', custom: 'Custom Drill',
  postflop: 'Postflop Spots', sizing: 'Bet Sizing', potodds: 'Pot Odds', personalized: 'Your Weak Spots',
  river: 'River Decisions',
};

// ─── Branded suspense fallback ───
function GoldSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: Z.hud,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, background: GRAD.sceneBg, fontFamily: F.family,
    }}>
      <style>{'@keyframes ic-v2-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        border: '3px solid rgba(232,193,90,0.18)', borderTopColor: C.gold,
        animation: 'ic-v2-spin 0.8s linear infinite',
        boxShadow: '0 0 24px rgba(232,193,90,0.25)',
      }} />
      <div style={{ ...F.micro, color: C.gold, letterSpacing: 3.5 }}>♛ LOADING</div>
    </div>
  );
}

const L = ({ children }) => <Suspense fallback={<GoldSpinner />}>{children}</Suspense>;

// Small inline empty/error state (used when a scene mounts without its data)
function EmptyScene({ icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: GRAD.sceneBg, padding: SP.xl, fontFamily: F.family,
    }}>
      <div style={{
        maxWidth: 360, width: '100%', textAlign: 'center', padding: SP.xxl,
        background: GRAD.panel, border: `1px solid ${C.lineHi}`, borderRadius: R.lg, boxShadow: SH.panel,
      }}>
        <div style={{ fontSize: 38, marginBottom: SP.md }}>{icon}</div>
        <div style={{ ...F.h2, color: C.text, marginBottom: SP.sm }}>{title}</div>
        <div style={{ ...F.body, color: C.textDim, marginBottom: SP.xl }}>{message}</div>
        <button
          onClick={onAction}
          style={{
            minHeight: 46, padding: '0 26px', border: 'none', cursor: 'pointer',
            borderRadius: R.pill, background: GRAD.gold, color: '#241a06',
            fontFamily: F.family, fontSize: 13, fontWeight: 800, letterSpacing: 1,
            boxShadow: SH.goldGlow,
          }}
        >{actionLabel}</button>
      </div>
    </div>
  );
}

// ─── App-level shared state ───
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// Prefer back(); if the stack was reset under us, fall back to the lobby.
function goBack(scene) {
  if (scene.canBack) scene.back();
  else scene.reset('lobby');
}

// ═══════════════════════════════════════════
// Scenes
// ═══════════════════════════════════════════
function ProfilesScene() {
  const scene = useScene();
  const app = useApp();
  return (
    <ProfileSelectV2
      onSelect={(profile) => {
        app.selectProfile(profile); // persists + sets window.__playerPrefix
        scene.replace('lobby');
      }}
    />
  );
}

function LobbyScene() {
  const scene = useScene();
  const app = useApp();

  // Replicates V1 tournament start exactly (App.jsx onStart):
  // deduct buy-in → startSession → new TournamentDirector → tournament scene.
  const startPlay = (formatKey) => {
    try {
      const fmtObj = FORMATS[formatKey] || CASH_FORMATS[formatKey];
      const buyIn = (fmtObj && fmtObj.buyIn) || 1000;
      updateBankroll(buyIn, 0);
      startSession(formatKey);
      app.setDirector(new TournamentDirector(formatKey, (app.profile && app.profile.name) || 'Hero'));
      scene.go('tournament');
    } catch (e) {
      console.error('[AppV2] tournament start failed:', e);
    }
  };

  return (
    <LobbyV2
      playerName={app.profile && app.profile.name}
      onPlay={startPlay}
      onTraining={() => scene.go('drills')}
      onStats={() => scene.go('stats')}
      onGTO={() => scene.go('gto')}
      onLeaks={() => scene.go('leaks')}
      onHistory={() => scene.go('history')}
      onCoach={() => scene.go('coach')}
      onLeaderboard={() => scene.go('leaderboard')}
      onSettings={() => scene.go('settings')}
      onRealAnalysis={() => scene.go('realanalysis')}
      onSwitchProfile={() => { app.clearProfile(); scene.reset('profiles'); }}
    />
  );
}

function TournamentScene() {
  const scene = useScene();
  const app = useApp();

  if (!app.director) {
    return (
      <EmptyScene
        icon="🏆" title="NO ACTIVE GAME"
        message="This table has no running tournament. Head back to the lobby to register."
        actionLabel="Back to Lobby" onAction={() => scene.reset('lobby')}
      />
    );
  }

  // Replicates the V1 exit → debrief flow exactly (App.jsx screen === 'tournament').
  const handleExit = (finish) => {
    try {
      const records = getRecords();
      saveSession();
      submitCurrentStats().catch(() => {});
      const f = finish || {};
      const pos = f.position || 999;
      const total = f.total || 500;
      const fmtKey = records[0] && records[0].tournamentFormat;
      const buyIn = { WSOP_Main: 10000, WSOP_Daily: 1500, EPT_Main: 5300, WPT_500: 500, HARDCORE: 50000, GTD_100K: 500 }[fmtKey] || 1000;
      const pool = total * buyIn;
      let prize = 0;
      if (pos === 1) prize = pool * 0.22;
      else if (pos === 2) prize = pool * 0.14;
      else if (pos === 3) prize = pool * 0.10;
      else if (pos <= 5) prize = pool * 0.05;
      else if (pos <= Math.ceil(total * 0.15)) prize = pool * 0.015;
      updateBankroll(0, Math.round(prize)); // buy-in already deducted at start
      let aiExploit = null;
      try {
        const bots = Object.values(f.aiBots || {});
        const bot = bots.find((b) => b.getHeroSummary);
        if (bot) aiExploit = bot.getHeroSummary();
      } catch (e) {}
      const debrief = records.length > 0
        ? generateDebrief(records)
        : { totalMistakes: 0, criticalMistakes: 0, top5: [], estimatedEVLost: 0, summary: 'No data.', patterns: [] };
      debrief.prize = Math.round(prize);
      debrief.buyIn = buyIn;
      app.setDebriefData({ debrief, finish: f, records, aiExploit });
      app.setDirector(null);
      scene.replace('debrief'); // back from debrief lands in the lobby, not the dead table
    } catch (e) {
      console.error('[AppV2] exit error:', e);
      app.setDirector(null);
      scene.reset('lobby');
    }
  };

  return <L><Game director={app.director} onExit={handleExit} /></L>;
}

function DebriefScene() {
  const scene = useScene();
  const app = useApp();
  const data = app.debriefData;

  if (!data) {
    return (
      <EmptyScene
        icon="📋" title="NO DEBRIEF DATA"
        message="There is no finished session to review here."
        actionLabel="Back to Lobby" onAction={() => scene.reset('lobby')}
      />
    );
  }

  return (
    <L>
      <DebriefScreen
        debrief={data.debrief}
        finish={data.finish}
        records={data.records}
        aiExploit={data.aiExploit}
        onClose={() => { app.setDebriefData(null); scene.reset('lobby'); }}
        onDrill={(mistakeType) => {
          // Same mistake → drill mapping as V1
          const drillMap = { bad_fold: 'potodds', bad_call: 'potodds', too_passive: 'sizing', push_fold_error: 'pushfold', icm_error: 'pushfold', draw_fold_error: 'potodds' };
          const drillId = drillMap[mistakeType] || 'rfi';
          scene.go('drillLegacy', { entry: { id: 'debrief_fix', kind: 'legacy', target: drillId, name: DRILL_NAMES[drillId] || drillId } });
        }}
        onExport={() => {
          const data2 = exportSession();
          const blob = new Blob([JSON.stringify(data2, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `session_${Date.now()}.json`; a.click();
        }}
      />
    </L>
  );
}

function DrillsScene() {
  const scene = useScene();
  return (
    <L>
      <DrillHubV2
        onBack={() => goBack(scene)}
        onLaunch={(entry) => {
          if (!entry) return;
          if (entry.kind === 'legacy') scene.go('drillLegacy', { entry });
          else if (entry.kind === 'leak') scene.go('leakdrill', { leakId: entry.target });
          else if (entry.kind === 'screen') scene.go(entry.target);
        }}
      />
    </L>
  );
}

function DrillLegacyScene({ entry }) {
  const scene = useScene();
  const target = entry && entry.target;
  const Cmp = target ? DRILL_MAP[target] : null;
  if (!Cmp) {
    return (
      <EmptyScene
        icon="🎯" title="DRILL NOT FOUND"
        message={`No legacy drill is registered for "${target || 'unknown'}".`}
        actionLabel="Back to Training" onAction={() => goBack(scene)}
      />
    );
  }
  return (
    <L>
      <WrapLegacy Component={Cmp} title={(entry && entry.name) || DRILL_NAMES[target] || target} onBack={() => goBack(scene)} />
    </L>
  );
}

function LeakDrillScene({ leakId }) {
  const scene = useScene();
  if (!leakId) {
    return (
      <EmptyScene
        icon="🔬" title="LEAK DRILL NOT FOUND" message="No leak drill was selected."
        actionLabel="Back to Training" onAction={() => goBack(scene)}
      />
    );
  }
  return <L><LeakDrill leakId={leakId} onBack={() => goBack(scene)} /></L>;
}

// Generic wrapper for simple legacy screens that just take onBack (+ extras).
function makeLegacyScene(LazyComp, getExtraProps) {
  return function LegacySceneAdapter(routerProps) {
    const scene = useScene();
    const app = useApp();
    const extra = typeof getExtraProps === 'function' ? getExtraProps(scene, app, routerProps) : {};
    return <L><LazyComp onBack={() => goBack(scene)} {...extra} /></L>;
  };
}

const SCENES = {
  profiles: ProfilesScene,
  lobby: LobbyScene,
  tournament: TournamentScene,
  debrief: DebriefScene,
  drills: DrillsScene,
  drillLegacy: DrillLegacyScene,
  leakdrill: LeakDrillScene,
  handhistory: makeLegacyScene(HandHistoryScreen),
  drillhistory: makeLegacyScene(DrillHistory),
  stats: makeLegacyScene(StatsScreen),
  gto: makeLegacyScene(GTOAnalyzer),
  leaks: makeLegacyScene(LeakFinder),
  leaderboard: makeLegacyScene(Leaderboard),
  history: makeLegacyScene(GameHistory, (scene, app) => ({
    currentProfile: app.profile,
    allProfiles: (() => { try { return JSON.parse(localStorage.getItem('pokertrain_profiles') || '[]'); } catch (e) { return []; } })(),
  })),
  realanalysis: makeLegacyScene(RealAnalysis),
  coach: makeLegacyScene(CoachScreen),
  settings: makeLegacyScene(Settings, (scene, app) => ({
    onPrivacy: () => scene.go('privacy'),
    onTerms: () => scene.go('terms'),
    playerName: app.profile && app.profile.name,
  })),
  privacy: makeLegacyScene(PrivacyPolicy),
  terms: makeLegacyScene(TermsOfService),
};

// Legacy DebriefScreen navigates to the GTO lab through this global (V1 parity).
function GTOBridge() {
  const scene = useScene();
  useEffect(() => {
    window.__gotoGTO = () => { try { scene.go('gto'); } catch (e) {} };
  }, [scene]);
  return null;
}

// ─── Root ───
function AppV2Root() {
  const [profile, setProfileState] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('pokertrain_current_profile') || 'null');
      if (p) window.__playerPrefix = p.id + '_';
      return p;
    } catch (e) { return null; }
  });
  const [director, setDirector] = useState(null);
  const [debriefData, setDebriefData] = useState(null);
  const initialScene = useRef(profile ? 'lobby' : 'profiles').current;

  const selectProfile = (p) => {
    setProfileState(p);
    try {
      localStorage.setItem('pokertrain_current_profile', JSON.stringify(p));
      window.__playerPrefix = p.id + '_';
    } catch (e) {}
  };
  const clearProfile = () => {
    setProfileState(null);
    try { localStorage.removeItem('pokertrain_current_profile'); } catch (e) {}
  };

  const value = { profile, selectProfile, clearProfile, director, setDirector, debriefData, setDebriefData };

  return (
    <AppCtx.Provider value={value}>
      <SceneProvider initial={initialScene}>
        <GTOBridge />
        <SceneMount scenes={SCENES} />
      </SceneProvider>
    </AppCtx.Provider>
  );
}

// ─── Error boundary (same pattern as V1 App.jsx) ───
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('AppV2 crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: C.text, background: C.bgDeep, minHeight: '100vh', fontFamily: F.family }}>
          <h2 style={{ color: C.red }}>Something went wrong</h2>
          <p style={{ color: C.textDim, margin: '10px 0' }}>{String(this.state.error)}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '12px 24px', background: GRAD.gold, border: 'none', borderRadius: R.sm,
              color: '#241a06', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 16,
            }}
          >Restart</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppV2() {
  return (
    <ErrorBoundary>
      <GlobalStyles />
      <AppV2Root />
    </ErrorBoundary>
  );
}
