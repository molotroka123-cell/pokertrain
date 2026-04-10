// ai.js — Base AI decision engine
// Tier 1: Profile-based play using ranges, equity, position. 100% local, $0.

import { getHandValue, isInOpenRange, isIn3BetRange, handCategory } from './ranges.js';
import { potOdds, spr as calcSPR, mRatio as calcMRatio } from './equity.js';
import { cryptoRandomFloat } from './deck.js';

// Positions in order (9-max)
const POSITIONS_9 = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// Board texture analysis
function boardTexture(community) {
  if (!community || community.length === 0) return { wet: 0, paired: false, monotone: false };

  const suits = community.map(c => c[1]);
  const ranks = community.map(c => {
    const map = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return map[c[0]];
  }).sort((a, b) => a - b);

  // Paired board
  const paired = new Set(ranks).size < ranks.length;

  // Flush draw potential
  const suitCounts = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const maxSuit = Math.max(...Object.values(suitCounts));
  const monotone = maxSuit >= 3;
  const flushDraw = maxSuit >= 2;

  // Straight draw potential (connectedness)
  let connected = 0;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] <= 2) connected++;
  }

  // Wetness: 0 (dry) to 1 (very wet)
  let wet = 0;
  if (flushDraw) wet += 0.3;
  if (monotone) wet += 0.2;
  if (connected >= 2) wet += 0.3;
  if (!paired && ranks[ranks.length - 1] >= 10) wet += 0.2;

  return { wet: Math.min(1, wet), paired, monotone, flushDraw, connected };
}

// Base AI: makes decisions based on profile + game state
export class BaseAI {
  constructor(profile) {
    // profile: { style, vpip, pfr, af, threeBet }
    this.profile = profile;
    this.noise = 0.08; // Random noise factor for unpredictability
  }

  decide(gameState) {
    const { stage, holeCards, community, pot, toCall, myChips, position, bigBlind,
            smallBlind, ante, playersInHand, playersAtTable, currentBet } = gameState;

    // Add noise to make bots less predictable
    const rand = cryptoRandomFloat();

    if (stage === 'preflop') {
      return this.preflopDecision(gameState, rand);
    }
    return this.postflopDecision(gameState, rand);
  }

  preflopDecision(gs, rand) {
    const { holeCards, position, toCall, myChips, bigBlind, pot, playersInHand, currentBet } = gs;
    const handVal = getHandValue(holeCards[0], holeCards[1]);
    const cat = handCategory(holeCards[0], holeCards[1]);
    const p = this.profile;
    const m = calcMRatio(myChips, bigBlind / 2, bigBlind, 0, gs.playersAtTable || 9);

    // Push/fold mode (M < 8)
    if (m < 8) {
      return this.pushFoldDecision(gs, handVal, m);
    }

    // No bet to us (we can open)
    if (toCall === 0 || toCall <= bigBlind) {
      // Opening range based on profile VPIP
      const threshold = p.vpip + (rand - 0.5) * this.noise;
      const inRange = handVal <= threshold;

      if (!inRange) return { action: 'fold' };

      // Raise or limp?
      const raiseThreshold = p.pfr + (rand - 0.5) * this.noise;
      if (handVal <= raiseThreshold) {
        // Raise size: 2.5-3x BB
        const size = Math.floor(bigBlind * (2.5 + cryptoRandomFloat() * 0.5));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }

      // Limp (passive players do this more)
      if (p.style === 'Nit' || p.style === 'TAG') {
        return { action: 'fold' }; // TAGs don't limp
      }
      return { action: 'call' };
    }

    // Facing a raise
    const raiseBBs = toCall / bigBlind;

    // 3-bet decision
    if (isIn3BetRange(holeCards[0], holeCards[1], position)) {
      if (rand < p.threeBet + this.noise) {
        const size = Math.floor(currentBet * 3);
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
    }

    // Call decision based on pot odds and hand strength
    const odds = potOdds(toCall, pot);
    const impliedStrength = 1 - handVal; // Convert: lower handVal = stronger

    if (impliedStrength > odds + 0.1) {
      return { action: 'call' };
    }

    // Premium hands always continue
    if (cat === 'premium') {
      const size = Math.floor(currentBet * 3);
      return { action: 'raise', amount: Math.min(size, myChips) };
    }
    if (cat === 'strong') {
      return { action: 'call' };
    }

    // Marginal hands: profile dependent
    if (cat === 'medium' && impliedStrength > odds - 0.05) {
      if (p.style === 'LAG' || p.style === 'Maniac') return { action: 'call' };
      if (p.style === 'SemiLAG' && rand < 0.5) return { action: 'call' };
    }

    return { action: 'fold' };
  }

  pushFoldDecision(gs, handVal, m) {
    const { myChips, bigBlind } = gs;
    // Simplified push/fold: shove or fold based on M and hand strength
    // M < 5: very tight shove range expands
    let shovedThreshold;
    if (m < 3) shovedThreshold = 0.45; // Desperate: shove wider
    else if (m < 5) shovedThreshold = 0.35;
    else shovedThreshold = 0.25;

    // Adjust for position
    if (gs.position === 'BTN' || gs.position === 'CO') shovedThreshold += 0.10;
    if (gs.position === 'SB') shovedThreshold += 0.08;

    if (handVal <= shovedThreshold) {
      return { action: 'raise', amount: myChips }; // All-in
    }
    return { action: 'fold' };
  }

  postflopDecision(gs, rand) {
    const { holeCards, community, pot, toCall, myChips, stage, handStrength: hs, currentBet } = gs;
    const p = this.profile;
    const strength = hs || 0.5; // Use provided hand strength or default
    const texture = boardTexture(community);
    const sprVal = calcSPR(myChips, pot);

    // No bet to us
    if (toCall === 0) {
      return this.postflopNoBet(gs, strength, texture, rand);
    }

    // Facing a bet
    return this.postflopFacingBet(gs, strength, texture, rand);
  }

  postflopNoBet(gs, strength, texture, rand) {
    const { pot, myChips, bigBlind, playersInHand } = gs;
    const p = this.profile;
    const af = p.af || 2.5;

    // Strong hand: bet for value
    if (strength > 0.7) {
      const sizeFactor = 0.5 + cryptoRandomFloat() * 0.25; // 50-75% pot
      const amount = Math.floor(pot * sizeFactor);
      return { action: 'raise', amount: Math.min(amount, myChips) };
    }

    // Medium hand: bet or check depending on aggression
    if (strength > 0.45) {
      const betChance = (af - 1.5) / 5; // Higher AF = more likely to bet
      if (rand < betChance) {
        const amount = Math.floor(pot * (0.4 + cryptoRandomFloat() * 0.2));
        return { action: 'raise', amount: Math.min(amount, myChips) };
      }
      return { action: 'check' };
    }

    // Weak hand: bluff sometimes (based on AF and board texture)
    if (texture.wet < 0.3 && rand < (af - 2) / 8) {
      // Bluff on dry boards
      const amount = Math.floor(pot * (0.4 + cryptoRandomFloat() * 0.2));
      return { action: 'raise', amount: Math.min(amount, myChips) };
    }

    return { action: 'check' };
  }

  postflopFacingBet(gs, strength, texture, rand) {
    const { pot, toCall, myChips, currentBet } = gs;
    const p = this.profile;
    const odds = potOdds(toCall, pot);

    // Strong hand: raise or call
    if (strength > 0.75) {
      // Raise for value
      if (rand < 0.4 + (p.af - 2) / 10) {
        const amount = Math.floor(currentBet * (2.5 + cryptoRandomFloat()));
        return { action: 'raise', amount: Math.min(amount, myChips) };
      }
      return { action: 'call' };
    }

    // Medium hand: call if pot odds are right
    if (strength > 0.45 && strength > odds) {
      return { action: 'call' };
    }

    // Drawing hand considerations
    if (strength > 0.3 && strength > odds - 0.08) {
      // Implied odds adjustment for LAG/Maniac
      if (p.style === 'LAG' || p.style === 'Maniac' || p.style === 'SemiLAG') {
        return { action: 'call' };
      }
      // Tight players fold marginal spots
      if (rand < 0.3) return { action: 'call' };
    }

    // Bluff raise (rare, aggressive players only)
    if (strength < 0.25 && p.af > 3.5 && rand < 0.08) {
      const amount = Math.floor(currentBet * 2.8);
      return { action: 'raise', amount: Math.min(amount, myChips) };
    }

    return { action: 'fold' };
  }
}

export { boardTexture, POSITIONS_9 };
