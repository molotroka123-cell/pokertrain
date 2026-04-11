// achievements.js — Badge/achievement system
// Persists in localStorage, checks after each session

const ACHIEVEMENTS = [
  { id: 'first_tournament', name: 'First Steps', desc: 'Complete your first tournament', icon: '🎯', check: (s) => s.totalTournaments >= 1 },
  { id: 'five_tournaments', name: 'Regular', desc: 'Play 5 tournaments', icon: '🃏', check: (s) => s.totalTournaments >= 5 },
  { id: 'twenty_tournaments', name: 'Grinder', desc: 'Play 20 tournaments', icon: '💪', check: (s) => s.totalTournaments >= 20 },
  { id: 'hundred_hands', name: 'Centurion', desc: 'Play 100 hands', icon: '💯', check: (s) => s.totalHands >= 100 },
  { id: 'thousand_hands', name: 'Veteran', desc: 'Play 1000 hands', icon: '🎖', check: (s) => s.totalHands >= 1000 },
  { id: 'first_win', name: 'Champion', desc: 'Win a tournament (1st place)', icon: '🏆', check: (s) => s.bestFinish === 1 },
  { id: 'final_table', name: 'Final Table', desc: 'Reach the final table', icon: '⭐', check: (s) => s.finalTables >= 1 },
  { id: 'itm', name: 'In The Money', desc: 'Finish in the money', icon: '💰', check: (s) => s.itmCount >= 1 },
  { id: 'clean_session', name: 'Perfect Play', desc: 'Complete a session with 0 mistakes', icon: '✨', check: (s) => s.cleanSessions >= 1 },
  { id: 'deep_run', name: 'Deep Run', desc: 'Finish in top 5%', icon: '🚀', check: (s) => s.deepRuns >= 1 },
  { id: 'shark', name: 'Shark', desc: 'VPIP 20-30% and PFR 15-25% in a session', icon: '🦈', check: (s) => s.sharkSessions >= 1 },
  { id: 'no_tilt', name: 'Ice Cold', desc: 'No tilt detected across 5 sessions', icon: '🧊', check: (s) => s.noTiltStreak >= 5 },
];

export function checkAchievements(sessions) {
  const stats = computeAllTimeStats(sessions);
  const unlocked = JSON.parse(localStorage.getItem('pokertrain_achievements') || '[]');
  const unlockedSet = new Set(unlocked);
  const newUnlocks = [];

  for (const ach of ACHIEVEMENTS) {
    if (!unlockedSet.has(ach.id) && ach.check(stats)) {
      newUnlocks.push(ach);
      unlockedSet.add(ach.id);
    }
  }

  if (newUnlocks.length > 0) {
    localStorage.setItem('pokertrain_achievements', JSON.stringify([...unlockedSet]));
  }

  return { unlocked: [...unlockedSet], newUnlocks, all: ACHIEVEMENTS };
}

export function getAchievements() {
  const unlocked = new Set(JSON.parse(localStorage.getItem('pokertrain_achievements') || '[]'));
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: unlocked.has(a.id) }));
}

function computeAllTimeStats(sessions) {
  let totalHands = 0, cleanSessions = 0, finalTables = 0, itmCount = 0;
  let deepRuns = 0, sharkSessions = 0, noTiltStreak = 0, bestFinish = Infinity;

  for (const s of sessions) {
    totalHands += s.summary?.handsPlayed || s.records?.length || 0;
    const mistakes = s.summary?.totalMistakes ?? s.records?.filter(r => r.mistakeType)?.length ?? 0;
    if (mistakes === 0 && totalHands > 10) cleanSessions++;

    // Check finish position (from records)
    const recs = s.records || [];
    const lastRec = recs[recs.length - 1];
    if (lastRec?.playersRemaining && lastRec?.totalPlayers) {
      const finish = lastRec.playersRemaining;
      bestFinish = Math.min(bestFinish, finish);
      const paidPlaces = Math.ceil(lastRec.totalPlayers * 0.15);
      if (finish <= paidPlaces) itmCount++;
      if (finish <= 9) finalTables++;
      if (finish <= Math.ceil(lastRec.totalPlayers * 0.05)) deepRuns++;
    }

    // Shark check
    const vpip = s.summary?.vpip;
    const pfr = s.summary?.pfr;
    if (vpip >= 20 && vpip <= 30 && pfr >= 15 && pfr <= 25) sharkSessions++;
  }

  return {
    totalTournaments: sessions.length,
    totalHands,
    bestFinish: bestFinish === Infinity ? null : bestFinish,
    finalTables,
    itmCount,
    cleanSessions,
    deepRuns,
    sharkSessions,
    noTiltStreak,
  };
}

// Bankroll tracking
export function getBankroll() {
  return JSON.parse(localStorage.getItem('pokertrain_bankroll') || '{"balance":10000,"history":[],"peak":10000}');
}

export function updateBankroll(buyIn, prize) {
  const br = getBankroll();
  br.balance = br.balance - buyIn + prize;
  br.peak = Math.max(br.peak, br.balance);
  br.history.push({ date: Date.now(), balance: br.balance, buyIn, prize });
  if (br.history.length > 200) br.history = br.history.slice(-200);
  localStorage.setItem('pokertrain_bankroll', JSON.stringify(br));
  return br;
}

// Leaderboard (all-time results)
export function getLeaderboard(sessions) {
  let totalPrize = 0, totalBuyIn = 0, wins = 0;
  const results = [];

  for (const s of sessions) {
    const recs = s.records || [];
    const lastRec = recs[recs.length - 1];
    if (!lastRec) continue;
    const format = lastRec.tournamentFormat;
    const buyIn = { WSOP_Main: 10000, WSOP_Daily: 1500, EPT_Main: 5300, WPT_500: 500, HARDCORE: 50000, GTD_100K: 500 }[format] || 1000;
    totalBuyIn += buyIn;
    // Estimate prize from finish position (simplified)
    const finish = lastRec.playersRemaining || 999;
    const total = lastRec.totalPlayers || 500;
    const pool = total * buyIn;
    let prize = 0;
    if (finish === 1) { prize = pool * 0.22; wins++; }
    else if (finish === 2) prize = pool * 0.14;
    else if (finish === 3) prize = pool * 0.10;
    else if (finish <= 5) prize = pool * 0.05;
    else if (finish <= Math.ceil(total * 0.15)) prize = pool * 0.015;
    totalPrize += prize;
    results.push({ date: s.exportDate || new Date().toISOString(), format, finish, total, prize: Math.round(prize), buyIn });
  }

  return {
    totalTournaments: sessions.length,
    totalPrize: Math.round(totalPrize),
    totalBuyIn,
    roi: totalBuyIn > 0 ? Math.round((totalPrize - totalBuyIn) / totalBuyIn * 100) : 0,
    wins,
    itm: results.filter(r => r.prize > 0).length,
    itmPct: results.length > 0 ? Math.round(results.filter(r => r.prize > 0).length / results.length * 100) : 0,
    avgFinish: results.length > 0 ? Math.round(results.reduce((a, r) => a + r.finish, 0) / results.length) : 0,
    bestFinish: results.length > 0 ? Math.min(...results.map(r => r.finish)) : null,
    results: results.slice(-20).reverse(),
    // Skill rating
    skillRating: (() => {
      if (sessions.length === 0) return 1000;
      const last = sessions[sessions.length - 1];
      const sm = last.summary || {};
      const hands = sm.handsPlayed || 1;
      const mistakeRate = (sm.totalMistakes || 0) / hands;
      const vpipDev = Math.abs((sm.vpip || 25) - 25) / 25;
      return Math.max(0, Math.round(1000 + (1 - mistakeRate) * 400 - vpipDev * 200));
    })(),
  };
}
