// dailyPlanGenerator.js — AI-based daily drill recommendation engine
// Matches leaks from last session → specific drills, with fatigue awareness

import { loadSessions } from '../recorder/ActionRecorder.js';

const DRILL_DB = {
  multiway:    { id: 'multiway', name: 'Multiway Postflop', duration: 20, difficulty: 'hard', xp: 100, tags: ['postflop', 'multiway', 'cbet'] },
  threebetpot: { id: 'threebetpot', name: '3-Bet Pot Lines', duration: 20, difficulty: 'hard', xp: 125, tags: ['postflop', '3bet', 'barrel'] },
  ahighcbet:   { id: 'ahighcbet', name: 'A-high Cbet', duration: 15, difficulty: 'medium', xp: 100, tags: ['postflop', 'cbet', 'ahigh'] },
  river:       { id: 'river', name: 'River Decisions', duration: 20, difficulty: 'medium', xp: 100, tags: ['postflop', 'river', 'bluffcatch'] },
  rfi:         { id: 'rfi', name: 'RFI Drill', duration: 15, difficulty: 'easy', xp: 75, tags: ['preflop', 'open'] },
  '3bet':      { id: '3bet', name: '3-Bet Drill', duration: 15, difficulty: 'medium', xp: 75, tags: ['preflop', '3bet'] },
  bbdef:       { id: 'bbdef', name: 'BB Defense', duration: 15, difficulty: 'easy', xp: 75, tags: ['preflop', 'defend'] },
  pushfold:    { id: 'pushfold', name: 'Push/Fold', duration: 15, difficulty: 'easy', xp: 75, tags: ['preflop', 'shortstacked'] },
  postflop:    { id: 'postflop', name: 'Postflop Spots', duration: 15, difficulty: 'medium', xp: 100, tags: ['postflop', 'general'] },
  sizing:      { id: 'sizing', name: 'Bet Sizing', duration: 15, difficulty: 'medium', xp: 100, tags: ['postflop', 'sizing'] },
  potodds:     { id: 'potodds', name: 'Pot Odds', duration: 10, difficulty: 'easy', xp: 75, tags: ['math', 'odds'] },
};

const LEAK_TO_DRILL = {
  'bad_fold':       ['bbdef', 'pushfold', 'river'],
  'bad_call':       ['river', 'potodds', 'multiway'],
  'too_passive':    ['threebetpot', 'ahighcbet', 'sizing'],
  'sb_flat_call':   ['3bet', 'rfi'],
  'draw_fold_error': ['potodds', 'river'],
  'icm_error':      ['pushfold'],
  'push_fold_error': ['pushfold', 'solverpf'],
  'offsuit_trash':  ['rfi'],
  'btn_too_tight':  ['rfi'],
  'bb_too_tight':   ['bbdef'],
  'sb_too_tight':   ['rfi', '3bet'],
  'postflop_bet_into_3bettor': ['threebetpot'],
  'river_overbet':  ['sizing', 'river'],
  'multiway_cbet':  ['multiway', 'ahighcbet'],
};

function getRecentLeaks() {
  try {
    const sessions = loadSessions();
    if (sessions.length === 0) return [];
    const recent = sessions.slice(-3);
    const leakCounts = {};
    for (const s of recent) {
      for (const r of (s.records || [])) {
        if (r.mistakeType) {
          leakCounts[r.mistakeType] = (leakCounts[r.mistakeType] || 0) + 1;
        }
      }
    }
    return Object.entries(leakCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  } catch { return []; }
}

function calculateFatigue() {
  try {
    const sessions = loadSessions();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let todayHands = 0, yesterdayHands = 0;
    for (const s of sessions) {
      const d = new Date(s.startTime || 0).toDateString();
      const hands = s.records?.length || 0;
      if (d === today) todayHands += hands;
      if (d === yesterday) yesterdayHands += hands;
    }
    if (todayHands > 200) return 0.9;
    if (todayHands + yesterdayHands > 300) return 0.7;
    if (yesterdayHands > 200) return 0.5;
    return 0.2;
  } catch { return 0.3; }
}

export function generateDailyPlan() {
  const leaks = getRecentLeaks();
  const fatigue = calculateFatigue();
  const plan = { drills: [], duration: 0, recommendation: '', focusAreas: [] };

  if (leaks.length === 0) {
    plan.drills = [DRILL_DB.rfi, DRILL_DB.bbdef, DRILL_DB.potodds];
    plan.duration = 40;
    plan.recommendation = 'No session data yet — start with fundamentals';
    plan.focusAreas = ['preflop', 'math'];
    return plan;
  }

  const added = new Set();
  for (const leak of leaks) {
    const drillIds = LEAK_TO_DRILL[leak.type] || ['postflop'];
    for (const did of drillIds) {
      if (added.has(did)) continue;
      const drill = DRILL_DB[did];
      if (!drill) continue;
      added.add(did);
      plan.drills.push({ ...drill, leakSource: leak.type, leakCount: leak.count });
      plan.duration += drill.duration;
      plan.focusAreas.push(...drill.tags);
      if (plan.drills.length >= 4) break;
    }
    if (plan.drills.length >= 4) break;
  }

  if (fatigue > 0.7) {
    plan.drills = plan.drills.slice(0, 1);
    plan.duration = plan.drills[0]?.duration || 15;
    plan.recommendation = 'Light session today — you played a lot recently. Focus on one weak spot.';
  } else if (fatigue > 0.4) {
    plan.drills = plan.drills.slice(0, 2);
    plan.duration = plan.drills.reduce((s, d) => s + d.duration, 0);
    plan.recommendation = 'Moderate session — fix your top 2 leaks, then rest.';
  } else {
    plan.recommendation = 'Full training — hit all weak spots. You\'re fresh!';
  }

  if (plan.duration > 60) {
    plan.drills = plan.drills.slice(0, 3);
    plan.duration = plan.drills.reduce((s, d) => s + d.duration, 0);
  }

  plan.focusAreas = [...new Set(plan.focusAreas)];
  return plan;
}

export function getDrillProgress() {
  try {
    return JSON.parse(localStorage.getItem('pokertrain_drill_progress') || '{}');
  } catch { return {}; }
}

export function saveDrillSession(drillId, result) {
  const progress = getDrillProgress();
  if (!progress[drillId]) {
    progress[drillId] = { sessions: 0, bestPct: 0, totalCorrect: 0, totalHands: 0, xpEarned: 0, lastPlayed: 0, history: [] };
  }
  const p = progress[drillId];
  const pct = result.total > 0 ? Math.round(result.correct / result.total * 100) : 0;
  p.sessions++;
  p.bestPct = Math.max(p.bestPct, pct);
  p.totalCorrect += result.correct;
  p.totalHands += result.total;
  p.xpEarned += result.xp || 0;
  p.lastPlayed = Date.now();
  p.history.push({ date: Date.now(), pct, hands: result.total, evLoss: result.avgEvLoss || 0 });
  if (p.history.length > 30) p.history = p.history.slice(-30);
  progress[drillId] = p;
  localStorage.setItem('pokertrain_drill_progress', JSON.stringify(progress));

  let totalXP = parseInt(localStorage.getItem('pokertrain_total_xp') || '0', 10);
  totalXP += result.xp || 0;
  localStorage.setItem('pokertrain_total_xp', String(totalXP));

  return { pct, bestPct: p.bestPct, sessions: p.sessions, totalXP };
}
