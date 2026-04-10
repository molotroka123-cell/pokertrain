// ai.js — Smart base AI engine
// Each bot has a unique profile (TAG/LAG/Nit/Maniac/Station/etc.)
// Decisions based on hand strength, position, pot odds, stack depth, board texture

import { getHandValue, isInOpenRange, isIn3BetRange, handCategory } from './ranges.js';
import { potOdds, spr as calcSPR, mRatio as calcMRatio } from './equity.js';
import { cryptoRandomFloat } from './deck.js';

const POSITIONS_9 = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function boardTexture(community) {
  if (!community || community.length === 0) return { wet: 0, paired: false, monotone: false };
  const suits = community.map(c => c[1]);
  const RV = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const ranks = community.map(c => RV[c[0]] || 0).sort((a, b) => a - b);
  const paired = new Set(ranks).size < ranks.length;
  const sc = {};
  for (const s of suits) sc[s] = (sc[s] || 0) + 1;
  const maxSuit = Math.max(...Object.values(sc));
  const monotone = maxSuit >= 3;
  const flushDraw = maxSuit >= 2;
  let connected = 0;
  for (let i = 1; i < ranks.length; i++) if (ranks[i] - ranks[i - 1] <= 2) connected++;
  let wet = 0;
  if (flushDraw) wet += 0.3;
  if (monotone) wet += 0.2;
  if (connected >= 2) wet += 0.3;
  if (!paired && ranks[ranks.length - 1] >= 10) wet += 0.2;
  return { wet: Math.min(1, wet), paired, monotone, flushDraw, connected };
}

export class BaseAI {
  constructor(profile) {
    this.profile = profile;
    this.noise = 0.06;
  }

  decide(gameState) {
    const { stage } = gameState;
    const rand = cryptoRandomFloat();
    if (stage === 'preflop') return this.preflopDecision(gameState, rand);
    return this.postflopDecision(gameState, rand);
  }

  preflopDecision(gs, rand) {
    const { holeCards, position, toCall, myChips, bigBlind, pot, currentBet, playersInHand } = gs;
    const handVal = getHandValue(holeCards[0], holeCards[1]);
    const cat = handCategory(holeCards[0], holeCards[1]);
    const p = this.profile;
    const sb = gs.smallBlind || bigBlind / 2;
    const m = calcMRatio(myChips, sb, bigBlind, gs.ante || 0, gs.playersAtTable || 9);

    // Push/fold mode
    if (m < 10) {
      let threshold;
      if (m < 3) threshold = 0.50;
      else if (m < 5) threshold = 0.40;
      else if (m < 7) threshold = 0.32;
      else threshold = 0.25;
      // Position bonus
      if (position === 'BTN' || position === 'CO') threshold += 0.12;
      if (position === 'SB') threshold += 0.08;
      // Style bonus
      if (p.style === 'LAG' || p.style === 'Maniac') threshold += 0.08;
      if (p.style === 'Nit') threshold -= 0.05;

      if (handVal <= threshold) return { action: 'raise', amount: myChips };
      // Short stacked facing raise — call with medium+ hands
      if (toCall > 0 && m < 5 && cat !== 'trash' && cat !== 'marginal') {
        return { action: 'call' };
      }
      return { action: 'fold' };
    }

    // No raise to us — open or fold
    if (toCall <= bigBlind) {
      const threshold = p.vpip + (rand - 0.5) * this.noise;
      if (handVal > threshold) return { action: 'fold' };

      // TAG/LAG always raise, never limp
      if (p.pfr > 0 && handVal <= p.pfr + (rand - 0.5) * this.noise) {
        const size = Math.floor(bigBlind * (2.2 + cryptoRandomFloat() * 0.8 + (playersInHand > 4 ? 0.5 : 0)));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      // Stations and fish limp
      if (p.style === 'STATION' || p.style === 'LIMPER' || p.style === 'Maniac') {
        return p.style === 'Maniac' && rand < 0.6
          ? { action: 'raise', amount: Math.min(Math.floor(bigBlind * (3 + cryptoRandomFloat() * 2)), myChips) }
          : { action: 'call' };
      }
      return { action: 'fold' }; // TAG/Nit don't limp
    }

    // Facing a raise
    const raiseBBs = toCall / bigBlind;

    // 3-bet with premium+
    if (isIn3BetRange(holeCards[0], holeCards[1], position)) {
      const threeBetChance = p.threeBet + (rand - 0.5) * 0.04;
      if (rand < threeBetChance) {
        const size = Math.floor(currentBet * (2.8 + cryptoRandomFloat() * 0.4));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
    }

    // Calling stations call almost everything
    if (p.style === 'STATION' && cat !== 'trash') return { action: 'call' };

    // Maniacs re-raise light
    if (p.style === 'Maniac' && rand < 0.35) {
      const size = Math.floor(currentBet * (2.5 + cryptoRandomFloat()));
      return { action: 'raise', amount: Math.min(size, myChips) };
    }

    // Pot odds decision
    const odds = potOdds(toCall, pot);
    const strength = 1 - handVal;

    if (cat === 'premium') {
      // Always 3-bet premium
      const size = Math.floor(currentBet * 3);
      return { action: 'raise', amount: Math.min(size, myChips) };
    }
    if (cat === 'strong' && strength > odds) return { action: 'call' };
    if (cat === 'medium') {
      // LAG calls wider
      if ((p.style === 'LAG' || p.style === 'SemiLAG') && strength > odds - 0.05) return { action: 'call' };
      if (strength > odds + 0.08) return { action: 'call' };
    }

    // Scared money folds marginals
    if (p.style === 'SCARED_MONEY' && raiseBBs > 3) return { action: 'fold' };

    return { action: 'fold' };
  }

  postflopDecision(gs, rand) {
    const { toCall } = gs;
    const strength = gs.handStrength || 0.5;
    const texture = boardTexture(gs.community);

    if (toCall === 0) return this.postflopCheck(gs, strength, texture, rand);
    return this.postflopFacingBet(gs, strength, texture, rand);
  }

  postflopCheck(gs, strength, texture, rand) {
    const { pot, myChips } = gs;
    const p = this.profile;
    const af = p.af || 2.5;

    // Monster (set+): sometimes slowplay, sometimes bet big
    if (strength > 0.7) {
      // Slowplay trap sometimes (LAG/tricky players)
      if ((p.style === 'LAG' || p.style === 'SemiLAG') && rand < 0.25) {
        return { action: 'check' }; // Trap!
      }
      // Value bet — size by hand strength
      const sizing = strength > 0.85 ? 0.7 + cryptoRandomFloat() * 0.3 : 0.45 + cryptoRandomFloat() * 0.25;
      return { action: 'raise', amount: Math.min(Math.floor(pot * sizing), myChips) };
    }

    // Medium hand (pair, TPWK): bet for value/protection depending on style
    if (strength > 0.4) {
      const betChance = 0.15 + (af - 1.5) / 6; // AF drives aggression
      if (rand < betChance) {
        const sizing = 0.33 + cryptoRandomFloat() * 0.25;
        return { action: 'raise', amount: Math.min(Math.floor(pot * sizing), myChips) };
      }
      return { action: 'check' };
    }

    // Weak/draw: bluff based on board texture + style
    // Dry boards = more bluffs, wet boards = less
    const bluffChance = (af - 1.5) / 10 * (1 - texture.wet);
    if (rand < bluffChance) {
      const sizing = 0.4 + cryptoRandomFloat() * 0.2;
      return { action: 'raise', amount: Math.min(Math.floor(pot * sizing), myChips) };
    }

    // Stations/fish never bluff
    if (p.style === 'STATION' || p.style === 'LIMPER') return { action: 'check' };

    // Occasional probe bet (CO/BTN only)
    if ((gs.position === 'BTN' || gs.position === 'CO') && rand < 0.15 * (af / 3)) {
      return { action: 'raise', amount: Math.min(Math.floor(pot * 0.33), myChips) };
    }

    return { action: 'check' };
  }

  postflopFacingBet(gs, strength, texture, rand) {
    const { pot, toCall, myChips, currentBet, stage } = gs;
    const p = this.profile;
    const odds = potOdds(toCall, pot);
    const af = p.af || 2.5;

    // Monster: raise for value (or slowplay call)
    if (strength > 0.75) {
      // Raise most of the time
      if (rand < 0.6 + (af - 2) / 10) {
        const size = Math.floor(currentBet * (2.2 + cryptoRandomFloat() * 1.3));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      return { action: 'call' }; // Slowplay
    }

    // Strong hand: call, sometimes raise
    if (strength > 0.55) {
      if (af > 3 && rand < 0.25) {
        const size = Math.floor(currentBet * 2.5);
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      return { action: 'call' };
    }

    // Medium hand: call if pot odds are right
    if (strength > 0.4 && strength > odds) {
      // Stations call everything
      if (p.style === 'STATION') return { action: 'call' };
      // Others are more selective
      if (strength > odds + 0.05) return { action: 'call' };
    }

    // Draw (medium-low strength on flop/turn): call with implied odds
    if (strength > 0.3 && stage !== 'river') {
      if (p.style === 'LAG' || p.style === 'Maniac' || p.style === 'STATION') return { action: 'call' };
      if (strength > odds - 0.05) return { action: 'call' }; // Implied odds
    }

    // Bluff raise (aggressive players, low frequency)
    if (strength < 0.25 && af > 3.5 && rand < 0.06) {
      const size = Math.floor(currentBet * 2.8);
      return { action: 'raise', amount: Math.min(size, myChips) };
    }

    // River: calling stations still call
    if (stage === 'river' && p.style === 'STATION' && strength > 0.25) return { action: 'call' };

    // Scared money folds to any significant bet
    if (p.style === 'SCARED_MONEY' && toCall > pot * 0.3) return { action: 'fold' };

    return { action: 'fold' };
  }
}

export { boardTexture, POSITIONS_9 };
