// adaptiveAI.js — Opponent modeling + exploitation
// Tier 2: Tracks hero actions, builds model, exploits leaks. 100% local, $0.

import { BaseAI } from './ai.js';
import { cryptoRandomFloat } from './deck.js';

export class AdaptiveAI extends BaseAI {
  constructor(profile) {
    super(profile);

    this.heroModel = {
      hands: 0,
      vpipHands: 0,
      pfrHands: 0,
      threeBetHands: 0,
      cbetCount: 0,
      cbetFoldCount: 0,
      foldToThreeBet: 0,
      facedThreeBet: 0,
      showdownWins: 0,
      showdowns: 0,
      totalFolds: 0,
      totalActions: 0,
      bluffsCaught: 0,
      riverBetsFaced: 0,
      riverFolds: 0,

      // Positional tracking
      byPosition: {},

      // Recent tendencies (ring buffer of last 20 actions)
      recentActions: [],
    };

    this.exploitLevel = 0;
    this.minHandsToExploit = 15;
  }

  // Computed stats
  get heroVpip() {
    return this.heroModel.hands > 0 ? this.heroModel.vpipHands / this.heroModel.hands : 0.25;
  }
  get heroPfr() {
    return this.heroModel.hands > 0 ? this.heroModel.pfrHands / this.heroModel.hands : 0.18;
  }
  get heroFoldToCbet() {
    return this.heroModel.cbetCount > 0 ? this.heroModel.cbetFoldCount / this.heroModel.cbetCount : 0.45;
  }
  get heroIsPassive() {
    return this.heroVpip - this.heroPfr > 0.12;
  }
  get heroIsAggressive() {
    return this.heroPfr > 0.25;
  }
  get heroIsTight() {
    return this.heroVpip < 0.18;
  }
  get heroIsLoose() {
    return this.heroVpip > 0.30;
  }
  get heroFoldsTooMuch() {
    return this.heroModel.totalActions > 20 && this.heroModel.totalFolds / this.heroModel.totalActions > 0.55;
  }
  get heroCallsTooMuch() {
    return this.heroIsPassive && this.heroVpip > 0.28;
  }
  get heroFoldsToRiverBets() {
    return this.heroModel.riverBetsFaced > 5 && this.heroModel.riverFolds / this.heroModel.riverBetsFaced > 0.60;
  }

  // Called after every hand to update model
  observeHeroAction(action, context) {
    const h = this.heroModel;
    h.hands++;
    h.totalActions++;
    h.recentActions.push({ action, context, ts: Date.now() });
    if (h.recentActions.length > 20) h.recentActions.shift();

    if (context.stage === 'preflop') {
      if (action === 'call' || action === 'raise') h.vpipHands++;
      if (action === 'raise') h.pfrHands++;
      if (context.facing3Bet) {
        h.facedThreeBet++;
        if (action === 'fold') h.foldToThreeBet++;
      }
    }

    if (action === 'fold') {
      h.totalFolds++;
      if (context.facingCbet) h.cbetFoldCount++;
      if (context.stage === 'river' && context.facingBet) h.riverFolds++;
    }

    if (context.facingCbet) h.cbetCount++;
    if (context.stage === 'river' && context.facingBet) h.riverBetsFaced++;

    // Track by position
    if (context.position) {
      if (!h.byPosition[context.position]) {
        h.byPosition[context.position] = { hands: 0, vpip: 0, pfr: 0, folds: 0 };
      }
      const pos = h.byPosition[context.position];
      pos.hands++;
      if (action === 'call' || action === 'raise') pos.vpip++;
      if (action === 'raise') pos.pfr++;
      if (action === 'fold') pos.folds++;
    }

    // Gradually increase exploit level
    if (h.hands > this.minHandsToExploit) {
      this.exploitLevel = Math.min(0.8, (h.hands - this.minHandsToExploit) / 100);
    }
  }

  observeShowdown(heroCards, heroWon) {
    this.heroModel.showdowns++;
    if (heroWon) this.heroModel.showdownWins++;
  }

  // Override base decide: blend base strategy with exploitation
  decide(gameState) {
    const baseDecision = super.decide(gameState);

    if (this.heroModel.hands < this.minHandsToExploit) {
      return baseDecision;
    }

    return this.exploit(baseDecision, gameState);
  }

  exploit(baseDec, gs) {
    const el = this.exploitLevel;
    const rand = cryptoRandomFloat();

    // EXPLOIT: Hero folds too much
    if (this.heroFoldsTooMuch) {
      // Bluff more: stab at pots when checked to
      if (gs.stage !== 'preflop' && baseDec.action === 'check') {
        if (rand < 0.35 * el) {
          return { action: 'raise', amount: Math.floor(gs.pot * 0.6) };
        }
      }
      // Steal blinds wider from late position
      if (gs.stage === 'preflop' && (gs.position === 'BTN' || gs.position === 'CO')) {
        if (baseDec.action === 'fold' && rand < 0.3 * el) {
          return { action: 'raise', amount: Math.floor(gs.bigBlind * 2.5) };
        }
      }
    }

    // EXPLOIT: Hero is passive (calls too much, rarely raises)
    if (this.heroIsPassive && this.heroCallsTooMuch) {
      // Don't bluff passive callers
      if (baseDec.action === 'raise' && gs.handStrength < 0.5) {
        if (rand < 0.5 * el) return { action: 'check' };
      }
      // Value bet bigger with strong hands
      if (baseDec.action === 'raise' && gs.handStrength > 0.7) {
        return { action: 'raise', amount: Math.floor(baseDec.amount * (1 + 0.3 * el)) };
      }
    }

    // EXPLOIT: Hero is hyper-aggressive
    if (this.heroIsAggressive && this.heroPfr > 0.28) {
      // Trap with monsters
      if (gs.stage === 'preflop' && gs.handStrength > 0.85 && rand < 0.4 * el) {
        return { action: 'call' };
      }
      // Call down lighter postflop
      if (baseDec.action === 'fold' && gs.handStrength > 0.35 && gs.stage !== 'preflop') {
        if (rand < 0.3 * el) return { action: 'call' };
      }
    }

    // EXPLOIT: Hero folds to cbets too much
    if (this.heroFoldToCbet > 0.55) {
      if (gs.stage === 'flop' && gs.toCall === 0 && baseDec.action === 'check') {
        if (rand < 0.6 * el) {
          return { action: 'raise', amount: Math.floor(gs.pot * 0.5) };
        }
      }
    }

    // EXPLOIT: Hero never folds to cbets
    if (this.heroFoldToCbet < 0.30) {
      if (gs.stage === 'flop' && gs.handStrength < 0.4 && baseDec.action === 'raise') {
        if (rand < 0.5 * el) return { action: 'check' };
      }
    }

    // EXPLOIT: Hero is tight (nit)
    if (this.heroIsTight) {
      // Steal more
      if (gs.stage === 'preflop' && baseDec.action === 'fold') {
        if (gs.position === 'BTN' && rand < 0.25 * el) {
          return { action: 'raise', amount: Math.floor(gs.bigBlind * 2.5) };
        }
      }
      // If nit raises → they have it, fold more
      if (gs.toCall > 0 && gs.handStrength < 0.6) {
        if (rand < 0.3 * el) return { action: 'fold' };
      }
    }

    // EXPLOIT: Hero folds to river bets
    if (this.heroFoldsToRiverBets) {
      if (gs.stage === 'river' && gs.toCall === 0 && baseDec.action === 'check') {
        if (rand < 0.4 * el) {
          return { action: 'raise', amount: Math.floor(gs.pot * 0.65) };
        }
      }
    }

    return baseDec; // No exploit triggered
  }

  // Get hero model summary for display / Claude API
  getHeroSummary() {
    return {
      hands: this.heroModel.hands,
      vpip: this.heroVpip,
      pfr: this.heroPfr,
      foldToCbet: this.heroFoldToCbet,
      isPassive: this.heroIsPassive,
      isAggressive: this.heroIsAggressive,
      isTight: this.heroIsTight,
      isLoose: this.heroIsLoose,
      foldsTooMuch: this.heroFoldsTooMuch,
      callsTooMuch: this.heroCallsTooMuch,
      exploitLevel: this.exploitLevel,
      style: this.heroIsAggressive ? 'aggressive' : this.heroIsPassive ? 'passive' : 'balanced',
    };
  }

  // Serialize for persistence
  serialize() {
    return {
      profile: this.profile,
      heroModel: { ...this.heroModel },
      exploitLevel: this.exploitLevel,
    };
  }

  // Restore from saved state
  static deserialize(data) {
    const ai = new AdaptiveAI(data.profile);
    Object.assign(ai.heroModel, data.heroModel);
    ai.exploitLevel = data.exploitLevel;
    return ai;
  }
}
