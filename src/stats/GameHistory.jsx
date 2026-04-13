// GameHistory.jsx — Game history: real money on top, training below, all players for admin
import React, { useState, useMemo } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';
import { parseHandHistory, analyzeRealHands, saveOpponentProfiles, saveRealSession, loadRealSessions } from '../lib/hhParser.js';

const S = {
  page: { minHeight: '100vh', background: '#060810', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" },
  container: { maxWidth: '540px', margin: '0 auto', padding: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  title: { fontSize: '22px', fontWeight: 900, color: '#ffd700' },
  backBtn: { padding: '8px 14px', borderRadius: '10px', border: '1px solid #1a2230', cursor: 'pointer', background: '#0d1118', color: '#6b7b8d', fontWeight: 700, fontSize: '12px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '14px' },
  tab: (a) => ({ flex: 1, padding: '10px 6px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: a ? 'linear-gradient(135deg,#1a2a4a,#1a3a5c)' : '#0d1118', color: a ? '#ffd700' : '#4a5a6a', fontWeight: 700, fontSize: '12px', transition: 'all 0.2s' }),
  card: { background: '#0d1118', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid #1a2230', cursor: 'pointer', transition: 'border-color 0.2s' },
  statRow: { display: 'flex', gap: '6px', marginBottom: '10px' },
  stat: { flex: 1, textAlign: 'center', padding: '10px 6px', background: '#080c14', borderRadius: '10px', border: '1px solid #141a22' },
  statVal: (c) => ({ fontSize: '20px', fontWeight: 900, color: c }),
  statLabel: { fontSize: '8px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#3a4a5a' },
  badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: bg, color: fg, marginLeft: '5px' }),
  section: { fontSize: '12px', fontWeight: 700, color: '#e8d48b', marginBottom: '6px', marginTop: '12px' },
  handRow: (won) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 10px', borderRadius: '8px', marginBottom: '3px',
    background: won === 'won' ? '#0a1a10' : won === 'lost' ? '#1a0a0a' : '#0a0d12',
    border: `1px solid ${won === 'won' ? '#1a3a2a' : won === 'lost' ? '#3a1a1a' : '#141a22'}`,
    fontSize: '11px',
  }),
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function fmtChips(n) {
  if (!n && n !== 0) return '0';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ═══ REAL SESSION CARD ═══
function RealSessionCard({ sess }) {
  const [expanded, setExpanded] = useState(false);
  const hands = sess.hands || [];
  return (
    <div style={{ ...S.card, borderColor: expanded ? '#2a5a3a' : '#1a2a20' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#27ae60' }}>
            {sess.format}
            <span style={S.badge('#0a2a1a', '#27ae60')}>REAL</span>
            {sess.isCash && <span style={S.badge('#1a2a0a', '#8aaa3a')}>CASH</span>}
          </div>
          <div style={{ fontSize: '10px', color: '#4a5a6a', marginTop: '2px' }}>
            {fmtDate(sess.timestamp)} | {sess.totalHands} hands | Blinds: {sess.blindsRange}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            <span style={S.badge('#0a1a3a', '#3a8aba')}>VP {sess.vpip}%</span>
            <span style={S.badge('#0a2a1a', '#2a8a4a')}>PF {sess.pfr}%</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '3px', color: '#ffd700' }}>
            {fmtChips(sess.finalChips)} chips
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #1a2a20', paddingTop: '8px' }} onClick={e => e.stopPropagation()}>
          {sess.opponents?.length > 0 && (
            <div style={{ fontSize: '10px', color: '#5a6a7a', marginBottom: '6px' }}>
              Opponents: {sess.opponents.slice(0, 6).join(', ')}
            </div>
          )}
          <div style={S.section}>Hands ({hands.length})</div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {hands.map((h, i) => (
              <div key={i} style={S.handRow(h.result)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                  <span style={{ color: '#ffd700', fontWeight: 700, minWidth: '26px', fontSize: '10px' }}>{h.position}</span>
                  <span style={{ color: '#c0d0e0', fontWeight: 600, minWidth: '42px' }}>{h.holeCards || '—'}</span>
                  <span style={{ color: '#5a6a7a', fontSize: '9px' }}>
                    {h.actions?.map(a => a.action?.[0]?.toUpperCase()).join('') || h.heroAction?.[0]?.toUpperCase() || ''}
                  </span>
                  {h.community && <span style={{ color: '#3a4a5a', fontSize: '9px', marginLeft: '2px' }}>{h.community}</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: '11px', minWidth: '50px', textAlign: 'right',
                  color: h.result === 'won' ? '#27ae60' : h.result === 'lost' ? '#e74c3c' : '#3a4a5a' }}>
                  {h.result === 'won' && h.potWon > 0 ? `+${fmtChips(h.potWon)}` : h.result === 'lost' ? 'lost' : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ TRAINING SESSION CARD ═══
function TrainingSessionCard({ sess, idx, total }) {
  const [expanded, setExpanded] = useState(false);
  const sm = sess.summary || {};
  const ts = sess.records?.[0]?.timestamp || 0;
  const format = sess.records?.[0]?.tournamentFormat || 'Training';
  const mistakes = sm.totalMistakes || 0;

  // Build hand list from records
  const hands = useMemo(() => {
    if (sess.handSummaries?.length > 0) return sess.handSummaries;
    const recs = sess.records || [];
    const byHand = new Map();
    for (const r of recs) { if (!byHand.has(r.handNumber)) byHand.set(r.handNumber, []); byHand.get(r.handNumber).push(r); }
    return [...byHand.entries()].map(([num, records]) => {
      const f = records[0], l = records[records.length - 1];
      return { hand: num, position: f.position || '?', holeCards: f.holeCards || '', actions: records.map(r => ({ stage: r.stage, action: r.action })),
        chipsBefore: f.myChips || 0, chipsAfter: l.chipsAfter || 0, netProfit: (l.chipsAfter || 0) - (f.myChips || 0),
        result: l.handResult || (l.action === 'fold' ? 'folded' : null), mistake: records.find(r => r.mistakeType)?.mistakeType || null,
        mistakeSeverity: records.find(r => r.mistakeType)?.mistakeSeverity || null, evLost: records.find(r => r.evLost)?.evLost || 0,
      };
    });
  }, [sess]);

  return (
    <div style={{ ...S.card, borderColor: expanded ? '#2a4a6a' : '#1a2230' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#c0d0e0' }}>
            #{total - idx} — {format.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '10px', color: '#4a5a6a', marginTop: '2px' }}>
            {fmtDate(ts)} | {sm.handsPlayed || sess.totalHands || 0} hands
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {sm.vpip != null && <span style={S.badge('#0a1a3a', '#3a8aba')}>VP {sm.vpip}%</span>}
            {sm.pfr != null && <span style={S.badge('#0a2a1a', '#2a8a4a')}>PF {sm.pfr}%</span>}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', fontWeight: 700, color: mistakes > 3 ? '#e74c3c' : mistakes > 0 ? '#f39c12' : '#27ae60' }}>
            {mistakes === 0 ? 'Clean' : `${mistakes} err`}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #141a22', paddingTop: '8px' }} onClick={e => e.stopPropagation()}>
          {sm.estimatedEVLost > 0 && <div style={{ fontSize: '10px', color: '#e74c3c', marginBottom: '6px' }}>EV Lost: {fmtChips(sm.estimatedEVLost)}</div>}
          <div style={S.section}>Hands ({hands.length})</div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {hands.map((h, i) => (
              <div key={i} style={S.handRow(h.result)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                  <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '10px', minWidth: '26px' }}>{h.position}</span>
                  <span style={{ color: '#c0d0e0', fontWeight: 600, minWidth: '42px' }}>{h.holeCards || '—'}</span>
                  <span style={{ color: '#5a6a7a', fontSize: '9px' }}>{h.actions?.map(a => a.action?.[0]?.toUpperCase()).join('')}</span>
                  {h.mistake && <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px',
                    background: h.mistakeSeverity === 'critical' ? '#3a0a0a' : '#2a1a0a',
                    color: h.mistakeSeverity === 'critical' ? '#ff4a4a' : '#f39c12', fontWeight: 700 }}>{h.mistake.replace(/_/g,' ')}</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: '11px', minWidth: '50px', textAlign: 'right',
                  color: h.result === 'won' ? '#27ae60' : h.result === 'lost' ? '#e74c3c' : '#3a4a5a' }}>
                  {h.result === 'won' && h.netProfit > 0 ? `+${fmtChips(h.netProfit)}` : h.result === 'lost' && h.netProfit < 0 ? fmtChips(h.netProfit) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ PLAYER CARD ═══
function PlayerCard({ profile, realCount, trainCount, totalHands, onSelect }) {
  return (
    <div style={{ ...S.card }} onClick={() => onSelect(profile)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(145deg,#1a2a40,#0a1520)', border: '2px solid #2a4060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#4a6a8a' }}>♠</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#c0d0e0' }}>{profile.name}</div>
            <div style={{ fontSize: '10px', color: '#4a5a6a' }}>{totalHands} hands total</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {realCount > 0 && <span style={S.badge('#0a2a1a', '#27ae60')}>{realCount} real</span>}
          {trainCount > 0 && <span style={S.badge('#0a1a3a', '#3a8aba')}>{trainCount} train</span>}
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function GameHistory({ onBack, currentProfile, allProfiles }) {
  const [tab, setTab] = useState('real');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [realSessions, setRealSessions] = useState(() => loadRealSessions());

  const trainingSessions = useMemo(() => loadSessions(), []);

  const isAdmin = useMemo(() => {
    if (!currentProfile || !allProfiles || allProfiles.length === 0) return true;
    return currentProfile.id === allProfiles[0]?.id || currentProfile.isAdmin;
  }, [currentProfile, allProfiles]);

  // All players' data for admin
  const allPlayerData = useMemo(() => {
    if (!isAdmin || !allProfiles) return [];
    return allProfiles.map(p => {
      const prefix = p.id + '_';
      let train = [], real = [];
      try { const raw = localStorage.getItem(prefix + 'wsop_sessions'); if (raw) train = JSON.parse(raw); } catch {}
      try { const raw = localStorage.getItem(prefix + 'pokertrain_real_sessions'); if (raw) real = JSON.parse(raw); } catch {}
      if (train.length === 0 && p.id === currentProfile?.id) train = trainingSessions;
      if (real.length === 0 && p.id === currentProfile?.id) real = realSessions;
      const totalHands = train.reduce((a, s) => a + (s.totalHands || s.summary?.handsPlayed || 0), 0) + real.reduce((a, s) => a + (s.totalHands || 0), 0);
      return { profile: p, train, real, totalHands };
    }).filter(p => p.train.length > 0 || p.real.length > 0);
  }, [isAdmin, allProfiles, currentProfile, trainingSessions, realSessions]);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.log';
    input.multiple = true;
    input.onchange = async (e) => {
      setUploading(true);
      let allText = '';
      for (const file of e.target.files) { allText += '\n' + await file.text(); }
      const hands = parseHandHistory(allText);
      if (hands.length > 0) {
        const analysis = analyzeRealHands(hands);
        const opp = saveOpponentProfiles(hands);
        analysis.opponentProfiles = opp;
        saveRealSession(hands, analysis);
        setRealSessions(loadRealSessions());
      }
      setUploading(false);
    };
    input.click();
  };

  // Stats
  const viewReal = selectedPlayer ? allPlayerData.find(p => p.profile.id === selectedPlayer.id)?.real || [] : realSessions;
  const viewTrain = selectedPlayer ? allPlayerData.find(p => p.profile.id === selectedPlayer.id)?.train || [] : trainingSessions;
  const totalRealHands = viewReal.reduce((a, s) => a + (s.totalHands || 0), 0);
  const totalTrainHands = viewTrain.reduce((a, s) => a + (s.totalHands || s.summary?.handsPlayed || 0), 0);

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.title}>{selectedPlayer ? selectedPlayer.name : 'Game History'}</div>
            {selectedPlayer && <div onClick={() => setSelectedPlayer(null)} style={{ fontSize: '11px', color: '#3a6a9a', cursor: 'pointer' }}>All players</div>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleUpload} style={{ ...S.backBtn, color: '#27ae60', borderColor: '#1a3a2a' }}>
              {uploading ? '...' : '+ Upload HH'}
            </button>
            <button onClick={onBack} style={S.backBtn}>Back</button>
          </div>
        </div>

        {/* Aggregate stats */}
        <div style={S.statRow}>
          <div style={S.stat}><div style={S.statVal('#27ae60')}>{viewReal.length}</div><div style={S.statLabel}>Real Games</div></div>
          <div style={S.stat}><div style={S.statVal('#3a8aba')}>{viewTrain.length}</div><div style={S.statLabel}>Training</div></div>
          <div style={S.stat}><div style={S.statVal('#c0d0e0')}>{totalRealHands + totalTrainHands}</div><div style={S.statLabel}>Total Hands</div></div>
        </div>

        {/* Tabs */}
        {!selectedPlayer && (
          <div style={S.tabs}>
            <button onClick={() => setTab('real')} style={S.tab(tab === 'real')}>Real Money ({viewReal.length})</button>
            <button onClick={() => setTab('train')} style={S.tab(tab === 'train')}>Training ({viewTrain.length})</button>
            {isAdmin && allProfiles?.length > 1 && (
              <button onClick={() => setTab('players')} style={S.tab(tab === 'players')}>Players</button>
            )}
          </div>
        )}

        {/* PLAYERS TAB */}
        {tab === 'players' && !selectedPlayer && (
          <div>
            <div style={S.section}>Players ({allPlayerData.length})</div>
            {allPlayerData.length === 0 && <div style={S.empty}>No players with sessions</div>}
            {allPlayerData.map(({ profile: p, real, train, totalHands }) => (
              <PlayerCard key={p.id} profile={p} realCount={real.length} trainCount={train.length} totalHands={totalHands}
                onSelect={(prof) => { setSelectedPlayer(prof); setTab('real'); }} />
            ))}
          </div>
        )}

        {/* REAL GAMES TAB */}
        {(tab === 'real' || selectedPlayer) && (
          <div>
            {viewReal.length > 0 && <div style={S.section}>Real Money Sessions</div>}
            {viewReal.length === 0 && tab === 'real' && !selectedPlayer && (
              <div style={S.empty}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>♠</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#5a6a7a' }}>No real games yet</div>
                <div style={{ fontSize: '12px', color: '#3a4a5a', marginTop: '4px' }}>Upload GGPoker / PokerStars .txt files</div>
                <button onClick={handleUpload} style={{ marginTop: '16px', padding: '12px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a3a18,#27ae60)', color: '#fff', fontWeight: 800, fontSize: '14px' }}>
                  Upload Hand History
                </button>
              </div>
            )}
            {[...viewReal].reverse().map((sess, i) => (
              <RealSessionCard key={sess.id || i} sess={sess} />
            ))}

            {/* Training sessions below real ones (if viewing a player) */}
            {selectedPlayer && viewTrain.length > 0 && (
              <>
                <div style={S.section}>Training Sessions</div>
                {[...viewTrain].reverse().map((sess, i) => (
                  <TrainingSessionCard key={sess.sessionId || i} sess={sess} idx={i} total={viewTrain.length} />
                ))}
              </>
            )}
          </div>
        )}

        {/* TRAINING TAB */}
        {tab === 'train' && !selectedPlayer && (
          <div>
            <div style={S.section}>Training Sessions</div>
            {viewTrain.length === 0 && (
              <div style={S.empty}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>♛</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#5a6a7a' }}>No training sessions</div>
                <div style={{ fontSize: '12px', color: '#3a4a5a', marginTop: '4px' }}>Play a tournament to see history here</div>
              </div>
            )}
            {[...viewTrain].reverse().map((sess, i) => (
              <TrainingSessionCard key={sess.sessionId || i} sess={sess} idx={i} total={viewTrain.length} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
