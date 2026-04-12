// regBossAI.js — Elite bot: plays like NL50+ reg
// Max 1 per table. Strict GTO ranges, no sizing tells, barrel narrows.

import { AdaptiveAI } from './adaptiveAI.js';
import { getHandValue, isInOpenRange, isIn3BetRange } from './ranges.js';
import { potOdds } from './equity.js';
import { cryptoRandomFloat } from './deck.js';

function boardTexture(community) {
  if (!community || community.length === 0) return { category: 'none', wet: 0, highCard: 0, connected: 0 };
  const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
  const ranks = community.map(c => RV[c[0]] || 0).sort((a, b) => a - b);
  const suits = community.map(c => c[1]);
  const sc = {}; for (const s of suits) sc[s] = (sc[s] || 0) + 1;
  const maxSuit = Math.max(...Object.values(sc));
  const paired = new Set(ranks).size < ranks.length;
  let connected = 0;
  for (let i = 1; i < ranks.length; i++) if (ranks[i] - ranks[i-1] <= 2) connected++;
  const highCard = ranks[ranks.length - 1];
  let wet = (maxSuit >= 2 ? 0.3 : 0) + (maxSuit >= 3 ? 0.2 : 0) + (connected >= 2 ? 0.3 : 0);
  const category = paired ? 'paired' : maxSuit >= 3 ? 'monotone' : wet > 0.5 ? 'wet' : wet > 0.25 ? 'medium' : 'dry';
  return { category, wet, highCard, connected, paired };
}

export class RegBossAI extends AdaptiveAI {
  constructor(profile) {
    super({ ...profile, style: 'TAG', vpip: 0.22, pfr: 0.20, af: 3.5, threeBet: 0.08 });
    this.minHandsToExploit = 3;
    this.isRegBoss = true;
  }

  preflopDecision(gs, rand) {
    const { holeCards, position, toCall, myChips, bigBlind, currentBet, playersInHand } = gs;
    const handVal = getHandValue(holeCards[0], holeCards[1]);
    const m = myChips / Math.max(bigBlind, 1);
    const isPair = holeCards[0][0] === holeCards[1][0];

    // Short stack: use parent push/fold
    if (m < 15) return super.preflopDecision(gs, rand);

    // Strict GTO open ranges — NEVER limp
    const OPEN = { UTG: 0.13, 'UTG+1': 0.15, MP: 0.18, HJ: 0.22, CO: 0.28, BTN: 0.42, SB: 0.35 };
    if (toCall <= bigBlind) {
      if (handVal <= (OPEN[position] || 0.25)) {
        return { action: 'raise', amount: Math.min(Math.floor(bigBlind * (2.2 + rand * 0.5)), myChips) };
      }
      return { action: 'fold' };
    }

    // Facing raise: 3-bet or fold (flat only small pairs for set mining)
    if (isPair && handVal > 0.08 && handVal <= 0.32 && myChips / toCall > 15) {
      return { action: 'call' }; // set mine
    }
    const THREEBET = { UTG: 0.04, 'UTG+1': 0.05, MP: 0.06, HJ: 0.08, CO: 0.10, BTN: 0.12, SB: 0.10, BB: 0.09 };
    if (handVal <= (THREEBET[position] || 0.08)) {
      const maxR = Math.min(myChips, Math.max(Math.floor(myChips * 0.25), bigBlind * 12));
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), maxR) };
    }
    if (handVal <= 0.04) return { action: 'raise', amount: myChips }; // premium jam vs 4bet

    // BB defense (tighter than fish)
    if (position === 'BB' && toCall <= bigBlind * 3.5) {
      if (handVal <= 0.35) return { action: 'call' };
    }
    return { action: 'fold' };
  }

  postflopDecision(gs, rand) {
    const strength = gs.handStrength || 0.5;
    const texture = boardTexture(gs.community || []);
    const isIP = gs.position === 'BTN' || gs.position === 'CO' || gs.position === 'HJ';
    const spr = gs.pot > 0 ? gs.myChips / gs.pot : 20;
    const hi = gs.handInfo || {};
    const toCall = gs.toCall || 0;

    // Short stack postflop: jam with piece
    if (spr < 3 && strength > 0.30) return { action: 'raise', amount: gs.myChips };

    // NEVER continue with trash
    if (strength < 0.12 && (!hi.drawType || hi.drawType === 'none')) {
      if (toCall > 0) return { action: 'fold' };
      // Bluff only 12% with blockers
      if (hi.hasBlockers && rand < 0.12) {
        return { action: 'raise', amount: this._regSizing(gs, texture) };
      }
      return { action: 'check' };
    }

    if (toCall === 0) return this._regAct(gs, strength, texture, rand, isIP, spr, hi);
    return this._regFacing(gs, strength, texture, rand, isIP, spr, hi);
  }

  _regAct(gs, strength, texture, rand, isIP, spr, hi) {
    const { pot, myChips, stage } = gs;
    const isAgg = gs.isAggressor;
    const multiway = (gs.playersInHand || 2) > 2;

    // Monster: bet or trap 25% OOP
    if (strength > 0.70) {
      if (!isIP && rand < 0.25 && !multiway) return { action: 'check' };
      return { action: 'raise', amount: this._regSizing(gs, texture) };
    }

    // C-bet (aggressor flop)
    if (isAgg && stage === 'flop') {
      if (multiway) {
        if (strength > 0.50) return { action: 'raise', amount: this._regSizing(gs, texture) };
        return { action: 'check' };
      }
      let freq = texture.category === 'dry' ? 0.80 : texture.category === 'paired' ? 0.70 :
        texture.category === 'medium' ? 0.50 : 0.30;
      if (strength > 0.50) freq = Math.min(1.0, freq + 0.25);
      if (hi.drawType && hi.drawOuts >= 8) freq = Math.min(1.0, freq + 0.20);
      if (strength < 0.18 && !hi.drawType && !hi.hasBlockers) freq *= 0.4;
      if (rand < freq) return { action: 'raise', amount: this._regSizing(gs, texture) };
      return { action: 'check' };
    }

    // Turn barrel (aggressor)
    if (isAgg && stage === 'turn' && gs.didCbetFlop) {
      if (strength > 0.55) return { action: 'raise', amount: this._regSizing(gs, texture) };
      if (hi.drawType && hi.drawOuts >= 8 && rand < 0.50) return { action: 'raise', amount: this._regSizing(gs, texture) };
      if (hi.hasBlockers && strength < 0.15 && rand < 0.18) return { action: 'raise', amount: this._regSizing(gs, texture) };
      return { action: 'check' };
    }

    // River barrel
    if (isAgg && stage === 'river' && gs.didBetTurn) {
      if (strength > 0.60) return { action: 'raise', amount: this._regSizing(gs, texture) };
      if (strength > 0.40 && rand < 0.30) return { action: 'raise', amount: Math.min(Math.floor(pot * 0.25), myChips) }; // merge
      if (strength < 0.12 && (hi.hasBlockers || hi.drawType) && rand < 0.28) {
        return { action: 'raise', amount: this._regSizing(gs, texture) }; // balanced bluff
      }
      return { action: 'check' };
    }

    // Non-aggressor
    if (strength > 0.55 && isIP) return { action: 'raise', amount: this._regSizing(gs, texture) };
    if (isIP && stage === 'turn' && !gs.didCbetFlop && strength > 0.25 && rand < 0.40) {
      return { action: 'raise', amount: this._regSizing(gs, texture) }; // probe
    }
    return { action: 'check' };
  }

  _regFacing(gs, strength, texture, rand, isIP, spr, hi) {
    const { pot, toCall, myChips, stage } = gs;
    const odds = toCall / (pot + toCall);
    const ev = strength * (pot + toCall) - (1 - strength) * toCall;
    const commit = myChips > 0 ? toCall / myChips : 1;
    const betSize = pot > 0 ? toCall / pot : 0;

    if (commit > 0.33 && strength > 0.45) return { action: 'raise', amount: myChips };
    if (spr < 2 && strength > 0.40) return { action: 'raise', amount: myChips };

    if (strength > 0.75) {
      if (rand < 0.75) return { action: 'raise', amount: Math.min(Math.floor(gs.currentBet * 2.5), myChips) };
      return { action: 'call' };
    }
    if (!isIP && strength > 0.60 && rand < 0.22) {
      return { action: 'raise', amount: Math.min(Math.floor(gs.currentBet * 3), myChips) };
    }
    if (strength > 0.55) return { action: 'call' };

    // Medium: EV-based
    if (strength > 0.40) {
      if (betSize > 1.0 && strength < 0.50) return { action: 'fold' };
      if (ev > 0) return { action: 'call' };
      return { action: 'fold' };
    }

    // Draw: pot odds
    if (hi.drawType && hi.drawOuts >= 8 && stage !== 'river') {
      const drawEq = hi.drawOuts * (stage === 'flop' ? 0.04 : 0.02);
      if (drawEq > odds - 0.05) return { action: 'call' };
    }

    // Trash: fold
    if (strength < 0.20) return { action: 'fold' };
    if (ev > 0) return { action: 'call' };
    return { action: 'fold' };
  }

  // Same sizing for all hands in same spot (no tells)
  _regSizing(gs, texture) {
    const { pot, myChips } = gs;
    const stage = gs.stage;
    let pct;
    if (stage === 'flop') pct = (texture?.category === 'dry' || texture?.category === 'paired') ? 0.33 : 0.65;
    else if (stage === 'turn') pct = 0.65;
    else pct = 0.75; // river
    return Math.min(Math.floor(pot * pct), myChips);
  }
}
