// ai.js — Production AI engine
// Realistic player simulation: BB defense, stack/SPR awareness, ICM, range-based decisions
// Each bot has a unique profile (TAG/LAG/Nit/Maniac/Station/etc.)

import { getHandValue, isInOpenRange, isIn3BetRange, handCategory } from './ranges.js';
import { potOdds, spr as calcSPR, mRatio as calcMRatio } from './equity.js';
import { cryptoRandomFloat } from './deck.js';

const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

function boardTexture(community) {
  if (!community || community.length === 0) return { wet: 0, paired: false, monotone: false, highCard: 0 };
  const suits = community.map(c => c[1]);
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
  const highCard = ranks[ranks.length - 1];
  return { wet: Math.min(1, wet), paired, monotone, flushDraw, connected, highCard };
}

export class BaseAI {
  constructor(profile) {
    this.profile = profile;
    this.noise = 0.05;
  }

  decide(gameState) {
    const { stage } = gameState;
    const rand = cryptoRandomFloat();
    if (stage === 'preflop') return this.preflopDecision(gameState, rand);
    return this.postflopDecision(gameState, rand);
  }

  // ═══════════════════════════════════════
  // PREFLOP — Stack-aware, position-aware, BB defense
  // ═══════════════════════════════════════
  preflopDecision(gs, rand) {
    const { holeCards, position, toCall, myChips, bigBlind, pot, currentBet, playersInHand } = gs;
    const handVal = getHandValue(holeCards[0], holeCards[1]);
    const cat = handCategory(holeCards[0], holeCards[1]);
    const p = this.profile;
    const sb = gs.smallBlind || bigBlind / 2;
    const m = calcMRatio(myChips, sb, bigBlind, gs.ante || 0, gs.playersAtTable || 9);
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;
    const stackBB = myChips / Math.max(bigBlind, 1);

    // ═══ PUSH/FOLD MODE (M < 12) ═══
    if (m < 12) {
      let threshold;
      if (m < 3) threshold = 0.55;
      else if (m < 5) threshold = 0.42;
      else if (m < 7) threshold = 0.35;
      else if (m < 10) threshold = 0.28;
      else threshold = 0.22;

      // Position bonus — wider from late position
      if (position === 'BTN') threshold += 0.15;
      else if (position === 'CO') threshold += 0.10;
      else if (position === 'SB') threshold += 0.08;
      else if (position === 'BB' && toCall <= bigBlind) threshold += 0.20; // BB walks

      // Style adjustment
      if (p.style === 'LAG' || p.style === 'Maniac') threshold += 0.08;
      if (p.style === 'Nit') threshold -= 0.06;

      // ICM: tighter at bubble, wider with big stack
      if (isBubble) threshold -= 0.08;
      if (isFT && stackBB > 30) threshold += 0.05;

      // Unopened pot — jam
      if (toCall <= bigBlind && handVal <= threshold) {
        return { action: 'raise', amount: myChips }; // Shove
      }
      // Facing raise — call jam or fold
      if (toCall > 0) {
        const commitThreshold = m < 5 ? threshold + 0.05 : threshold - 0.05;
        if (handVal <= commitThreshold && toCall < myChips * 0.4) return { action: 'call' };
        if (cat === 'premium' || cat === 'strong') return { action: 'raise', amount: myChips };
        return { action: 'fold' };
      }
      return { action: 'fold' };
    }

    // ═══ DEEP STACK PLAY (M >= 12) ═══

    // No raise — open or fold
    if (toCall <= bigBlind) {
      const vpipThreshold = p.vpip + (rand - 0.5) * this.noise;
      if (handVal > vpipThreshold) return { action: 'fold' };

      // Always raise (no limp) for TAG/LAG
      if (p.pfr > 0 && handVal <= p.pfr + (rand - 0.5) * this.noise) {
        // Open sizing: 2.2-3x + 0.5x per limper
        const size = Math.floor(bigBlind * (2.2 + cryptoRandomFloat() * 0.6 + (playersInHand > 4 ? 0.5 : 0)));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      // Fish/stations limp
      if (p.style === 'STATION' || p.style === 'LIMPER') return { action: 'call' };
      if (p.style === 'Maniac' && rand < 0.6) {
        return { action: 'raise', amount: Math.min(Math.floor(bigBlind * (3 + cryptoRandomFloat() * 2)), myChips) };
      }
      return { action: 'fold' };
    }

    // ═══ FACING RAISE — 3-bet, call, or fold ═══
    const raiseBBs = toCall / bigBlind;
    const odds = potOdds(toCall, pot);
    const strength = 1 - handVal;

    // BB DEFENSE — defend wider from BB
    if (position === 'BB') {
      // Facing open (2-3x): defend ~45-50% of hands
      if (raiseBBs <= 3.5) {
        if (isIn3BetRange(holeCards[0], holeCards[1], 'BB')) {
          if (rand < (p.threeBet || 0.12) + 0.08) {
            const size = Math.floor(currentBet * (3 + cryptoRandomFloat() * 0.5));
            return { action: 'raise', amount: Math.min(size, myChips) };
          }
        }
        // Call with top 45% (BB defends wide)
        if (handVal <= 0.50 + (rand - 0.5) * 0.06) return { action: 'call' };
      }
      // Facing 3-bet in BB: tighter
      if (raiseBBs > 3.5 && raiseBBs <= 10) {
        if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
        if (cat === 'strong' && strength > odds + 0.03) return { action: 'call' };
        return { action: 'fold' };
      }
    }

    // SB DEFENSE — tighter than BB
    if (position === 'SB') {
      if (isIn3BetRange(holeCards[0], holeCards[1], 'SB')) {
        if (rand < (p.threeBet || 0.12) + 0.04) {
          const size = Math.floor(currentBet * (3.2 + cryptoRandomFloat() * 0.5));
          return { action: 'raise', amount: Math.min(size, myChips) };
        }
      }
      if (raiseBBs <= 3 && handVal <= 0.35 + (rand - 0.5) * 0.05) return { action: 'call' };
    }

    // 3-bet from other positions
    if (isIn3BetRange(holeCards[0], holeCards[1], position)) {
      if (rand < (p.threeBet || 0.10) + (rand - 0.5) * 0.04) {
        const size = Math.floor(currentBet * (2.8 + cryptoRandomFloat() * 0.5));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
    }

    // Premium always 3-bet
    if (cat === 'premium') {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), myChips) };
    }

    // Calling stations call everything
    if (p.style === 'STATION' && cat !== 'trash') return { action: 'call' };
    // Maniacs re-raise light
    if (p.style === 'Maniac' && rand < 0.30) {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
    }

    // Standard call/fold
    if (cat === 'strong' && strength > odds) return { action: 'call' };
    if (cat === 'medium') {
      if ((p.style === 'LAG' || p.style === 'SemiLAG') && strength > odds - 0.05) return { action: 'call' };
      if (strength > odds + 0.08) return { action: 'call' };
    }

    // ICM: fold marginals at bubble
    if (isBubble && cat === 'medium' && raiseBBs > 3) return { action: 'fold' };
    if (p.style === 'SCARED_MONEY' && raiseBBs > 3) return { action: 'fold' };

    return { action: 'fold' };
  }

  // ═══════════════════════════════════════
  // POSTFLOP
  // ═══════════════════════════════════════
  postflopDecision(gs, rand) {
    const { toCall } = gs;
    const strength = gs.handStrength || 0.5;
    const texture = boardTexture(gs.community);

    if (toCall === 0) return this.postflopCheck(gs, strength, texture, rand);
    return this.postflopFacingBet(gs, strength, texture, rand);
  }

  postflopCheck(gs, strength, texture, rand) {
    const { pot, myChips, stage, bigBlind } = gs;
    const p = this.profile;
    const af = p.af || 2.5;
    const isIP = gs.position === 'BTN' || gs.position === 'CO' || gs.position === 'HJ';
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;
    const spr = pot > 0 ? myChips / pot : 20;

    const aggrBoost = isFT ? 0.15 : isBubble ? -0.10 : 0;
    const ftSizeBoost = isFT ? 0.08 : 0;

    // SPR-aware sizing
    const baseSizing = spr < 2 ? 1.0 // Low SPR: just jam
      : spr < 4 ? 0.65 + cryptoRandomFloat() * 0.15
      : texture.wet > 0.5 ? 0.60 + cryptoRandomFloat() * 0.15 + ftSizeBoost
      : texture.wet > 0.3 ? 0.45 + cryptoRandomFloat() * 0.15 + ftSizeBoost
      : 0.28 + cryptoRandomFloat() * 0.10 + ftSizeBoost;

    // Low SPR: commit with any decent hand (pot-committed)
    if (spr < 2 && strength > 0.35) {
      return { action: 'raise', amount: myChips }; // Jam
    }

    // Monster: ALWAYS bet at FT, sometimes trap otherwise
    if (strength > 0.7) {
      if (!isFT && (p.style === 'LAG' || p.style === 'SemiLAG') && rand < 0.12) {
        return { action: 'check' }; // Trap
      }
      const sizing = isFT ? 0.75 + cryptoRandomFloat() * 0.25
        : strength > 0.85 ? 0.65 + cryptoRandomFloat() * 0.35 : baseSizing;
      return { action: 'raise', amount: Math.min(Math.floor(pot * sizing), myChips) };
    }

    // Strong: c-bet with texture-dependent frequency
    if (strength > 0.45) {
      const cbetFreq = texture.wet < 0.3 ? 0.78 : texture.wet < 0.5 ? 0.55 : 0.38;
      const boost = (af - 2) / 8 + aggrBoost;
      if (rand < cbetFreq + boost) {
        return { action: 'raise', amount: Math.min(Math.floor(pot * baseSizing), myChips) };
      }
      return { action: 'check' };
    }

    // Draw: semi-bluff
    if (strength > 0.25 && stage !== 'river') {
      const sbChance = isIP ? 0.35 : 0.18;
      if (rand < sbChance * (af / 3) + aggrBoost) {
        return { action: 'raise', amount: Math.min(Math.floor(pot * baseSizing), myChips) };
      }
      return { action: 'check' };
    }

    // Air: bluff dry boards, give up wet
    if (stage !== 'river') {
      const bluffChance = texture.wet < 0.3 ? (af - 1.5) / 7 + aggrBoost : (af - 2) / 15;
      if (rand < bluffChance) {
        return { action: 'raise', amount: Math.min(Math.floor(pot * baseSizing), myChips) };
      }
    }

    // River: thin value + bluffs
    if (stage === 'river') {
      if (strength > 0.35 && rand < 0.28 * (af / 3)) {
        return { action: 'raise', amount: Math.min(Math.floor(pot * 0.50), myChips) };
      }
      if (strength < 0.12 && rand < 0.10 * (af / 3) && p.style !== 'STATION') {
        return { action: 'raise', amount: Math.min(Math.floor(pot * 0.65), myChips) };
      }
    }

    // Delayed c-bet
    if (stage === 'turn' && strength > 0.30 && isIP && rand < 0.22) {
      return { action: 'raise', amount: Math.min(Math.floor(pot * 0.55), myChips) };
    }

    return { action: 'check' };
  }

  postflopFacingBet(gs, strength, texture, rand) {
    const { pot, toCall, myChips, currentBet, stage, bigBlind } = gs;
    const p = this.profile;
    const odds = potOdds(toCall, pot);
    const af = p.af || 2.5;
    const betSizePot = pot > 0 ? toCall / pot : 0;
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;
    const spr = pot > 0 ? myChips / pot : 20;
    const commitRatio = myChips > 0 ? toCall / myChips : 1;

    // Pot-committed: if calling costs >33% of stack, need to jam or fold
    if (commitRatio > 0.33 && strength > 0.50) {
      return { action: 'raise', amount: myChips }; // Jam — pot committed
    }

    // Monster: raise for value
    if (strength > 0.75) {
      const raiseFreq = isFT ? 0.78 : 0.55 + (af - 2) / 8;
      if (rand < raiseFreq) {
        const size = Math.floor(currentBet * (2.5 + cryptoRandomFloat() * 1.0));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      return { action: 'call' };
    }

    // Check-raise bluff on dry flops
    if (strength < 0.20 && texture.wet < 0.35 && stage === 'flop' && af > 3) {
      if (rand < 0.07) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), myChips) };
      }
    }

    // Strong: call/raise depending on texture
    if (strength > 0.55) {
      if (texture.wet > 0.5 && rand < 0.28 + (af - 2) / 10) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.5), myChips) };
      }
      return { action: 'call' };
    }

    // Medium: math-based call/fold
    if (strength > 0.40) {
      if (p.style === 'STATION') return { action: 'call' };
      // Fold to overbets with medium hands — mathematically correct
      if (betSizePot > 0.80 && strength < 0.50) return { action: 'fold' };
      // Bubble: fold medium hands in big pots (ICM)
      if (isBubble && commitRatio > 0.25 && strength < 0.55) return { action: 'fold' };
      if (strength > odds + 0.04) return { action: 'call' };
      return { action: 'fold' }; // Correct fold — not afraid, just math
    }

    // Draw: call/raise on flop/turn
    if (strength > 0.25 && stage !== 'river') {
      if (af > 3 && rand < 0.10 && strength > 0.28) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
      }
      if (p.style === 'STATION' || p.style === 'LAG' || p.style === 'Maniac') return { action: 'call' };
      if (strength > odds - 0.04) return { action: 'call' };
      return { action: 'fold' };
    }

    // River: selective calls
    if (stage === 'river') {
      if (p.style === 'STATION' && strength > 0.22) return { action: 'call' };
      if (betSizePot < 0.45 && strength > 0.33 && rand < 0.35) return { action: 'call' };
      // Hero call with bluff-catcher vs aggressive lines
      if (strength > 0.40 && betSizePot > 0.6 && rand < 0.15 * (af / 3)) return { action: 'call' };
    }

    if (p.style === 'SCARED_MONEY' && toCall > pot * 0.3) return { action: 'fold' };

    return { action: 'fold' };
  }
}

export { boardTexture };
