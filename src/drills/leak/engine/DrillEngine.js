// DrillEngine.js — Leak drill state machine
// States: 'presenting' | 'showing_feedback' | 'complete'

const STREETS = ['preflop', 'flop', 'turn', 'river'];

export class DrillEngine {
  constructor(scenarios) {
    this.scenarios = scenarios;
    this.currentIdx = 0;
    this.currentDecisionIdx = 0;
    this.state = 'presenting';
    this.userAnswers = [];
    this.listeners = new Set();
  }

  get currentScenario() {
    return this.scenarios[this.currentIdx];
  }

  get currentDecision() {
    const scen = this.currentScenario;
    if (!scen) return null;
    return scen.decisions[this.currentDecisionIdx] || null;
  }

  get currentStreet() {
    return this.currentDecision?.street || 'preflop';
  }

  // Cards to show based on the current decision's street
  get visibleBoard() {
    const scen = this.currentScenario;
    if (!scen?.board) return { flop: null, turn: null, river: null };
    const street = this.currentStreet;
    const streetIdx = STREETS.indexOf(street);
    return {
      flop: streetIdx >= 1 ? scen.board.flop || null : null,
      turn: streetIdx >= 2 ? scen.board.turn || null : null,
      river: streetIdx >= 3 ? scen.board.river || null : null,
    };
  }

  submitAction(action) {
    const decision = this.currentDecision;
    if (!decision || this.state !== 'presenting') return;

    const evaluation = this.evaluate(action, decision);

    if (!this.userAnswers[this.currentIdx]) {
      this.userAnswers[this.currentIdx] = {};
    }
    this.userAnswers[this.currentIdx][decision.id] = {
      action,
      evaluation,
      timestamp: Date.now(),
    };

    this.state = 'showing_feedback';
    this.notify();
  }

  evaluate(action, decision) {
    const gtoActions = decision.gto || {};
    const actionType = action.type;
    const gtoFreq = gtoActions[actionType] || 0;

    const entries = Object.entries(gtoActions);
    const primary = entries.length
      ? entries.reduce((a, b) => (a[1] > b[1] ? a : b))
      : ['fold', 0];

    let rating;
    if (gtoFreq >= 0.4 || actionType === primary[0]) rating = 'perfect';
    else if (gtoFreq >= 0.15) rating = 'acceptable';
    else rating = 'mistake';

    if (action.sizing && decision.gtoSizing) {
      const sizingError = Math.abs(action.sizing - decision.gtoSizing) / decision.gtoSizing;
      if (sizingError > 0.3) rating = 'mistake';
      else if (sizingError > 0.15 && rating === 'perfect') rating = 'acceptable';
    }

    return {
      rating,
      gtoFrequency: gtoFreq,
      gtoPrimary: primary[0],
      gtoAll: gtoActions,
      gtoSizing: decision.gtoSizing || null,
      explanation:
        decision.explanation?.[actionType] ||
        decision.explanation?.default ||
        '',
    };
  }

  // Advance to next decision or scenario
  advance() {
    const scen = this.currentScenario;
    if (!scen) return;
    if (this.currentDecisionIdx < scen.decisions.length - 1) {
      this.currentDecisionIdx++;
      this.state = 'presenting';
    } else if (this.currentIdx < this.scenarios.length - 1) {
      this.currentIdx++;
      this.currentDecisionIdx = 0;
      this.state = 'presenting';
    } else {
      this.state = 'complete';
    }
    this.notify();
  }

  getStats() {
    const ratings = { perfect: 0, acceptable: 0, mistake: 0 };
    let total = 0;
    this.userAnswers.forEach(scenAnswers => {
      Object.values(scenAnswers || {}).forEach(a => {
        ratings[a.evaluation.rating]++;
        total++;
      });
    });
    return {
      total,
      ...ratings,
      accuracy: total > 0 ? (ratings.perfect + ratings.acceptable * 0.5) / total : 0,
      scenarioCount: this.scenarios.length,
    };
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }
}
