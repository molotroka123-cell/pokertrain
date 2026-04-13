// GameHistory.jsx — Full game history dashboard with session details & player list
// Admin can see all players' sessions; regular users see only their own
import React, { useState, useMemo } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';

const S = {
  page: { minHeight: '100vh', background: '#060810', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" },
  container: { maxWidth: '540px', margin: '0 auto', padding: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 900, color: '#ffd700' },
  backBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #1a2230', cursor: 'pointer', background: '#0d1118', color: '#6b7b8d', fontWeight: 700, fontSize: '12px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '16px' },
  tab: (active) => ({
    flex: 1, padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    background: active ? 'linear-gradient(135deg, #1a2a4a, #1a3a5c)' : '#0d1118',
    color: active ? '#ffd700' : '#4a5a6a', fontWeight: 700, fontSize: '12px',
    transition: 'all 0.2s',
  }),
  card: { background: '#0d1118', borderRadius: '14px', padding: '14px', marginBottom: '10px', border: '1px solid #1a2230', cursor: 'pointer', transition: 'border-color 0.2s' },
  statRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
  stat: { flex: 1, textAlign: 'center', padding: '12px 8px', background: '#080c14', borderRadius: '10px', border: '1px solid #141a22' },
  statVal: (c) => ({ fontSize: '22px', fontWeight: 900, color: c }),
  statLabel: { fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },
  empty: { textAlign: 'center', padding: '50px 20px', color: '#3a4a5a' },
  badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: bg, color: fg, marginLeft: '6px' }),
  handRow: (won) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
    background: won === 'won' ? '#0a1a10' : won === 'lost' ? '#1a0a0a' : '#0a0d12',
    border: `1px solid ${won === 'won' ? '#1a3a2a' : won === 'lost' ? '#3a1a1a' : '#141a22'}`,
    fontSize: '12px',
  }),
  section: { fontSize: '13px', fontWeight: 700, color: '#e8d48b', marginBottom: '8px', marginTop: '14px' },
};

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const day = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

function fmtChips(n) {
  if (!n && n !== 0) return '0';
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// Extract hand summaries from session records
function getHandSummaries(sess) {
  if (sess.handSummaries && sess.handSummaries.length > 0) return sess.handSummaries;
  // Fallback: build from records
  const recs = sess.records || [];
  const byHand = new Map();
  for (const r of recs) {
    if (!byHand.has(r.handNumber)) byHand.set(r.handNumber, []);
    byHand.get(r.handNumber).push(r);
  }
  return [...byHand.entries()].map(([num, records]) => {
    const first = records[0];
    const last = records[records.length - 1];
    return {
      hand: num,
      position: first.position || '?',
      holeCards: first.holeCards || '',
      actions: records.map(r => ({ stage: r.stage, action: r.action })),
      chipsBefore: first.myChips || first.chipsBeforeHand || 0,
      chipsAfter: last.chipsAfter || last.myChips || 0,
      netProfit: (last.chipsAfter || 0) - (first.myChips || first.chipsBeforeHand || 0),
      result: last.handResult || (last.action === 'fold' ? 'folded' : null),
      mistake: records.find(r => r.mistakeType)?.mistakeType || null,
      mistakeSeverity: records.find(r => r.mistakeType)?.mistakeSeverity || null,
      evLost: records.find(r => r.evLost)?.evLost || 0,
      equity: first.equity,
      potSize: last.potSize || 0,
    };
  });
}

function SessionCard({ sess, idx, total }) {
  const [expanded, setExpanded] = useState(false);
  const sm = sess.summary || {};
  const ts = sess.records?.[0]?.timestamp || 0;
  const format = sess.records?.[0]?.tournamentFormat || 'Unknown';
  const hands = getHandSummaries(sess);
  const mistakes = sm.totalMistakes || 0;
  const critical = sm.criticalMistakes || 0;

  return (
    <div style={{ ...S.card, borderColor: expanded ? '#2a4a6a' : '#1a2230' }} onClick={() => setExpanded(!expanded)}>
      {/* Session header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#c0d0e0' }}>
            #{total - idx} — {format.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '11px', color: '#4a5a6a', marginTop: '2px' }}>
            {fmtDate(ts)} | {sm.handsPlayed || sess.totalHands || 0} hands
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {sm.vpip != null && <span style={S.badge('#0a1a3a', '#3a8aba')}>VP {sm.vpip}%</span>}
            {sm.pfr != null && <span style={S.badge('#0a2a1a', '#2a8a4a')}>PF {sm.pfr}%</span>}
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 700, color: mistakes > 3 ? '#e74c3c' : mistakes > 0 ? '#f39c12' : '#27ae60' }}>
            {mistakes === 0 ? 'Clean game' : `${mistakes} mistake${mistakes > 1 ? 's' : ''}`}
            {critical > 0 && <span style={{ color: '#e74c3c' }}> ({critical} crit)</span>}
          </div>
        </div>
      </div>

      {/* Expanded: hand-by-hand breakdown */}
      {expanded && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #141a22', paddingTop: '10px' }} onClick={e => e.stopPropagation()}>
          {sm.estimatedEVLost > 0 && (
            <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '8px' }}>
              EV Lost: {fmtChips(sm.estimatedEVLost)} chips
            </div>
          )}

          <div style={S.section}>Hands ({hands.length})</div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {hands.map((h, i) => (
              <div key={i} style={S.handRow(h.result)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '11px', minWidth: '28px' }}>{h.position}</span>
                  <span style={{ color: '#c0d0e0', fontWeight: 600, minWidth: '46px' }}>{h.holeCards || '—'}</span>
                  <span style={{ color: '#5a6a7a', fontSize: '10px' }}>
                    {h.actions?.map(a => a.action?.[0]?.toUpperCase()).join('')}
                  </span>
                  {h.mistake && (
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: '4px',
                      background: h.mistakeSeverity === 'critical' ? '#3a0a0a' : '#2a1a0a',
                      color: h.mistakeSeverity === 'critical' ? '#ff4a4a' : '#f39c12',
                      fontWeight: 700,
                    }}>{h.mistake.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div style={{
                  fontWeight: 700, fontSize: '12px', minWidth: '55px', textAlign: 'right',
                  color: h.result === 'won' ? '#27ae60' : h.result === 'lost' ? '#e74c3c' : '#3a4a5a',
                }}>
                  {h.result === 'won' && h.netProfit > 0 ? `+${fmtChips(h.netProfit)}` :
                   h.result === 'lost' && h.netProfit < 0 ? fmtChips(h.netProfit) :
                   h.result === 'folded' ? '—' : h.result || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ profile, sessions, isAdmin, onSelect }) {
  const totalHands = sessions.reduce((a, s) => a + (s.totalHands || s.summary?.handsPlayed || 0), 0);
  const totalMistakes = sessions.reduce((a, s) => a + (s.summary?.totalMistakes || 0), 0);
  const avgMistakes = sessions.length > 0 ? (totalMistakes / sessions.length).toFixed(1) : '0';

  return (
    <div style={{ ...S.card, cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && onSelect(profile)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(145deg, #1a2a40, #0a1520)',
            border: '2px solid #2a4060', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#4a6a8a',
          }}>♠</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#c0d0e0' }}>{profile.name}</div>
            <div style={{ fontSize: '10px', color: '#4a5a6a' }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} | {totalHands} hands
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: Number(avgMistakes) < 3 ? '#27ae60' : '#f39c12' }}>
            {avgMistakes} avg err
          </div>
          {isAdmin && <div style={{ fontSize: '10px', color: '#3a6a9a' }}>View details</div>}
        </div>
      </div>
    </div>
  );
}

export default function GameHistory({ onBack, currentProfile, allProfiles }) {
  const [tab, setTab] = useState('my');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Current user's sessions
  const mySessions = useMemo(() => loadSessions(), []);

  // Check if current user is admin (first profile or has isAdmin flag)
  const isAdmin = useMemo(() => {
    if (!currentProfile || !allProfiles || allProfiles.length === 0) return true; // single player = admin
    return currentProfile.id === allProfiles[0]?.id || currentProfile.isAdmin;
  }, [currentProfile, allProfiles]);

  // All players' sessions (admin only)
  const allPlayerData = useMemo(() => {
    if (!isAdmin || !allProfiles) return [];
    return allProfiles.map(p => {
      // Try to load sessions with player prefix
      const prefix = p.id + '_';
      let sessions = [];
      try {
        const raw = localStorage.getItem(prefix + 'wsop_sessions');
        if (raw) sessions = JSON.parse(raw);
      } catch {}
      // Also check un-prefixed sessions (default player)
      if (sessions.length === 0 && p.id === currentProfile?.id) {
        sessions = mySessions;
      }
      return { profile: p, sessions };
    }).filter(p => p.sessions.length > 0);
  }, [isAdmin, allProfiles, currentProfile, mySessions]);

  // Selected player's sessions (for admin drill-down)
  const viewSessions = selectedPlayer
    ? allPlayerData.find(p => p.profile.id === selectedPlayer.id)?.sessions || []
    : mySessions;

  // Aggregate stats
  const totalSessions = viewSessions.length;
  const totalHands = viewSessions.reduce((a, s) => a + (s.totalHands || s.summary?.handsPlayed || 0), 0);
  const totalMistakes = viewSessions.reduce((a, s) => a + (s.summary?.totalMistakes || 0), 0);
  const accuracy = totalHands > 0 ? ((1 - totalMistakes / Math.max(1, totalHands)) * 100).toFixed(1) : '0';

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.title}>
              {selectedPlayer ? selectedPlayer.name : 'Game History'}
            </div>
            {selectedPlayer && (
              <div onClick={() => setSelectedPlayer(null)}
                style={{ fontSize: '11px', color: '#3a6a9a', cursor: 'pointer', marginTop: '2px' }}>
                Back to players
              </div>
            )}
          </div>
          <button onClick={onBack} style={S.backBtn}>Back</button>
        </div>

        {/* Tabs */}
        {!selectedPlayer && (
          <div style={S.tabs}>
            <button onClick={() => setTab('my')} style={S.tab(tab === 'my')}>My Sessions</button>
            {isAdmin && allProfiles && allProfiles.length > 1 && (
              <button onClick={() => setTab('players')} style={S.tab(tab === 'players')}>All Players</button>
            )}
          </div>
        )}

        {/* Players tab (admin only) */}
        {tab === 'players' && !selectedPlayer && (
          <div>
            <div style={S.section}>Players ({allPlayerData.length})</div>
            {allPlayerData.length === 0 && (
              <div style={S.empty}>No players with sessions yet</div>
            )}
            {allPlayerData.map(({ profile: p, sessions: s }) => (
              <PlayerCard key={p.id} profile={p} sessions={s} isAdmin={isAdmin}
                onSelect={(prof) => { setSelectedPlayer(prof); setTab('my'); }} />
            ))}
          </div>
        )}

        {/* Sessions tab (or selected player's sessions) */}
        {(tab === 'my' || selectedPlayer) && (
          <div>
            {/* Aggregate stats */}
            {totalSessions > 0 && (
              <div style={S.statRow}>
                <div style={S.stat}>
                  <div style={S.statVal('#c0d0e0')}>{totalSessions}</div>
                  <div style={S.statLabel}>Sessions</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal('#c0d0e0')}>{totalHands}</div>
                  <div style={S.statLabel}>Hands</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal(Number(accuracy) > 85 ? '#27ae60' : '#f39c12')}>{accuracy}%</div>
                  <div style={S.statLabel}>Accuracy</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal(totalMistakes < totalSessions * 3 ? '#27ae60' : '#e74c3c')}>{totalMistakes}</div>
                  <div style={S.statLabel}>Errors</div>
                </div>
              </div>
            )}

            {/* Session list */}
            <div style={S.section}>Sessions</div>
            {viewSessions.length === 0 && (
              <div style={S.empty}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>♠</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#5a6a7a' }}>No sessions yet</div>
                <div style={{ fontSize: '12px', color: '#3a4a5a', marginTop: '4px' }}>Play a tournament to see your history here</div>
              </div>
            )}
            {[...viewSessions].reverse().map((sess, i) => (
              <SessionCard key={sess.sessionId || i} sess={sess} idx={i} total={viewSessions.length} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
