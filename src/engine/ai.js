// ai.js — Production AI: multi-street, range-aware, position-aware
// Simulates a realistic tournament reg with GTO foundation + exploitative adjustments
// Key features: hand history memory, c-bet by texture, barreling, purpose-driven sizing,
// IP/OOP awareness, SPR-based commitment, BB defense, ICM

import { getHandValue, isInOpenRange, isIn3BetRange, handCategory } from './ranges.js';
import { potOdds, mRatio as calcMRatio } from './equity.js';
import { cryptoRandomFloat } from './deck.js';

const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
const IP_POSITIONS = new Set(['BTN', 'CO', 'HJ']);

// ═══════════════════════════════════════
// Board Texture Analysis (richer than before)
// ═══════════════════════════════════════
function boardTexture(community) {
  if (!community || community.length === 0) return { wet: 0, paired: false, monotone: false, highCard: 0, category: 'none' };
  const validCards = community.filter(c => c && typeof c === 'string' && c.length >= 2);
  if (validCards.length === 0) return { wet: 0, paired: false, monotone: false, highCard: 0, category: 'none' };
  const suits = validCards.map(c => c[1]);
  const ranks = validCards.map(c => RV[c[0]] || 0).sort((a, b) => a - b);
  const paired = new Set(ranks).size < ranks.length;
  const sc = {};
  for (const s of suits) sc[s] = (sc[s] || 0) + 1;
  const maxSuit = Math.max(...Object.values(sc));
  const monotone = maxSuit >= 3;
  const flushDraw = maxSuit >= 2;
  let connected = 0;
  for (let i = 1; i < ranks.length; i++) if (ranks[i] - ranks[i - 1] <= 2) connected++;
  const highCard = ranks[ranks.length - 1];
  const broadway = ranks.filter(r => r >= 10).length;

  let wet = 0;
  if (flushDraw) wet += 0.3;
  if (monotone) wet += 0.2;
  if (connected >= 2) wet += 0.3;
  if (broadway >= 2) wet += 0.15;
  wet = Math.min(1, wet);

  // Board category for c-bet strategy
  let category;
  if (paired) category = 'paired';
  else if (monotone) category = 'monotone';
  else if (wet > 0.5) category = 'wet';
  else if (wet > 0.25) category = 'medium';
  else category = 'dry';

  return { wet, paired, monotone, flushDraw, connected, highCard, broadway, category };
}

// ═══════════════════════════════════════
// Purpose-Driven Sizing
// ═══════════════════════════════════════
function getSizing(purpose, pot, myChips) {
  let pct;
  switch (purpose) {
    case 'range_bet':   pct = 0.28 + cryptoRandomFloat() * 0.07; break;  // 28-35% pot
    case 'thin_value':  pct = 0.33 + cryptoRandomFloat() * 0.08; break;  // 33-41%
    case 'protection':  pct = 0.60 + cryptoRandomFloat() * 0.12; break;  // 60-72%
    case 'polarized':   pct = 0.75 + cryptoRandomFloat() * 0.15; break;  // 75-90%
    case 'overbet':     pct = 1.10 + cryptoRandomFloat() * 0.30; break;  // 110-140%
    case 'block_bet':   pct = 0.20 + cryptoRandomFloat() * 0.05; break;  // 20-25%
    default:            pct = 0.50 + cryptoRandomFloat() * 0.15; break;  // 50-65%
  }
  return Math.min(Math.floor(pot * pct), myChips);
}

// ═══════════════════════════════════════
// Was a specific card "good" for the aggressor's range?
// ═══════════════════════════════════════
function isTurnGoodForAggressor(turnCard, flopHighCard) {
  if (!turnCard) return false;
  const tv = RV[turnCard[0]] || 0;
  // Overcards are good for aggressor (open range has more broadways)
  if (tv >= 10) return true;
  // Ace is always good for preflop raiser
  if (tv === 14) return true;
  // Low card = brick = neutral-to-bad for aggressor
  return tv > flopHighCard;
}

export class BaseAI {
  constructor(profile) {
    this.profile = profile;
    this.noise = 0.04;
  }

  decide(gameState) {
    // Defensive: ensure all required fields exist
    const gs = gameState || {};
    if (!gs.holeCards || gs.holeCards.length < 2) {
      return gs.toCall > 0 ? { action: 'fold' } : { action: 'check' };
    }
    gs.community = gs.community || [];
    gs.pot = gs.pot || 0;
    gs.toCall = gs.toCall || 0;
    gs.myChips = gs.myChips || 1000;
    gs.bigBlind = gs.bigBlind || 200;
    gs.currentBet = gs.currentBet || 0;
    gs.playersInHand = gs.playersInHand || 2;
    gs.playersAtTable = gs.playersAtTable || 9;
    gs.position = gs.position || 'BTN';
    gs.handStrength = gs.handStrength ?? 0.5;
    gs.spr = gs.spr ?? (gs.pot > 0 ? gs.myChips / gs.pot : 20);
    gs.streetActions = gs.streetActions || [];

    const { stage } = gs;
    const rand = cryptoRandomFloat();
    if (stage === 'preflop') return this.preflopDecision(gs, rand);
    return this.postflopDecision(gs, rand);
  }

  // ═══════════════════════════════════════
  // PREFLOP — BB defense, stack awareness, ICM
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

    // ═══ PUSH/FOLD (M < 12) ═══
    if (m < 12) {
      let threshold;
      if (m < 3) threshold = 0.55;
      else if (m < 5) threshold = 0.42;
      else if (m < 7) threshold = 0.35;
      else if (m < 10) threshold = 0.28;
      else threshold = 0.22;

      if (position === 'BTN') threshold += 0.15;
      else if (position === 'CO') threshold += 0.10;
      else if (position === 'SB') threshold += 0.08;
      else if (position === 'BB' && toCall <= bigBlind) threshold += 0.20;

      if (p.style === 'LAG' || p.style === 'Maniac') threshold += 0.08;
      if (p.style === 'Nit') threshold -= 0.06;
      if (isBubble) threshold -= 0.10;
      if (isFT && stackBB > 30) threshold += 0.05;

      if (toCall <= bigBlind && handVal <= threshold) return { action: 'raise', amount: myChips };
      if (toCall > 0) {
        if (cat === 'premium' || cat === 'strong') return { action: 'raise', amount: myChips };
        if (m < 5 && handVal <= threshold + 0.05) return { action: 'call' };
        return { action: 'fold' };
      }
      return { action: 'fold' };
    }

    // ═══ DEEP STACK — Open or fold ═══
    if (toCall <= bigBlind) {
      const vpipThreshold = p.vpip + (rand - 0.5) * this.noise;
      if (handVal > vpipThreshold) return { action: 'fold' };

      if (p.pfr > 0 && handVal <= p.pfr + (rand - 0.5) * this.noise) {
        const size = Math.floor(bigBlind * (2.2 + cryptoRandomFloat() * 0.6 + (playersInHand > 4 ? 0.5 : 0)));
        return { action: 'raise', amount: Math.min(size, myChips) };
      }
      if (p.style === 'STATION' || p.style === 'LIMPER') return { action: 'call' };
      if (p.style === 'Maniac' && rand < 0.55) {
        return { action: 'raise', amount: Math.min(Math.floor(bigBlind * (3 + cryptoRandomFloat() * 2)), myChips) };
      }
      return { action: 'fold' };
    }

    // ═══ FACING RAISE — 3-bet, BB defense, call, fold ═══
    const raiseBBs = toCall / bigBlind;
    const odds = potOdds(toCall, pot);
    const strength = 1 - handVal;

    // BB DEFENSE (wide)
    if (position === 'BB') {
      if (raiseBBs <= 3.5) {
        if (isIn3BetRange(holeCards[0], holeCards[1], 'BB') && rand < (p.threeBet || 0.12) + 0.08) {
          return { action: 'raise', amount: Math.min(Math.floor(currentBet * (3 + cryptoRandomFloat() * 0.5)), myChips) };
        }
        if (handVal <= 0.50 + (rand - 0.5) * 0.06) return { action: 'call' };
      }
      if (raiseBBs > 3.5 && raiseBBs <= 10) {
        if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
        if (cat === 'strong' && strength > odds + 0.03) return { action: 'call' };
        return { action: 'fold' };
      }
    }

    // SB DEFENSE (tighter)
    if (position === 'SB') {
      if (isIn3BetRange(holeCards[0], holeCards[1], 'SB') && rand < (p.threeBet || 0.12) + 0.04) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * (3.2 + cryptoRandomFloat() * 0.5)), myChips) };
      }
      if (raiseBBs <= 3 && handVal <= 0.35) return { action: 'call' };
    }

    // 3-bet from other positions
    if (isIn3BetRange(holeCards[0], holeCards[1], position) && rand < (p.threeBet || 0.10)) {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.8 + cryptoRandomFloat() * 0.5)), myChips) };
    }
    if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), myChips) };
    if (p.style === 'STATION' && cat !== 'trash') return { action: 'call' };
    if (p.style === 'Maniac' && rand < 0.28) {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
    }
    if (cat === 'strong' && strength > odds) return { action: 'call' };
    if (cat === 'medium' && strength > odds + 0.06) return { action: 'call' };
    if (isBubble && raiseBBs > 3) return { action: 'fold' };
    return { action: 'fold' };
  }

  // ═══════════════════════════════════════
  // POSTFLOP — Multi-street aware
  // ═══════════════════════════════════════
  postflopDecision(gs, rand) {
    const { toCall } = gs;
    const strength = gs.handStrength || 0.5;
    const texture = boardTexture(gs.community);
    const isIP = IP_POSITIONS.has(gs.position);
    const spr = gs.spr || (gs.pot > 0 ? gs.myChips / gs.pot : 20);
    const isAggressor = gs.isAggressor;

    if (toCall === 0) return this.postflopAct(gs, strength, texture, rand, isIP, spr, isAggressor);
    return this.postflopFacingBet(gs, strength, texture, rand, isIP, spr, isAggressor);
  }

  // ═══ CHECKED TO US (or we're first to act) ═══
  postflopAct(gs, strength, texture, rand, isIP, spr, isAggressor) {
    const { pot, myChips, stage } = gs;
    const p = this.profile;
    const af = p.af || 2.5;
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;

    // SPR < 2: pot-committed, jam with any decent hand
    if (spr < 2 && strength > 0.35) {
      return { action: 'raise', amount: myChips };
    }

    // ═══ MONSTER (strength > 0.7) ═══
    if (strength > 0.7) {
      // Final table: NEVER slow-play, max value
      if (isFT) {
        const sizing = getSizing(strength > 0.85 ? 'polarized' : 'protection', pot, myChips);
        return { action: 'raise', amount: sizing };
      }
      // OOP: sometimes check-raise trap (12%)
      if (!isIP && rand < 0.12 && p.style !== 'STATION') {
        return { action: 'check' }; // Planning check-raise
      }
      const sizing = getSizing(strength > 0.85 ? 'polarized' : 'protection', pot, myChips);
      return { action: 'raise', amount: sizing };
    }

    // ═══ C-BET STRATEGY (aggressor on flop) ═══
    if (isAggressor && stage === 'flop') {
      let cbetFreq, purpose;
      switch (texture.category) {
        case 'dry':      cbetFreq = 0.90; purpose = 'range_bet'; break;     // K72r: bet entire range small
        case 'paired':   cbetFreq = 0.80; purpose = 'range_bet'; break;     // KK4: bet most range small
        case 'medium':   cbetFreq = 0.55; purpose = 'thin_value'; break;    // QJ4tt: selective
        case 'wet':      cbetFreq = 0.35; purpose = 'protection'; break;    // JT9ss: only strong + some draws
        case 'monotone': cbetFreq = 0.30; purpose = 'protection'; break;    // All hearts: very selective
        default:         cbetFreq = 0.55; purpose = 'thin_value'; break;
      }

      // Adjust for strength: always c-bet strong, sometimes c-bet air
      if (strength > 0.45) cbetFreq = Math.min(1.0, cbetFreq + 0.20);
      if (strength < 0.20) cbetFreq = Math.max(0.05, cbetFreq - 0.15);

      // Style adjustment
      const styleBoost = (af - 2.5) / 6;
      const bubbleAdj = isBubble ? -0.10 : 0;

      if (rand < cbetFreq + styleBoost + bubbleAdj) {
        return { action: 'raise', amount: getSizing(purpose, pot, myChips) };
      }
      return { action: 'check' };
    }

    // ═══ BARRELING (aggressor on turn/river after c-betting) ═══
    if (isAggressor && stage === 'turn' && gs.didCbetFlop) {
      const turnCard = gs.community?.[3];
      const goodTurn = turnCard ? isTurnGoodForAggressor(turnCard, texture.highCard) : false;

      if (strength > 0.50) {
        // Strong hand: barrel for value
        const purpose = goodTurn ? 'protection' : 'thin_value';
        if (rand < 0.70) return { action: 'raise', amount: getSizing(purpose, pot, myChips) };
      }
      if (strength > 0.25 && goodTurn) {
        // Draw or medium on good card: barrel as semi-bluff
        if (rand < 0.45 + (af - 2) / 8) return { action: 'raise', amount: getSizing('protection', pot, myChips) };
      }
      if (strength < 0.15 && rand < 0.18 * (af / 3)) {
        // Bluff barrel on good turn card
        if (goodTurn) return { action: 'raise', amount: getSizing('polarized', pot, myChips) };
      }
      return { action: 'check' }; // Give up or pot control
    }

    // River as aggressor (triple barrel)
    if (isAggressor && stage === 'river' && gs.didBetTurn) {
      if (strength > 0.55) {
        // Value: bet for max value
        return { action: 'raise', amount: getSizing(strength > 0.75 ? 'polarized' : 'thin_value', pot, myChips) };
      }
      if (strength < 0.15 && rand < 0.22 * (af / 3) && p.style !== 'STATION') {
        // Bluff: complete the story
        return { action: 'raise', amount: getSizing('polarized', pot, myChips) };
      }
      return { action: 'check' };
    }

    // ═══ NON-AGGRESSOR POSTFLOP ═══
    if (strength > 0.50) {
      // Strong but not aggressor: donk bet sometimes, or check to trap
      if (isIP && rand < 0.15) {
        return { action: 'raise', amount: getSizing('thin_value', pot, myChips) };
      }
      // OOP: check to aggressor (let them c-bet into us)
      return { action: 'check' };
    }

    // Probe bet: non-aggressor bets after aggressor checks
    if (isIP && stage === 'turn' && !gs.didCbetFlop && strength > 0.30 && rand < 0.25) {
      // Delayed probe when aggressor showed weakness
      return { action: 'raise', amount: getSizing('thin_value', pot, myChips) };
    }

    // Draw: semi-bluff from IP
    if (strength > 0.25 && stage !== 'river' && isIP && rand < 0.20) {
      return { action: 'raise', amount: getSizing('protection', pot, myChips) };
    }

    // River: thin value or bluff
    if (stage === 'river') {
      if (strength > 0.35 && rand < 0.22 * (af / 3)) {
        return { action: 'raise', amount: getSizing('thin_value', pot, myChips) };
      }
      if (strength < 0.10 && rand < 0.08 * (af / 3) && p.style !== 'STATION') {
        return { action: 'raise', amount: getSizing('polarized', pot, myChips) };
      }
    }

    return { action: 'check' };
  }

  // ═══ FACING A BET — EV-based decisions ═══
  postflopFacingBet(gs, strength, texture, rand, isIP, spr, isAggressor) {
    const { pot, toCall, myChips, currentBet, stage } = gs;
    const p = this.profile;
    const odds = potOdds(toCall, pot);
    const af = p.af || 2.5;
    const betSizePot = pot > 0 ? toCall / pot : 0;
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;
    const commitRatio = myChips > 0 ? toCall / myChips : 1;

    // EV calculation — core of every decision
    const evOfCall = strength * (pot + toCall) - (1 - strength) * toCall;

    // Pot-committed: jam if committing >33% with decent hand
    if (commitRatio > 0.33 && strength > 0.50) {
      return { action: 'raise', amount: myChips };
    }

    // SPR < 2: commit or fold
    if (spr < 2) {
      if (strength > 0.40) return { action: 'raise', amount: myChips };
      return { action: 'fold' };
    }

    // ═══ MONSTER: raise for value ═══
    if (strength > 0.75) {
      const raiseFreq = isFT ? 0.80 : 0.55 + (af - 2) / 8;
      if (rand < raiseFreq) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
      }
      return { action: 'call' }; // Slowplay
    }

    // ═══ CHECK-RAISE (OOP with strong hand or as bluff) ═══
    if (!isIP && !isAggressor) {
      // Check-raise bluff on dry flops (7%)
      if (strength < 0.18 && texture.category === 'dry' && stage === 'flop' && af > 2.5 && rand < 0.07) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), myChips) };
      }
      // Check-raise value with strong hand OOP (25%)
      if (strength > 0.60 && rand < 0.25) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
      }
    }

    // ═══ STRONG: call, raise on wet for protection ═══
    if (strength > 0.55) {
      if (texture.wet > 0.5 && rand < 0.25 + (af - 2) / 10) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.5), myChips) };
      }
      return { action: 'call' };
    }

    // ═══ MEDIUM: EV-based call/fold ═══
    if (strength > 0.40) {
      if (p.style === 'STATION') return { action: 'call' };
      // Fold medium vs overbets — correct, not scared
      if (betSizePot > 0.80 && strength < 0.50) return { action: 'fold' };
      // Bubble ICM: fold medium in big pots (chips worth 1.5x)
      if (isBubble && commitRatio > 0.25 && evOfCall < toCall * 0.3) return { action: 'fold' };
      // EV-based: only call when +EV
      if (evOfCall > 0) return { action: 'call' };
      // Slightly -EV but good implied odds (not river)
      if (stage !== 'river' && evOfCall > -toCall * 0.1) return { action: 'call' };
      return { action: 'fold' };
    }

    // ═══ DRAW: EV-based call/raise on flop/turn ═══
    if (strength > 0.25 && stage !== 'river') {
      // Semi-bluff raise IP (8%)
      if (isIP && af > 2.5 && rand < 0.08 && strength > 0.28) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
      }
      if (p.style === 'STATION' || p.style === 'LAG' || p.style === 'Maniac') return { action: 'call' };
      // Call draws with +EV or near-zero EV (implied odds)
      if (evOfCall > -toCall * 0.15) return { action: 'call' };
      return { action: 'fold' };
    }

    // ═══ RIVER: selective hero-calls ═══
    if (stage === 'river') {
      if (p.style === 'STATION' && strength > 0.22) return { action: 'call' };
      // Small river bet: call with showdown value (bluff-catch)
      if (betSizePot < 0.45 && strength > 0.33 && rand < 0.30) return { action: 'call' };
      // Hero call vs polarizing big bets with bluff-catcher (12%)
      if (strength > 0.40 && betSizePot > 0.6 && rand < 0.12 * (af / 3)) return { action: 'call' };
    }

    if (p.style === 'SCARED_MONEY' && toCall > pot * 0.3) return { action: 'fold' };
    return { action: 'fold' };
  }
}

export { boardTexture, getSizing, isTurnGoodForAggressor };
