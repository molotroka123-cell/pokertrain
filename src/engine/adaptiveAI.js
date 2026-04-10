// adaptiveAI.js — Smart opponent modeling + exploitation
// Tracks hero actions per-hand (not per-action), exploits leaks aggressively

import { BaseAI } from './ai.js';
import { cryptoRandomFloat } from './deck.js';

export class AdaptiveAI extends BaseAI {
  constructor(profile) {
    super(profile);
    this.heroModel = {
      handsPlayed: 0,        // Actual hands, not actions
      vpipHands: 0,
      pfrHands: 0,
      threeBetHands: 0,
      cbetsMade: 0,          // Hero c-bet count
      cbetsFolded: 0,        // Times hero folded to our c-bet
      foldToThreeBet: 0,
      facedThreeBet: 0,
      totalFolds: 0,
      totalCalls: 0,
      totalRaises: 0,
      totalActions: 0,
      showdownWins: 0,
      showdowns: 0,
      riverBetsFaced: 0,
      riverFolds: 0,
      bluffsDetected: 0,     // Times hero showed weak hand after aggression
      valueBetsDetected: 0,  // Times hero showed strong hand after betting
      bigPotFolds: 0,        // Folds in pots > 20bb
      bigPotCalls: 0,
      // Per position
      byPosition: {},
      // Recent actions (last 20)
      recentActions: [],
      // Per-hand tracking
      _currentHandActions: [],
    };
    this.exploitLevel = 0;
    this.minHandsToExploit = 10; // Adapt faster (was 15)
  }

  // ═══ COMPUTED READS ═══
  get heroVpip() { return this.heroModel.handsPlayed > 0 ? this.heroModel.vpipHands / this.heroModel.handsPlayed : 0.25; }
  get heroPfr() { return this.heroModel.handsPlayed > 0 ? this.heroModel.pfrHands / this.heroModel.handsPlayed : 0.18; }
  get heroFoldToCbet() { return this.heroModel.cbetsMade > 3 ? this.heroModel.cbetsFolded / this.heroModel.cbetsMade : 0.45; }
  get heroIsPassive() { return this.heroVpip - this.heroPfr > 0.12; }
  get heroIsAggressive() { return this.heroPfr > 0.25; }
  get heroIsTight() { return this.heroVpip < 0.18; }
  get heroIsLoose() { return this.heroVpip > 0.32; }
  get heroFoldsTooMuch() { return this.heroModel.totalActions > 15 && this.heroModel.totalFolds / this.heroModel.totalActions > 0.55; }
  get heroCallsTooMuch() { return this.heroIsPassive && this.heroVpip > 0.28; }
  get heroFoldsToRiverBets() { return this.heroModel.riverBetsFaced > 3 && this.heroModel.riverFolds / this.heroModel.riverBetsFaced > 0.55; }
  get heroBluffsOften() { return this.heroModel.showdowns > 3 && this.heroModel.bluffsDetected / this.heroModel.showdowns > 0.35; }
  get heroNeverBluffs() { return this.heroModel.showdowns > 5 && this.heroModel.bluffsDetected / this.heroModel.showdowns < 0.10; }
  get heroFoldsToBigBets() { return this.heroModel.bigPotFolds + this.heroModel.bigPotCalls > 5 && this.heroModel.bigPotFolds / (this.heroModel.bigPotFolds + this.heroModel.bigPotCalls) > 0.6; }

  // Called ONCE per hand with all hero actions (not per-action!)
  observeHeroHand(actions, context) {
    const h = this.heroModel;
    h.handsPlayed++;

    let didVpip = false, didPfr = false;
    for (const a of actions) {
      h.totalActions++;
      if (a.action === 'fold') h.totalFolds++;
      if (a.action === 'call') h.totalCalls++;
      if (a.action === 'raise') h.totalRaises++;

      if (a.stage === 'preflop') {
        if (a.action === 'call' || a.action === 'raise') didVpip = true;
        if (a.action === 'raise') didPfr = true;
      }

      // Track big pot behavior
      if (a._pot > (context.bigBlind || 200) * 20) {
        if (a.action === 'fold') h.bigPotFolds++;
        if (a.action === 'call' || a.action === 'raise') h.bigPotCalls++;
      }

      // Track river
      if (a.stage === 'river' && a._toCall > 0) {
        h.riverBetsFaced++;
        if (a.action === 'fold') h.riverFolds++;
      }

      // Track position
      if (a.position) {
        if (!h.byPosition[a.position]) h.byPosition[a.position] = { hands: 0, vpip: 0, pfr: 0, folds: 0 };
        const pos = h.byPosition[a.position];
        if (a.stage === 'preflop') {
          pos.hands++;
          if (a.action !== 'fold') pos.vpip++;
          if (a.action === 'raise') pos.pfr++;
          if (a.action === 'fold') pos.folds++;
        }
      }

      h.recentActions.push(a);
      if (h.recentActions.length > 25) h.recentActions.shift();
    }

    if (didVpip) h.vpipHands++;
    if (didPfr) h.pfrHands++;

    // Adapt faster as we gather data — every 10 hands bump exploit
    if (h.handsPlayed > this.minHandsToExploit) {
      this.exploitLevel = Math.min(0.85, (h.handsPlayed - this.minHandsToExploit) / 60);
    }
  }

  // Legacy compat — called per action from GameEngine
  observeHeroAction(action, context) {
    this.heroModel._currentHandActions.push({ action, ...context });
  }

  // Call at end of each hand to flush per-hand data
  endHand(context) {
    if (this.heroModel._currentHandActions.length > 0) {
      this.observeHeroHand(this.heroModel._currentHandActions, context || {});
      this.heroModel._currentHandActions = [];
    }
  }

  observeShowdown(heroCards, heroWon, heroHandStrength) {
    this.heroModel.showdowns++;
    if (heroWon) this.heroModel.showdownWins++;
    // Track if hero showed bluff or value
    if (heroHandStrength !== undefined) {
      if (heroHandStrength < 0.3) this.heroModel.bluffsDetected++;
      if (heroHandStrength > 0.6) this.heroModel.valueBetsDetected++;
    }
  }

  // ═══ MAIN DECISION ═══
  decide(gameState) {
    const baseDecision = super.decide(gameState);
    if (this.heroModel.handsPlayed < this.minHandsToExploit) return baseDecision;
    return this.exploit(baseDecision, gameState);
  }

  exploit(baseDec, gs) {
    const el = this.exploitLevel;
    const rand = cryptoRandomFloat();

    // ═══ BLUFF EXPLOITS ═══

    // Hero folds too much → bluff relentlessly
    if (this.heroFoldsTooMuch) {
      if (gs.stage !== 'preflop' && baseDec.action === 'check' && rand < 0.4 * el) {
        return { action: 'raise', amount: Math.floor(gs.pot * (0.5 + cryptoRandomFloat() * 0.3)) };
      }
      if (gs.stage === 'preflop' && (gs.position === 'BTN' || gs.position === 'CO' || gs.position === 'SB')) {
        if (baseDec.action === 'fold' && rand < 0.35 * el) {
          return { action: 'raise', amount: Math.floor(gs.bigBlind * (2.2 + cryptoRandomFloat() * 0.8)) };
        }
      }
    }

    // Hero folds to river bets → bluff rivers more
    if (this.heroFoldsToRiverBets && gs.stage === 'river') {
      if (gs.toCall === 0 && baseDec.action === 'check' && rand < 0.5 * el) {
        return { action: 'raise', amount: Math.floor(gs.pot * (0.6 + cryptoRandomFloat() * 0.4)) };
      }
    }

    // Hero folds to big bets → overbet with air
    if (this.heroFoldsToBigBets && gs.handStrength < 0.3 && rand < 0.3 * el) {
      if (gs.toCall === 0) {
        return { action: 'raise', amount: Math.floor(gs.pot * (0.8 + cryptoRandomFloat() * 0.5)) };
      }
    }

    // ═══ VALUE EXPLOITS ═══

    // Hero calls too much → value bet thinner, never bluff
    if (this.heroCallsTooMuch) {
      if (baseDec.action === 'raise' && gs.handStrength < 0.4) {
        if (rand < 0.6 * el) return { action: 'check' }; // Don't bluff calling station
      }
      if (gs.handStrength > 0.55 && gs.toCall === 0) {
        // Value bet with medium hands (they'll call with worse)
        const sizing = 0.5 + cryptoRandomFloat() * 0.3;
        return { action: 'raise', amount: Math.floor(gs.pot * sizing * (1 + 0.2 * el)) };
      }
    }

    // Hero never bluffs → fold more to their bets (they always have it)
    if (this.heroNeverBluffs && gs.toCall > 0 && gs.handStrength < 0.55) {
      if (rand < 0.4 * el) return { action: 'fold' };
    }

    // Hero bluffs often → call down lighter (catch bluffs)
    if (this.heroBluffsOften && gs.toCall > 0) {
      if (baseDec.action === 'fold' && gs.handStrength > 0.3) {
        if (rand < 0.4 * el) return { action: 'call' }; // Bluff-catch
      }
    }

    // ═══ AGGRESSION EXPLOITS ═══

    // Hero is hyper-aggressive → trap with monsters
    if (this.heroIsAggressive && this.heroPfr > 0.28) {
      if (gs.stage === 'preflop' && gs.handStrength > 0.85 && rand < 0.45 * el) {
        return { action: 'call' }; // Trap!
      }
      if (gs.stage !== 'preflop' && gs.handStrength > 0.7 && baseDec.action === 'raise' && rand < 0.3 * el) {
        return { action: 'call' }; // Slowplay, let them hang
      }
      // Call down lighter postflop
      if (baseDec.action === 'fold' && gs.handStrength > 0.35 && gs.stage !== 'preflop') {
        if (rand < 0.35 * el) return { action: 'call' };
      }
    }

    // ═══ C-BET EXPLOITS ═══

    // Hero folds to c-bets too much
    if (this.heroFoldToCbet > 0.55 && gs.stage === 'flop' && gs.toCall === 0) {
      if (baseDec.action === 'check' && rand < 0.65 * el) {
        return { action: 'raise', amount: Math.floor(gs.pot * 0.45) };
      }
    }

    // Hero never folds to c-bets → only c-bet for value
    if (this.heroFoldToCbet < 0.25 && gs.stage === 'flop' && gs.handStrength < 0.4) {
      if (baseDec.action === 'raise' && rand < 0.55 * el) return { action: 'check' };
    }

    // ═══ POSITIONAL EXPLOITS ═══

    // Hero is tight → steal blinds every hand
    if (this.heroIsTight) {
      if (gs.stage === 'preflop' && baseDec.action === 'fold') {
        if ((gs.position === 'BTN' || gs.position === 'CO' || gs.position === 'SB') && rand < 0.35 * el) {
          return { action: 'raise', amount: Math.floor(gs.bigBlind * 2.5) };
        }
      }
      // If nit raises → they have it, fold marginals
      if (gs.toCall > 0 && gs.handStrength < 0.55 && rand < 0.35 * el) {
        return { action: 'fold' };
      }
    }

    // Hero is loose → tighten up, wait for value
    if (this.heroIsLoose && gs.handStrength > 0.6 && gs.toCall === 0) {
      // Value bet bigger — loose hero will call
      const size = Math.floor(gs.pot * (0.6 + cryptoRandomFloat() * 0.3) * (1 + 0.25 * el));
      return { action: 'raise', amount: Math.min(size, gs.myChips) };
    }

    return baseDec;
  }

  getHeroSummary() {
    return {
      hands: this.heroModel.handsPlayed,
      vpip: this.heroVpip,
      pfr: this.heroPfr,
      foldToCbet: this.heroFoldToCbet,
      isPassive: this.heroIsPassive,
      isAggressive: this.heroIsAggressive,
      isTight: this.heroIsTight,
      isLoose: this.heroIsLoose,
      foldsTooMuch: this.heroFoldsTooMuch,
      callsTooMuch: this.heroCallsTooMuch,
      bluffsOften: this.heroBluffsOften,
      neverBluffs: this.heroNeverBluffs,
      foldsToBigBets: this.heroFoldsToBigBets,
      exploitLevel: this.exploitLevel,
      style: this.heroIsAggressive ? 'aggressive' : this.heroIsPassive ? 'passive' : 'balanced',
    };
  }

  serialize() {
    return { profile: this.profile, heroModel: { ...this.heroModel, _currentHandActions: [] }, exploitLevel: this.exploitLevel };
  }

  static deserialize(data) {
    const ai = new AdaptiveAI(data.profile);
    Object.assign(ai.heroModel, data.heroModel);
    ai.exploitLevel = data.exploitLevel;
    return ai;
  }
}
