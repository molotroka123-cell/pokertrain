// leaderboardAPI.js — Client-side leaderboard service
// Connects to /api/leaderboard Edge Function

const API_URL = '/api/leaderboard';

function getPlayerId() {
  let id = localStorage.getItem('pokertrain_player_id');
  if (!id) {
    id = 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('pokertrain_player_id', id);
  }
  return id;
}

export async function submitStats(stats) {
  try {
    const playerId = getPlayerId();
    let name = 'Hero'; try { const p = JSON.parse(localStorage.getItem('pokertrain_current_profile')); name = p?.name || 'Hero'; } catch {}
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, name, ...stats }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchLeaderboard(period = 'all', limit = 50) {
  try {
    const res = await fetch(`${API_URL}?period=${period}&limit=${limit}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export function computeHeroStats() {
  try {
    const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
    let totalHands = 0, totalMistakes = 0, totalBuyIn = 0, totalPrize = 0;
    let bestFinish = 999, totalVpip = 0, totalPfr = 0, pfHands = 0;

    for (const s of sessions) {
      const recs = s.records || [];
      const handNums = new Set(recs.map(r => r.handNumber));
      totalHands += handNums.size;
      const mistakeHands = new Set(recs.filter(r => r.mistakeType).map(r => r.handNumber));
      totalMistakes += mistakeHands.size;

      const pfMap = new Map();
      for (const r of recs) { if (r.stage === 'preflop' && !pfMap.has(r.handNumber)) pfMap.set(r.handNumber, r); }
      const pf = [...pfMap.values()];
      pfHands += pf.length;
      totalVpip += pf.filter(r => r.action !== 'fold' && r.action !== 'bb_walk').length;
      totalPfr += pf.filter(r => r.action === 'raise').length;

      totalBuyIn += s.buyIn || 0;
      totalPrize += s.prize || 0;
      const lastRec = recs[recs.length - 1];
      if (lastRec?.playersRemaining) bestFinish = Math.min(bestFinish, lastRec.playersRemaining);
    }

    return {
      gtoScore: totalHands > 0 ? Math.round((1 - totalMistakes / totalHands) * 100) : 50,
      hands: totalHands,
      sessions: sessions.length,
      bestFinish: bestFinish === 999 ? null : bestFinish,
      roi: totalBuyIn > 0 ? Math.round((totalPrize - totalBuyIn) / totalBuyIn * 100) : 0,
      vpip: pfHands > 0 ? Math.round(totalVpip / pfHands * 1000) / 10 : 25,
      pfr: pfHands > 0 ? Math.round(totalPfr / pfHands * 1000) / 10 : 18,
    };
  } catch { return { gtoScore: 50, hands: 0, sessions: 0, bestFinish: null, roi: 0, vpip: 25, pfr: 18 }; }
}

export async function submitCurrentStats() {
  const stats = computeHeroStats();
  if (stats.hands === 0) return null;
  return submitStats(stats);
}
