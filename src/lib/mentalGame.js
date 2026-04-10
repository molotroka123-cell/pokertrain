// mentalGame.js — Decision timer, focus score, tilt detection, pre-session checklist

export const PRE_SESSION_CHECKLIST = [
  { id: 'sleep', q: 'Well rested? (7+ hours)', weight: 3 },
  { id: 'food', q: 'Ate properly?', weight: 2 },
  { id: 'mood', q: 'Mood is good?', weight: 3 },
  { id: 'tilt', q: 'No residual tilt?', weight: 4 },
  { id: 'focus', q: 'Can focus 2+ hours?', weight: 3 },
  { id: 'alcohol', q: 'Sober?', weight: 5 },
  { id: 'goal', q: 'Have a session goal?', weight: 2 },
];

export const SESSION_GOALS = [
  { id: 'no_limp', text: 'No limping', check: (d) => !d.some(x => x.action === 'limp') },
  { id: '3bet_7', text: '3-bet at least 7% of hands', check: null },
  { id: 'cbet_dry', text: 'C-bet 80%+ on dry boards', check: null },
  { id: 'no_tilt_call', text: 'No snap calls (< 1s)', check: (d) => !d.some(x => x.action === 'call' && x.decisionTimeMs < 1000 && x.decisionTimeMs > 0) },
  { id: 'position_aware', text: 'UTG VPIP under 15%', check: null },
  { id: 'value_river', text: 'Value bet rivers with strong hands', check: null },
];

export const STOP_LOSS = {
  maxTournamentsPerDay: 5,
  maxConsecutiveBusts: 3,
  minTimeBetween: 5, // minutes
};

export function evaluateReadiness(answers) {
  let score = 0, maxScore = 0;
  for (const item of PRE_SESSION_CHECKLIST) {
    maxScore += item.weight;
    if (answers[item.id]) score += item.weight;
  }
  const pct = score / maxScore;
  if (pct >= 0.85) return { status: 'green', msg: 'You\'re in great shape. Let\'s play.', canPlay: true };
  if (pct >= 0.60) return { status: 'yellow', msg: 'Not ideal. Consider drills instead of tournament.', canPlay: true };
  return { status: 'red', msg: 'Better to rest or do light drills today.', canPlay: false };
}

export class MentalPressure {
  constructor() {
    this.decisionTimes = [];
    this.focusScore = 1.0;
    this.stressLevel = 0;
    this.consecutiveLosses = 0;
    this.sessionStart = Date.now();
    this.pendingAlerts = [];
  }

  getTimeLimit(gs) {
    if (gs?.isAllInDecision) return 60;
    if (gs?.isBubble) return 25;
    if (gs?.isFinalTable) return 45;
    return 30;
  }

  onTimeExpired(gs) {
    if (gs?.toCall === 0) return { action: 'check', reason: 'Time expired — auto-check' };
    return { action: 'fold', reason: 'Time expired — auto-fold' };
  }

  recordDecisionTime(timeMs) {
    this.decisionTimes.push(timeMs);
    if (this.decisionTimes.length > 30) this.decisionTimes.shift();
  }

  isRushing() {
    if (this.decisionTimes.length < 5) return false;
    const avg = this.decisionTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    return avg < 2000;
  }

  isOverthinking() {
    if (this.decisionTimes.length < 5) return false;
    const avg = this.decisionTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    return avg > 25000;
  }

  updateFocus(decision) {
    const sessionMin = (Date.now() - this.sessionStart) / 60000;
    const fatigue = Math.min(0.3, sessionMin / 600);

    if (decision?.handResult === 'lost' && decision?.potSize > (decision?.bigBlind || 100) * 20) {
      this.consecutiveLosses++;
    } else if (decision?.handResult === 'won') {
      this.consecutiveLosses = Math.max(0, this.consecutiveLosses - 1);
    }

    const tiltPenalty = Math.min(0.3, this.consecutiveLosses * 0.08);
    const rushPenalty = this.isRushing() ? 0.15 : 0;

    this.focusScore = Math.max(0.2, 1.0 - fatigue - tiltPenalty - rushPenalty);
    this.stressLevel = Math.min(1.0, tiltPenalty + rushPenalty + (decision?.isBubble ? 0.2 : 0));

    // Queue alerts (shown BETWEEN hands, not during)
    const alert = this._getAlert(sessionMin);
    if (alert) this.pendingAlerts.push(alert);

    return this.focusScore;
  }

  flushAlerts() {
    const alerts = [...this.pendingAlerts];
    this.pendingAlerts = [];
    return alerts;
  }

  _getAlert(sessionMin) {
    if (this.isRushing()) return { type: 'warning', icon: '⚡', msg: 'You\'re deciding too fast. Slow down — think about villain\'s range.', color: '#f97316' };
    if (this.focusScore < 0.5) return { type: 'danger', icon: '🧠', msg: 'Focus dropping. Consider a break or switch to drills.', color: '#e53e3e' };
    if (this.consecutiveLosses >= 3) return { type: 'tilt', icon: '🔥', msg: '3 losses in a row. Deep breath. Next decision — logic, not emotion.', color: '#e53e3e' };
    if (sessionMin > 90) return { type: 'fatigue', icon: '😴', msg: '90+ minutes without a break. Pros take breaks every hour.', color: '#a78bfa' };
    return null;
  }

  static breathingExercise() {
    return {
      title: 'Box Breathing (4-4-4-4)',
      steps: [
        { phase: 'Inhale', seconds: 4, instruction: 'Slow deep breath through nose' },
        { phase: 'Hold', seconds: 4, instruction: 'Hold your breath' },
        { phase: 'Exhale', seconds: 4, instruction: 'Slow exhale through mouth' },
        { phase: 'Pause', seconds: 4, instruction: 'Wait before next breath' },
      ],
      rounds: 4,
      totalTime: '64 seconds',
      note: 'Used by Navy SEALs and pro poker players to reset tilt.',
    };
  }
}
