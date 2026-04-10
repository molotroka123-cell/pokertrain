// learningPath.js — Leak detection, priority, personalized drill plans, progress tracking

const LEAK_PATTERNS = {
  fear_of_aggression: {
    desc: 'Folds too often when facing bets/raises',
    detect: (decs) => {
      const facing = decs.filter(d => d.toCall > 0 && d.toCall > (d.blinds?.bb || 100) * 3);
      const folded = facing.filter(d => d.action === 'fold');
      return facing.length > 10 && folded.length / facing.length > 0.65;
    },
    drills: ['ThreeBet', 'BBDefense'],
    tip: 'Expand your calling/3-bet range. You fold too much to aggression.',
  },
  overvalue_top_pair: {
    desc: 'Stacks off with top pair in big pots',
    detect: (decs) => {
      const bigLoss = decs.filter(d => d.handResult === 'lost' && d.potSize > (d.blinds?.bb || 100) * 30);
      return bigLoss.length >= 3;
    },
    drills: ['Postflop', 'Sizing'],
    tip: 'Top pair is not the nuts. Pot control in big pots.',
  },
  river_give_up: {
    desc: 'Checks river too often — misses value bets and bluffs',
    detect: (decs) => {
      const river = decs.filter(d => d.stage === 'river' && d.toCall === 0);
      const checked = river.filter(d => d.action === 'check');
      return river.length > 5 && checked.length / river.length > 0.80;
    },
    drills: ['Postflop', 'Sizing'],
    tip: 'River is where the money is. Bet value hands, bluff missed draws.',
  },
  positional_blindspot: {
    desc: 'Plays the same range regardless of position',
    detect: (decs) => {
      const pf = decs.filter(d => d.stage === 'preflop');
      const byPos = {};
      for (const d of pf) {
        if (!byPos[d.position]) byPos[d.position] = { total: 0, vpip: 0 };
        byPos[d.position].total++;
        if (d.action !== 'fold') byPos[d.position].vpip++;
      }
      const utg = byPos['UTG']?.total > 5 ? byPos['UTG'].vpip / byPos['UTG'].total : null;
      const btn = byPos['BTN']?.total > 5 ? byPos['BTN'].vpip / byPos['BTN'].total : null;
      return utg !== null && btn !== null && Math.abs(utg - btn) < 0.08;
    },
    drills: ['RFI'],
    tip: 'BTN should be 2-3x wider than UTG. Adapt to position.',
  },
  bubble_leak: {
    desc: 'Makes ICM mistakes near the money',
    detect: (decs) => {
      const bubble = decs.filter(d => d.isBubble);
      if (bubble.length < 5) return false;
      const mistakes = bubble.filter(d => d.mistakeType?.includes('icm'));
      return mistakes.length / bubble.length > 0.3;
    },
    drills: ['PushFold'],
    tip: 'Every bubble decision costs real money. Study ICM.',
  },
  bluff_timing: {
    desc: 'Bluffs in bad spots — against calling stations or without fold equity',
    detect: (decs) => {
      const bluffs = decs.filter(d => d.action === 'raise' && d.equity < 0.30 && d.stage !== 'preflop');
      const failed = bluffs.filter(d => d.handResult === 'lost');
      return bluffs.length > 5 && failed.length / bluffs.length > 0.70;
    },
    drills: ['Postflop'],
    tip: 'Bluff against folders, not callers. Pick better spots.',
  },
};

const DRILL_PLANS = {
  bad_fold: {
    name: 'Stop Folding Winners',
    steps: [
      { drill: 'PotOdds', count: 25, desc: 'Master pot odds calculation' },
      { drill: 'RFI', focus: 'BTN+CO', count: 20, desc: 'Open wider in late position' },
    ],
    time: '20 min',
  },
  too_passive: {
    name: 'Aggression Training',
    steps: [
      { drill: 'Sizing', count: 20, desc: 'Practice value bet sizing' },
      { drill: 'Postflop', focus: 'raise_spots', count: 15, desc: 'Find spots to raise' },
    ],
    time: '25 min',
  },
  bad_call: {
    name: 'Calling Discipline',
    steps: [
      { drill: 'PotOdds', count: 25, desc: 'When to fold based on odds' },
      { drill: 'Postflop', focus: 'fold_spots', count: 15, desc: 'Practice folding marginals' },
    ],
    time: '25 min',
  },
  icm_error: {
    name: 'ICM Mastery',
    steps: [
      { drill: 'PushFold', focus: 'bubble', count: 20, desc: 'Bubble push/fold' },
      { drill: 'Postflop', focus: 'icm', count: 10, desc: 'ICM scenarios' },
    ],
    time: '20 min',
  },
  push_fold_error: {
    name: 'Short Stack Mastery',
    steps: [{ drill: 'PushFold', count: 40, desc: 'Nash push/fold charts' }],
    time: '15 min',
  },
};

export function analyzeLeaks(allDecisions) {
  const leaks = [];

  // Group by mistake type
  const byType = {};
  for (const d of allDecisions) {
    if (!d.mistakeType) continue;
    if (!byType[d.mistakeType]) byType[d.mistakeType] = [];
    byType[d.mistakeType].push(d);
  }

  for (const [type, mistakes] of Object.entries(byType)) {
    const totalEV = mistakes.reduce((a, m) => a + (m.evLost || 0), 0);
    const frequency = mistakes.length / Math.max(allDecisions.length, 1);

    // Priority formula (per MASTER spec): freq × EV × confidence × spotWeight × (1.2 - fixDifficulty)
    const avgConfidence = 0.7;
    const fixDifficulty = { bad_fold: 0.3, push_fold_error: 0.3, bad_call: 0.5, too_passive: 0.6, icm_error: 0.7 }[type] || 0.5;

    const priority = frequency * totalEV * avgConfidence * (1.2 - fixDifficulty);

    leaks.push({
      type, count: mistakes.length, totalEVLost: totalEV,
      avgEVLost: totalEV / mistakes.length, frequency, priority,
      drillPlan: DRILL_PLANS[type] || DRILL_PLANS.too_passive,
      projectedSaving: Math.round(totalEV * 0.6 / Math.max(allDecisions.length, 1) * 100),
    });
  }

  leaks.sort((a, b) => b.priority - a.priority);

  // Detect behavioral patterns
  const patterns = [];
  for (const [key, pattern] of Object.entries(LEAK_PATTERNS)) {
    if (pattern.detect(allDecisions)) {
      patterns.push({ id: key, ...pattern, severity: 'high' });
    }
  }

  return { leaks, patterns };
}

export function getPersonalizedPlan(leaks) {
  if (leaks.length === 0) return null;
  const top = leaks[0];
  return {
    focus: top.type,
    plan: top.drillPlan,
    saving: `Fixing "${top.type.replace(/_/g, ' ')}" saves ~${top.projectedSaving} chips per 100 hands`,
  };
}
