// LeakFinder.jsx — Ranked money leaks by spot family + Session Autopilot + Daily Missions
import React, { useState, useMemo } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';

// Normalize hand for grouping
function normHand(hc) {
  if (!hc || typeof hc !== 'string') return null;
  const p = hc.split(' ');
  if (p.length < 2) return null;
  const RO = 'AKQJT98765432';
  const r1 = p[0][0], s1 = p[0][1], r2 = p[1][0], s2 = p[1][1];
  const i1 = RO.indexOf(r1), i2 = RO.indexOf(r2);
  if (i1 < 0 || i2 < 0) return null;
  if (i1 === i2) return r1 + r2;
  return i1 < i2 ? r1 + r2 + (s1 === s2 ? 's' : 'o') : r2 + r1 + (s1 === s2 ? 's' : 'o');
}

function parseBB(blinds) {
  if (!blinds) return 200;
  const parts = String(blinds).split('/');
  return parseInt(parts[1]) || parseInt(parts[0]) * 2 || 200;
}

// Classify spot family
function getSpotFamily(r) {
  const pos = r.position || '?';
  const stage = r.stage || 'preflop';
  const action = r.action || '?';
  const facing = r.facingAction?.action || 'none';

  if (stage === 'preflop') {
    if (facing === 'none' || facing === 'fold') return `${pos} RFI`;
    if (facing === 'raise' && pos === 'BB') return 'BB Defense';
    if (facing === 'raise' && pos === 'SB') return 'SB vs Raise';
    if (facing === 'raise') return `${pos} vs Raise`;
    return `${pos} Preflop`;
  }
  if (stage === 'flop') {
    if (action === 'raise' || action === 'bet') return 'Flop Aggression';
    if (action === 'call') return 'Flop Call';
    if (action === 'fold') return 'Flop Fold';
    return 'Flop Check';
  }
  if (stage === 'turn') return action === 'fold' ? 'Turn Fold' : 'Turn Play';
  if (stage === 'river') {
    if (action === 'fold') return 'River Fold';
    if (action === 'call') return 'River Call';
    return 'River Bet/Raise';
  }
  return 'Other';
}

function processLeaks(sessions) {
  const spots = {}; // spotFamily → { count, mistakes, evLost, hands[] }
  const allMistakes = [];

  for (const s of sessions) {
    const recs = s.records || [];
    for (const r of recs) {
      const family = getSpotFamily(r);
      const bb = parseBB(r.blinds);
      const evLostBB = r.mistakeType ? (r.evLost || 0) / bb : 0;

      if (!spots[family]) spots[family] = { count: 0, mistakes: 0, evLost: 0, evLostBB: 0, hands: [] };
      spots[family].count++;
      if (r.mistakeType) {
        spots[family].mistakes++;
        spots[family].evLost += r.evLost || 0;
        spots[family].evLostBB += evLostBB;
        spots[family].hands.push(r);
        allMistakes.push({ ...r, family, evLostBB });
      }
    }
  }

  // Sort by EV lost
  const ranked = Object.entries(spots)
    .filter(([, v]) => v.mistakes > 0)
    .sort((a, b) => b[1].evLostBB - a[1].evLostBB)
    .map(([name, data]) => ({
      name, ...data,
      mistakeRate: Math.round(data.mistakes / data.count * 100),
      avgEvLostBB: Math.round(data.evLostBB / data.mistakes * 100) / 100,
    }));

  // Worst 10 hands for autopilot
  const worst10 = allMistakes.sort((a, b) => b.evLostBB - a.evLostBB).slice(0, 10);

  return { ranked, worst10, totalMistakes: allMistakes.length };
}

// Daily missions based on top leaks
function getDailyMissions(ranked) {
  const today = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem('pokertrain_daily_missions') || '{}');
  if (saved.date === today && saved.missions) return saved;

  const missions = ranked.slice(0, 3).map((leak, i) => ({
    id: i, name: leak.name, target: 10, // 10 drill reps
    description: `Fix "${leak.name}" — ${leak.mistakes} mistakes, ${leak.avgEvLostBB}bb avg loss`,
    completed: 0,
  }));

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streakContinues = saved.date === yesterday;
  const data = { date: today, missions, streak: streakContinues ? (saved.streak || 0) + 1 : 1 };
  localStorage.setItem('pokertrain_daily_missions', JSON.stringify(data));
  return data;
}

function completeMission(missionId) {
  const saved = JSON.parse(localStorage.getItem('pokertrain_daily_missions') || '{}');
  if (!saved.missions) return;
  const m = saved.missions.find(m => m.id === missionId);
  if (m && m.completed < m.target) {
    m.completed = Math.min(m.completed + 1, m.target);
    localStorage.setItem('pokertrain_daily_missions', JSON.stringify(saved));
  }
}

// Baseline tracker
function getBaseline(sessions) {
  const now = Date.now();
  const thisMonth = sessions.filter(s => {
    const ts = s.records?.[0]?.timestamp || 0;
    return now - ts < 30 * 86400000;
  });
  const lastMonth = sessions.filter(s => {
    const ts = s.records?.[0]?.timestamp || 0;
    return now - ts >= 30 * 86400000 && now - ts < 60 * 86400000;
  });

  function calcStats(sess) {
    let vpipN = 0, vpipT = 0, pfrN = 0, pfrT = 0, mistakes = 0, hands = 0;
    for (const s of sess) {
      const pfMap = new Map();
      for (const r of (s.records || [])) {
        if (r.stage === 'preflop' && !pfMap.has(r.handNumber)) pfMap.set(r.handNumber, r);
        if (r.mistakeType) mistakes++;
      }
      const pf = [...pfMap.values()];
      hands += pf.length;
      vpipT += pf.length;
      vpipN += pf.filter(r => r.action !== 'fold' && r.action !== 'bb_walk' && !(r.action === 'check' && r.position === 'BB')).length;
      pfrT += pf.length;
      pfrN += pf.filter(r => r.action === 'raise').length;
    }
    return {
      hands, sessions: sess.length, mistakes,
      vpip: vpipT > 0 ? Math.round(vpipN / vpipT * 100) : 0,
      pfr: pfrT > 0 ? Math.round(pfrN / pfrT * 100) : 0,
      accuracy: hands > 0 ? Math.round((1 - mistakes / hands) * 100) : 0,
    };
  }

  return { current: calcStats(thisMonth), previous: calcStats(lastMonth) };
}

// ═══ COMPONENTS ═══

function LeakCard({ leak, rank }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{
      background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '8px',
      border: `1px solid ${rank <= 3 ? '#5a1a1a' : '#222'}`, cursor: 'pointer',
      boxShadow: rank <= 3 ? '0 0 8px rgba(239,68,68,0.1)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: rank <= 3 ? '#2a0a0a' : '#1a1a1a', color: rank <= 3 ? '#ef4444' : '#666',
          fontSize: '12px', fontWeight: 900,
        }}>#{rank}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5' }}>{leak.name}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>{leak.count} spots | {leak.mistakes} mistakes ({leak.mistakeRate}%)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>-{Math.round(leak.evLostBB * 10) / 10}bb</div>
          <div style={{ fontSize: '9px', color: '#666' }}>total EV lost</div>
        </div>
      </div>
      {open && leak.hands.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #222', paddingTop: '8px' }}>
          {leak.hands.slice(0, 5).map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#888', padding: '3px 0', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{h.position}</span>
              <span style={{ marginLeft: '6px', color: '#ccc' }}>{h.holeCards}</span>
              <span style={{ marginLeft: '6px', color: '#ef4444' }}>{h.mistakeType?.replace(/_/g, ' ')}</span>
              <span style={{ marginLeft: '6px', color: '#666' }}>-{Math.round((h.evLost || 0) / parseBB(h.blinds) * 10) / 10}bb</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeakFinder({ onBack }) {
  const [tab, setTab] = useState('leaks');

  const { ranked, worst10, totalMistakes } = useMemo(() => {
    const sessions = loadSessions();
    return processLeaks(sessions);
  }, []);

  const daily = useMemo(() => getDailyMissions(ranked), [ranked]);
  const baseline = useMemo(() => {
    const sessions = loadSessions();
    return getBaseline(sessions);
  }, []);

  const b = baseline;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e5e5e5', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>Leak Finder</div>
          <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#888', fontSize: '12px', cursor: 'pointer' }}>Back</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {[{id:'leaks',label:'Money Leaks'},{id:'autopilot',label:'Session Review'},{id:'daily',label:'Daily Mission'},{id:'baseline',label:'Progress'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#ef4444' : '#111', color: tab === t.id ? '#fff' : '#666',
              fontWeight: 700, fontSize: '11px',
            }}>{t.label}</button>
          ))}
        </div>

        {/* LEAKS TAB */}
        {tab === 'leaks' && (
          <div>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>
              {totalMistakes} mistakes found | Ranked by EV impact
            </div>
            {ranked.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: '40px' }}>Play more sessions to detect leaks</div>}
            {ranked.map((leak, i) => <LeakCard key={leak.name} leak={leak} rank={i + 1} />)}
          </div>
        )}

        {/* AUTOPILOT TAB */}
        {tab === 'autopilot' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '10px' }}>10 Worst Hands — Fix These First</div>
            {worst10.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: '40px' }}>No mistakes detected yet</div>}
            {worst10.map((h, i) => (
              <div key={i} style={{
                background: '#111', borderRadius: '10px', padding: '12px', marginBottom: '6px',
                border: `1px solid ${i < 3 ? '#5a1a1a' : '#222'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '12px' }}>{h.position}</span>
                    <span style={{ color: '#ccc', fontWeight: 600, marginLeft: '8px' }}>{h.holeCards}</span>
                    <span style={{ color: '#555', fontSize: '10px', marginLeft: '6px' }}>{h.family}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#ef4444', fontWeight: 800 }}>-{Math.round(h.evLostBB * 10) / 10}bb</div>
                    <div style={{ color: '#666', fontSize: '9px' }}>{h.mistakeType?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                {h.community && <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>Board: {h.community}</div>}
              </div>
            ))}
          </div>
        )}

        {/* DAILY MISSION TAB */}
        {tab === 'daily' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Today's Missions</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#fbbf24' }}>{daily.streak || 0}</div>
              <div style={{ fontSize: '10px', color: '#555' }}>day streak</div>
            </div>
            {daily.missions?.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: '30px' }}>Play sessions to unlock daily missions</div>}
            {(daily.missions || []).map((m, i) => (
              <div key={i} style={{
                background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '8px',
                border: '1px solid #222',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e5e5' }}>Fix: {m.name}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{m.description}</div>
                  </div>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: m.completed >= m.target ? '#22c55e' : '#1a1a1a',
                    border: `2px solid ${m.completed >= m.target ? '#22c55e' : '#333'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, color: m.completed >= m.target ? '#000' : '#555',
                  }}>{m.completed >= m.target ? '✓' : `${m.completed}/${m.target}`}</div>
                </div>
                <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, m.completed / m.target * 100)}%`, background: '#fbbf24', borderRadius: '2px' }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BASELINE TAB */}
        {tab === 'baseline' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '10px' }}>This Month vs Last Month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'VPIP', cur: b.current.vpip, prev: b.previous.vpip, unit: '%', good: (v) => v >= 20 && v <= 30 },
                { label: 'PFR', cur: b.current.pfr, prev: b.previous.pfr, unit: '%', good: (v) => v >= 15 && v <= 25 },
                { label: 'Accuracy', cur: b.current.accuracy, prev: b.previous.accuracy, unit: '%', good: (v) => v >= 80 },
                { label: 'Hands', cur: b.current.hands, prev: b.previous.hands, unit: '', good: () => true },
              ].map(m => {
                const diff = m.cur - m.prev;
                const improved = m.label === 'Accuracy' ? diff > 0 : (m.label === 'Hands' ? diff > 0 : Math.abs(m.cur - 22) < Math.abs(m.prev - 22));
                return (
                  <div key={m.label} style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
                    <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: m.good(m.cur) ? '#22c55e' : '#fbbf24' }}>{m.cur}{m.unit}</div>
                    <div style={{ fontSize: '11px', color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#555' }}>
                      {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(diff)}{m.unit} vs last month
                    </div>
                    <div style={{ fontSize: '10px', color: '#444' }}>Was: {m.prev}{m.unit}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '8px' }}>Sessions</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#ccc' }}>This month: {b.current.sessions} sessions, {b.current.hands} hands</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                <span style={{ color: '#666' }}>Last month: {b.previous.sessions} sessions, {b.previous.hands} hands</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
