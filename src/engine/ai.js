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
function getSizing(purpose, pot, myChips, isIP) {
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
  // OOP bets 15% bigger to compensate position disadvantage
  if (isIP === false) pct *= 1.15;
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
  // PREFLOP — Real MTT statistics based
  // Average MTT stats: VPIP 21%, PFR 17%, 3-bet 6.5%, BB def 33%, WTSD 27%
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
    const stage = gs.tournamentStage || 'early'; // early, middle, late, bubble, final_table

    // Tournament stage adjustments — tighter early, looser late
    const stageAdj = stage === 'early' ? -0.06 :    // early: play tighter (preserve stack)
      stage === 'middle' ? 0 :                        // middle: standard
      stage === 'late' ? 0.04 :                       // late: steal more (antes matter)
      isBubble ? -0.10 :                              // bubble: survival mode
      isFT ? 0.02 : 0;                               // FT: ICM but pay jumps matter

    // Multiway tightening: each extra player in pot
    const mwPenalty = Math.max(0, (playersInHand - 2) * 0.04);

    // ═══ SHORT STACK BEHAVIOR — realistic human patterns ═══
    if (m < 15) {
      const isShort = m < 8;
      const isDesperate = m < 3;
      const isPanic = m < 5;

      // === JAM THRESHOLDS by M and position ===
      let pushThreshold;
      if (isDesperate) pushThreshold = 0.65;     // M<3: push very wide (any face card, any suited, pairs)
      else if (isPanic) pushThreshold = 0.45;     // M<5: push wide
      else if (m < 7) pushThreshold = 0.35;
      else if (m < 10) pushThreshold = 0.28;
      else pushThreshold = 0.22;                  // M10-15: standard

      // Position bonus — late = wider
      if (position === 'BTN') pushThreshold += 0.18;
      else if (position === 'CO') pushThreshold += 0.12;
      else if (position === 'SB') pushThreshold += 0.10;
      else if (position === 'BB' && toCall <= bigBlind) pushThreshold += 0.15;

      // Style adjustments
      if (p.style === 'LAG' || p.style === 'Maniac') pushThreshold += 0.08;
      if (p.style === 'Nit') pushThreshold -= 0.10;
      if (p.style === 'SCARED_MONEY') pushThreshold -= 0.12;

      // Tournament context
      if (isBubble) pushThreshold -= 0.15; // tighter on bubble
      if (isFT && stackBB > 25) pushThreshold += 0.05;

      // Human error: 10% push too loose, 10% fold too tight
      if (p.style !== 'TAG' && p.style !== 'Nit') {
        if (rand < 0.10) pushThreshold += 0.10;
        else if (rand > 0.90) pushThreshold -= 0.10;
      }

      // Re-steal: facing late position open from blinds → push wider
      if (m >= 8 && m <= 15 && toCall > bigBlind && toCall <= bigBlind * 4) {
        const facingLate = gs.facingAction?.position === 'BTN' || gs.facingAction?.position === 'CO';
        if (facingLate && (position === 'BB' || position === 'SB')) pushThreshold += 0.10;
      }

      // === FISH SHORT STACK PATTERNS ===
      if (p.style === 'STATION' || p.style === 'LIMPER' || p.style === 'Maniac') {
        // Fish panic: push any ace, any pair, any suited king on short stack
        const r1 = holeCards[0][0], r2 = holeCards[1][0];
        const hasAce = r1 === 'A' || r2 === 'A';
        const hasPair = r1 === r2;
        const hasSuitedKing = (r1 === 'K' || r2 === 'K') && holeCards[0][1] === holeCards[1][1];
        if (isPanic && (hasAce || hasPair || hasSuitedKing)) {
          pushThreshold = Math.max(pushThreshold, 0.70); // push these always when desperate
        }
        // Fish "limp-shove" with premium on short stack (20%)
        if (m < 8 && toCall <= bigBlind && cat === 'premium' && rand < 0.20) {
          return { action: 'call' }; // limp → if raised, will push (handled by facing raise)
        }
      }

      // === OPEN JAM (folded to us) ===
      if (toCall <= bigBlind && handVal <= pushThreshold) {
        return { action: 'raise', amount: myChips };
      }

      // === RESHOVE (facing raise — jam over the top) ===
      if (toCall > bigBlind) {
        // Premium/strong: always jam
        if (cat === 'premium' || (cat === 'strong' && isShort)) {
          return { action: 'raise', amount: myChips };
        }
        // Medium+ hands: jam if short enough and hand in range
        if (isPanic && handVal <= pushThreshold + 0.05) {
          return { action: 'raise', amount: myChips };
        }
        // Call with medium when very short (can't fold into oblivion)
        if (isDesperate && handVal <= 0.50) return { action: 'call' };
        if (isPanic && cat === 'strong') return { action: 'call' };
        return { action: 'fold' };
      }
      return { action: 'fold' };
    }

    // ═══ DEEP STACK — Open raise or fold (no limp for regs) ═══
    if (toCall <= bigBlind) {
      // GTO position thresholds from ranges.js scaled by style
      // Real MTT open ranges: UTG ~13%, MP ~18%, HJ ~24%, CO ~32%, BTN ~42%, SB ~36%
      const gtoOpenThreshold = {
        UTG: 0.15, 'UTG+1': 0.18, MP: 0.22, HJ: 0.30, CO: 0.42, BTN: 0.55, SB: 0.45
      };
      const baseThreshold = gtoOpenThreshold[position] || 0.30;
      // Scale by style: Nit=0.65x, TAG=0.85x, SemiLAG=1.0x, LAG=1.15x, Maniac=1.4x
      // BTN/SB steal wider (#9): extra scale for steal positions
      const stealBonus = (position === 'BTN' || position === 'SB') ? 0.10 : 0;
      const styleScale = (p.style === 'Nit' ? 0.70 : p.style === 'TAG' ? 1.05 :
        p.style === 'SemiLAG' ? 1.10 : p.style === 'LAG' ? 1.35 :
        p.style === 'Maniac' ? 1.50 : p.style === 'STATION' ? 1.30 :
        p.style === 'LIMPER' ? 1.40 : p.style === 'SCARED_MONEY' ? 0.75 : 1.0) + stealBonus;
      const openThreshold = baseThreshold * styleScale + stageAdj + (rand - 0.5) * this.noise;

      if (handVal > openThreshold) return { action: 'fold' };

      // Fish limp with medium, raise premium
      if (p.style === 'STATION' || p.style === 'LIMPER') {
        if (handVal <= baseThreshold * 0.4) {
          return { action: 'raise', amount: Math.min(Math.floor(bigBlind * (2.2 + cryptoRandomFloat() * 0.5)), myChips) };
        }
        return { action: 'call' }; // limp
      }
      if (p.style === 'Maniac' && rand < 0.50) {
        return { action: 'raise', amount: Math.min(Math.floor(bigBlind * (2.5 + cryptoRandomFloat() * 1.5)), myChips) };
      }
      // Isolation raise vs limpers (#8): 4-6x BB instead of 2.2x
      const limpers = playersInHand > 2 ? playersInHand - 2 : 0;
      let size;
      if (limpers > 0 && (p.style === 'TAG' || p.style === 'LAG' || p.style === 'SemiLAG')) {
        size = Math.floor(bigBlind * (4 + limpers)); // iso: 4x + 1x per limper
      } else {
        size = Math.floor(bigBlind * (2.2 + cryptoRandomFloat() * 0.5));
      }
      return { action: 'raise', amount: Math.min(size, myChips) };
    }

    // ═══ FACING RAISE — style-dependent defense ═══
    const raiseBBs = toCall / bigBlind;
    const odds = potOdds(toCall, pot);
    const strength = 1 - handVal;

    // 4-bet / 5-bet detection — cap at all-in, no crazy sizing
    const is4Bet = currentBet > bigBlind * 8;
    const is5Bet = currentBet > bigBlind * 20;
    if (is5Bet) {
      // Facing 5-bet: only AA/KK jam, everything else fold
      if (cat === 'premium' && handVal <= 0.04) return { action: 'raise', amount: myChips };
      if (cat === 'premium' && handVal <= 0.06) return { action: 'call' };
      return { action: 'fold' };
    }
    if (is4Bet) {
      if (cat === 'premium' && handVal <= 0.04) return { action: 'raise', amount: myChips }; // 5-bet jam AA/KK
      if (cat === 'premium' && handVal <= 0.08) return { action: 'call' }; // QQ, AKs flat
      return { action: 'fold' };
    }

    // Reasonable raise sizing cap: don't 3-bet more than 25% of stack in deep play
    const maxRaiseSize = Math.min(myChips, Math.max(Math.floor(myChips * 0.25), bigBlind * 12));

    // BB DEFENSE — GTO: ~40% vs 2.5x open, style-scaled
    if (position === 'BB') {
      const bbScale = p.style === 'STATION' ? 1.3 : p.style === 'Nit' ? 0.50 :
        p.style === 'LAG' ? 1.1 : p.style === 'Maniac' ? 1.35 :
        p.style === 'SCARED_MONEY' ? 0.45 : p.style === 'LIMPER' ? 1.2 :
        0.85; // TAG/SemiLAG = ~34% defense
      const bbDefThreshold = 0.60 * bbScale + stageAdj; // stage-adjusted

      if (raiseBBs <= 3.5) {
        if (isIn3BetRange(holeCards[0], holeCards[1], 'BB') && rand < (p.threeBet || 0.08)) {
          return { action: 'raise', amount: Math.min(Math.floor(currentBet * (3 + cryptoRandomFloat() * 0.5)), maxRaiseSize || myChips) };
        }
        const adjWidth = bbDefThreshold - mwPenalty * 3;
        if (handVal <= adjWidth + (rand - 0.5) * 0.04) return { action: 'call' };
      }
      if (raiseBBs > 3.5 && raiseBBs <= 10) {
        if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
        if (cat === 'strong' && strength > odds + 0.05) return { action: 'call' };
        return { action: 'fold' };
      }
      return { action: 'fold' };
    }

    // SB DEFENSE — tighter: ~24% (OOP, no closing action)
    if (position === 'SB') {
      const sbScale = p.style === 'STATION' ? 1.2 : p.style === 'Nit' ? 0.45 :
        p.style === 'LAG' ? 1.0 : 0.75;
      const sbDefThreshold = 0.45 * sbScale;

      if (isIn3BetRange(holeCards[0], holeCards[1], 'SB') && rand < (p.threeBet || 0.08) + 0.02) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * (3.2 + cryptoRandomFloat() * 0.5)), myChips) };
      }
      if (raiseBBs <= 3 && handVal <= sbDefThreshold - mwPenalty * 3) return { action: 'call' };
      if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), maxRaiseSize || myChips) };
      return { action: 'fold' };
    }

    // 3-bet from other positions — tighter, position-aware
    if (isIn3BetRange(holeCards[0], holeCards[1], position) && rand < (p.threeBet || 0.06)) {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.8 + cryptoRandomFloat() * 0.5)), myChips) };
    }
    if (cat === 'premium') return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), maxRaiseSize || myChips) };

    // Cold call range — tighter than opening. Use position-aware thresholds.
    // IP (BTN/CO) can call wider, EP very tight
    const posCallBase = { UTG: 0.10, 'UTG+1': 0.12, MP: 0.15, HJ: 0.22, CO: 0.30, BTN: 0.38 };
    const ccBase = posCallBase[position] || 0.20;
    const ccScale = p.style === 'STATION' ? 1.4 : p.style === 'Maniac' ? 1.2 :
      p.style === 'LAG' ? 1.1 : p.style === 'Nit' ? 0.5 : p.style === 'SCARED_MONEY' ? 0.55 : 0.80;
    const adjColdCall = ccBase * ccScale + stageAdj - mwPenalty * 3;

    if (p.style === 'Maniac' && rand < 0.20) {
      return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
    }
    if (handVal <= adjColdCall && strength > odds) return { action: 'call' };
    if (isBubble && raiseBBs > 3) return { action: 'fold' };
    return { action: 'fold' };
  }

  // ═══════════════════════════════════════
  // POSTFLOP — Multi-street, draw-aware, pot-odds based
  // ═══════════════════════════════════════
  postflopDecision(gs, rand) {
    const { toCall } = gs;
    const strength = gs.handStrength || 0.5;
    const texture = boardTexture(gs.community);
    const isIP = IP_POSITIONS.has(gs.position);
    const spr = gs.spr || (gs.pot > 0 ? gs.myChips / gs.pot : 20);
    const isAggressor = gs.isAggressor;

    // Draw equity calculation (rule of 2/4)
    const hi = gs.handInfo || {};
    const drawOuts = hi.drawOuts || 0;
    const streetsLeft = gs.stage === 'flop' ? 2 : gs.stage === 'turn' ? 1 : 0;
    // Rule of 2 (one street) or rule of 4 (two streets, only if can see both)
    const drawEquity = drawOuts > 0 ? Math.min(0.60, drawOuts * (streetsLeft >= 2 && toCall === 0 ? 4 : 2) / 100) : 0;
    // Combine made hand equity with draw equity
    const totalEquity = Math.min(0.95, strength + drawEquity * (1 - strength));

    gs._drawEquity = drawEquity;
    gs._totalEquity = totalEquity;
    gs._drawOuts = drawOuts;

    // Short stack postflop: committed = jam with any piece
    const stackBBs = gs.myChips / Math.max(gs.bigBlind || 1, 1);
    if (stackBBs < 15 && spr < 3) {
      // Pot-committed: jam with any pair, any draw, any piece of the board
      if (strength > 0.30 || drawOuts >= 6) {
        return { action: 'raise', amount: gs.myChips };
      }
      // Fish: jam with anything when desperate (SPR < 1.5)
      if (spr < 1.5 && (this.profile.style === 'STATION' || this.profile.style === 'Maniac')) {
        if (strength > 0.15) return { action: 'raise', amount: gs.myChips };
      }
      // Facing bet with short stack: call or fold, no floating
      if (toCall > 0 && strength > 0.35) return { action: 'raise', amount: gs.myChips };
      if (toCall > 0 && strength < 0.20) return { action: 'fold' };
    }

    if (toCall === 0) return this.postflopAct(gs, strength, texture, rand, isIP, spr, isAggressor);
    return this.postflopFacingBet(gs, strength, texture, rand, isIP, spr, isAggressor);
  }

  // Fish-specific overrides (Item 4: realistic fish patterns)
  fishOverride(gs, strength, rand) {
    const p = this.profile;
    if (p.style !== 'STATION' && p.style !== 'LIMPER' && p.style !== 'Maniac') return null;
    const hi = gs.handInfo || {};
    const mh = hi.madeHand || '';
    const { stage, pot, myChips, bigBlind } = gs;
    const bb = bigBlind || 200;

    // Min-raise river with nuts (30%) — "I want you to call"
    if (stage === 'river' && (mh === 'flush' || mh === 'full_house' || mh === 'straight' || mh === 'set' || mh === 'quads') && rand < 0.30) {
      return { action: 'raise', amount: Math.min((gs.currentBet || 0) + bb, myChips) };
    }
    // Donk overbet with set/two_pair on flop (25%)
    if (stage === 'flop' && !gs.isAggressor && (mh === 'set' || mh === 'two_pair') && rand < 0.25) {
      return { action: 'raise', amount: Math.min(Math.floor(pot * 1.5), myChips) };
    }
    // Passive call everything then raise river with strong (15%)
    if (stage === 'river' && gs.toCall > 0 && (mh === 'flush' || mh === 'straight' || mh === 'set') && rand < 0.15) {
      return { action: 'raise', amount: Math.min(Math.floor(pot * 0.8), myChips) };
    }
    return null;
  }

  // ═══ CHECKED TO US (or we're first to act) ═══
  postflopAct(gs, strength, texture, rand, isIP, spr, isAggressor) {
    // Fish pattern override
    const fishAction = this.fishOverride(gs, strength, rand);
    if (fishAction) return fishAction;

    const { pot, myChips, stage } = gs;
    const p = this.profile;
    const af = p.af || 2.5;
    const isFT = gs.isFinalTable;
    const tStage = gs.tournamentStage || 'early';

    // Tournament stage postflop adjustment
    // Early: play cautiously (deep stacked, chip preservation)
    // Late/Bubble: play tighter postflop (survival > pots)
    const postflopTightness = tStage === 'early' ? 0.03 :
      tStage === 'late' ? 0.02 : gs.isBubble ? 0.05 : 0;
    const multiway = (gs.playersInHand || 2) > 2;
    const hi = gs.handInfo || {}; // structured hand info
    const hasDraw = hi.drawType && hi.drawOuts > 0;
    const isBubble = gs.isBubble;

    // SPR < 2: pot-committed, jam with any decent hand
    if (spr < 2 && strength > 0.35) {
      return { action: 'raise', amount: myChips };
    }

    // ═══ MONSTER (strength > 0.7) ═══
    if (strength > 0.7) {
      // Final table: NEVER slow-play, max value
      if (isFT) {
        const sizing = getSizing(strength > 0.85 ? 'polarized' : 'protection', pot, myChips, isIP);
        return { action: 'raise', amount: sizing };
      }
      // OOP: sometimes check-raise trap (12%)
      if (!isIP && rand < 0.12 && p.style !== 'STATION') {
        return { action: 'check' }; // Planning check-raise
      }
      const sizing = getSizing(strength > 0.85 ? 'polarized' : 'protection', pot, myChips, isIP);
      return { action: 'raise', amount: sizing };
    }

    // ═══ C-BET STRATEGY (aggressor on flop) ═══
    if (isAggressor && stage === 'flop') {
      let cbetFreq, purpose;
      if (multiway) {
        // Multiway: c-bet much less, only strong hands, no bluffs
        cbetFreq = strength > 0.55 ? 0.60 : strength > 0.40 ? 0.25 : 0.05;
        purpose = 'protection';
      } else switch (texture.category) {
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

      if (rand < cbetFreq + styleBoost + bubbleAdj - postflopTightness) {
        return { action: 'raise', amount: getSizing(purpose, pot, myChips, isIP) };
      }
      return { action: 'check' };
    }

    // ═══ BARRELING (aggressor on turn/river after c-betting) ═══
    if (isAggressor && stage === 'turn' && gs.didCbetFlop) {
      const turnCard = gs.community?.[3];
      const goodTurn = turnCard ? isTurnGoodForAggressor(turnCard, texture.highCard) : false;

      // Range narrowing: after flop cbet called, only ~40% of range continues
      if (strength > 0.50 || (hasDraw && hi.drawOuts >= 8)) {
        // Strong hands + good draws: barrel
        const purpose = goodTurn ? 'protection' : 'thin_value';
        if (rand < 0.70) return { action: 'raise', amount: getSizing(purpose, pot, myChips, isIP) };
      }
      if (strength > 0.35 && strength <= 0.50) {
        // Medium hands: pot control (check for deception / protect stack)
        if (goodTurn && rand < 0.30) return { action: 'raise', amount: getSizing('thin_value', pot, myChips, isIP) };
        return { action: 'check' }; // Pot control with medium
      }
      if (strength < 0.15 && goodTurn && rand < 0.22 * (af / 3)) {
        // Bluff barrel on good card (balanced with value bets)
        const bluffBoost = hi.hasBlockers ? 1.4 : 1.0;
        if (rand < 0.22 * (af / 3) * bluffBoost) {
          return { action: 'raise', amount: getSizing('polarized', pot, myChips, isIP) };
        }
      }
      return { action: 'check' };
    }

    // River as aggressor (triple barrel)
    if (isAggressor && stage === 'river' && gs.didBetTurn) {
      if (strength > 0.55) {
        // Value: bet for max value
        return { action: 'raise', amount: getSizing(strength > 0.75 ? 'polarized' : 'thin_value', pot, myChips, isIP) };
      }
      if (strength < 0.15 && rand < 0.22 * (af / 3) && p.style !== 'STATION') {
        // Bluff: complete the story
        return { action: 'raise', amount: getSizing('polarized', pot, myChips, isIP) };
      }
      return { action: 'check' };
    }

    // ═══ NON-AGGRESSOR POSTFLOP ═══
    if (strength > 0.50) {
      // Strong but not aggressor: donk bet sometimes, or check to trap
      if (isIP && rand < 0.15) {
        return { action: 'raise', amount: getSizing('thin_value', pot, myChips, isIP) };
      }
      // OOP: check to aggressor (let them c-bet into us)
      return { action: 'check' };
    }

    // Probe bet: non-aggressor bets after aggressor checks
    if (isIP && stage === 'turn' && !gs.didCbetFlop && strength > 0.30 && rand < 0.25) {
      // Delayed probe when aggressor showed weakness
      return { action: 'raise', amount: getSizing('thin_value', pot, myChips, isIP) };
    }

    // Draw: semi-bluff with EV-awareness
    if (hasDraw && stage !== 'river' && !multiway) {
      const drawOuts = hi.drawOuts || 0;
      // Semi-bluff freq by draw strength (fold equity makes this +EV)
      const baseSemiFreq = drawOuts >= 12 ? 0.60 : drawOuts >= 8 ? 0.40 : drawOuts >= 4 ? 0.12 : 0.05;
      const posBonus = isIP ? 0.08 : -0.05;
      const afBonus = (af - 2.5) / 12;
      const semiFreq = Math.max(0, baseSemiFreq + posBonus + afBonus);

      if (rand < semiFreq) {
        // Size by draw strength: bigger with stronger draws (more fold equity needed for weak draws)
        const sizing = drawOuts >= 12 ? 'polarized' : drawOuts >= 8 ? 'protection' : 'thin_value';
        return { action: 'raise', amount: getSizing(sizing, pot, myChips, isIP) };
      }
      return { action: 'check' };
    }

    // Non-aggressor OOP: donk bet on boards favoring defender's range
    if (!isAggressor && !isIP && stage === 'flop' && !multiway) {
      const boardFavorsDefender = texture.highCard <= 8 && texture.connected >= 2;
      if (boardFavorsDefender && strength > 0.45 && rand < 0.28) {
        return { action: 'raise', amount: getSizing('protection', pot, myChips, isIP) };
      }
    }

    // Probe bet: aggressor checked = capped range
    if (isIP && !isAggressor && stage === 'turn' && strength > 0.32 && rand < 0.38) {
      return { action: 'raise', amount: getSizing('thin_value', pot, myChips, isIP) };
    }

    // River: hand-dependent sizing (Item 1 + Item 3: sizing tells + merge bets)
    if (stage === 'river') {
      const mh = hi.madeHand || 'high_card';

      // MONSTER value: overbet or polarized (set+, flush, straight, full house)
      if (mh === 'set' || mh === 'flush' || mh === 'full_house' || mh === 'straight' || mh === 'quads' || mh === 'straight_flush') {
        const valueBetFreq = isIP ? 0.65 : 0.50;
        if (rand < valueBetFreq * (af / 3)) {
          // TAG/LAG overbet 15% with monsters
          const useOverbet = (p.style === 'TAG' || p.style === 'LAG') && rand < 0.15;
          return { action: 'raise', amount: getSizing(useOverbet ? 'overbet' : 'polarized', pot, myChips, isIP) };
        }
      }
      // STRONG value: TPTK, overpair → standard protection sizing (55-67%)
      if ((mh === 'top_pair' && hi.kicker === 'top') || mh === 'overpair' || mh === 'two_pair') {
        const valueBetFreq = isIP ? 0.55 : 0.40;
        if (rand < valueBetFreq * (af / 3)) {
          return { action: 'raise', amount: getSizing('protection', pot, myChips, isIP) };
        }
      }
      // MEDIUM: merge/block bet — top pair weak kicker, mid pair, bottom pair (25-33%)
      if (strength > 0.35 && strength <= 0.55) {
        if (mh === 'top_pair' || mh === 'middle_pair' || mh === 'bottom_pair' || mh === 'underpair') {
          if (rand < 0.45) {
            return { action: 'raise', amount: getSizing('block_bet', pot, myChips, isIP) };
          }
        }
      }
      // BLUFF: polarized sizing (75-100%) — need folds
      const bluffBase = p.style === 'TAG' ? 0.14 : p.style === 'LAG' ? 0.20 :
        p.style === 'Maniac' ? 0.28 : p.style === 'SemiLAG' ? 0.16 :
        p.style === 'Nit' ? 0.04 : 0.03;
      if (strength < 0.12) {
        const blockerBoost = hi.hasBlockers ? 1.6 : 1.0;
        const missedDrawBoost = hi.drawType && hi.drawOuts > 0 ? 1.3 : 1.0;
        if (rand < bluffBase * blockerBoost * missedDrawBoost) {
          return { action: 'raise', amount: getSizing('polarized', pot, myChips, isIP) };
        }
      }
    }

    return { action: 'check' };
  }

  // ═══ FACING A BET — pot-odds + draw-equity based ═══
  postflopFacingBet(gs, strength, texture, rand, isIP, spr, isAggressor) {
    // Fish pattern override (min-raise river with nuts, etc.)
    const fishAction = this.fishOverride(gs, strength, rand);
    if (fishAction) return fishAction;

    const { pot, toCall, myChips, currentBet, stage } = gs;
    const p = this.profile;
    const odds = potOdds(toCall, pot); // Required equity to call
    const af = p.af || 2.5;
    const betSizePot = pot > 0 ? toCall / pot : 0;
    const isFT = gs.isFinalTable;
    const isBubble = gs.isBubble;
    const commitRatio = myChips > 0 ? toCall / myChips : 1;
    const multiway = (gs.playersInHand || 2) > 2;

    // Use totalEquity (made hand + draw equity combined)
    const totalEquity = gs._totalEquity || strength;
    const drawOuts = gs._drawOuts || 0;
    const drawEquity = gs._drawEquity || 0;
    const hi = gs.handInfo || {};

    // EV calculation with draw equity included
    const evOfCall = totalEquity * (pot + toCall) - (1 - totalEquity) * toCall;

    // Implied odds multiplier (can win more on later streets)
    const impliedOdds = stage === 'river' ? 1.0 : stage === 'turn' ? 1.15 : 1.30;
    const impliedEV = totalEquity * (pot + toCall) * impliedOdds - (1 - totalEquity) * toCall;

    // Check-raise follow-through: monster after deliberate check
    if (strength > 0.65 && !isIP && gs.streetActions?.length > 0) {
      try {
        const oppBets = (gs.streetActions || []).filter(a => !a.isHero && a.action === 'raise' && a.street === stage);
        if (oppBets.length > 0 && rand < 0.75) {
          return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
        }
      } catch (e) {}
    }

    // Pot-committed: jam if committing >33% with decent equity
    if (commitRatio > 0.33 && totalEquity > 0.45) {
      return { action: 'raise', amount: myChips };
    }

    // SPR < 2: commit or fold (no floating)
    if (spr < 2) {
      if (totalEquity > 0.40) return { action: 'raise', amount: myChips };
      return { action: 'fold' };
    }

    // ═══ CHECK-CALL TRAP: strong OOP vs aggressor — induce bluffs (#13) ═══
    if (!isIP && strength > 0.58 && strength < 0.80 && isAggressor === false) {
      if (rand < 0.30) return { action: 'call' }; // flat-call to trap, don't raise
    }

    // ═══ MONSTER (equity > 0.75): raise for value ═══
    if (strength > 0.75) {
      const raiseFreq = isFT ? 0.80 : 0.55 + (af - 2) / 8;
      if (rand < raiseFreq) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat())), myChips) };
      }
      return { action: 'call' }; // Slowplay occasionally
    }

    // ═══ CHECK-RAISE (OOP) ═══
    if (!isIP && !isAggressor) {
      // Check-raise bluff on dry boards (5%) — heads up only
      if (!multiway && strength < 0.18 && texture.category === 'dry' && stage === 'flop' && af > 2.5 && rand < 0.05) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 3), maxRaiseSize || myChips) };
      }
      // Check-raise value (22%)
      if (strength > 0.60 && rand < 0.22) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.8), myChips) };
      }
    }

    // ═══ STRONG (equity 0.55-0.75): call/raise ═══
    if (strength > 0.55) {
      // Raise for protection on wet boards
      if (texture.wet > 0.5 && !multiway && rand < 0.20 + (af - 2) / 10) {
        return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.5), myChips) };
      }
      return { action: 'call' };
    }

    // ═══ OVERBET / ALL-IN PRESSURE — fold without strong hand ═══
    if (betSizePot > 1.2 && strength < 0.60) {
      // Facing overbet or all-in: only continue with strong
      if (p.style === 'STATION' && strength > 0.35) return { action: 'call' }; // station calls wider
      if (p.style === 'Nit' || p.style === 'SCARED_MONEY') return { action: 'fold' };
      if (strength < 0.50) return { action: 'fold' };
    }
    if (commitRatio > 0.50 && strength < 0.55) {
      // Committing 50%+ stack: need strong hand
      if (p.style !== 'STATION') return { action: 'fold' };
    }

    // ═══ MEDIUM (0.40-0.55): EV-based ═══
    if (strength > 0.40) {
      if (p.style === 'STATION') return { action: 'call' };
      // Fold vs overbets with medium
      if (betSizePot > 0.80 && strength < 0.50) return { action: 'fold' };
      // Bubble: fold medium in big pots
      if (isBubble && commitRatio > 0.25 && evOfCall < toCall * 0.2) return { action: 'fold' };
      // Call only if +EV
      if (evOfCall > 0) return { action: 'call' };
      // Marginal + implied odds (not river)
      if (stage !== 'river' && impliedEV > 0) return { action: 'call' };
      return { action: 'fold' };
    }

    // ═══ DRAW: pot-odds calculation (core improvement) ═══
    if (drawOuts > 0 && stage !== 'river') {
      // Calculate pot odds needed vs draw equity
      const potOddsNeeded = toCall / (pot + toCall); // Required equity
      const effectiveDrawEquity = drawEquity * (isIP ? 1.1 : 0.95); // IP realizes better

      // Combo draw (12+ outs): semi-bluff raise
      if (drawOuts >= 12 && !multiway) {
        if (rand < 0.55 + (af - 2) / 10) {
          return { action: 'raise', amount: Math.min(Math.floor(currentBet * (2.5 + cryptoRandomFloat() * 0.5)), myChips) };
        }
        return { action: 'call' }; // Always continue with combo draw
      }

      // Flush draw (9 outs): call if odds are right, semi-bluff sometimes
      if (drawOuts >= 8) {
        if (!multiway && isIP && rand < 0.15 * (af / 2.5)) {
          return { action: 'raise', amount: Math.min(Math.floor(currentBet * 2.5), myChips) };
        }
        // Call if pot odds justify (include implied odds on flop)
        if (effectiveDrawEquity >= potOddsNeeded * 0.85) return { action: 'call' };
        // Call anyway if bet is small (< 40% pot)
        if (betSizePot < 0.40) return { action: 'call' };
        // Station/LAG call wider
        if (p.style === 'STATION' || p.style === 'LAG') return { action: 'call' };
        return { action: 'fold' };
      }

      // Gutshot (4 outs): only call small bets or with extra equity
      if (drawOuts >= 4) {
        if (effectiveDrawEquity >= potOddsNeeded * 0.80 || betSizePot < 0.33) {
          if (p.style !== 'Nit' && p.style !== 'SCARED_MONEY') return { action: 'call' };
        }
        // Fold gutshot vs big bets
        return { action: 'fold' };
      }
    }

    // Weak hand with no draw: fold (but check style-specific exceptions)
    if (stage !== 'river') {
      // (#7) Multiway fish: STATION calls with any pair in multiway ("big pot, must see")
      if (p.style === 'STATION' && multiway && strength > 0.18) return { action: 'call' };
      if (p.style === 'STATION' && strength > 0.25) return { action: 'call' };
      if (p.style === 'Maniac' && rand < 0.15) return { action: 'call' };
      return { action: 'fold' };
    }

    // ═══ RIVER: bluff-catching with blocker awareness (#12) ═══
    if (stage === 'river') {
      if (p.style === 'STATION' && strength > 0.25) return { action: 'call' };
      const mdf = 1 - betSizePot / (1 + betSizePot);
      // Blocker adjustment: if we block villain's value → call wider
      const blockerAdj = hi.hasBlockers ? 1.25 : 0.90;
      if (strength > 0.35 && rand < mdf * 0.55 * blockerAdj) return { action: 'call' };
      if (betSizePot < 0.40 && strength > 0.30 && rand < 0.35) return { action: 'call' };
    }

    if (p.style === 'SCARED_MONEY' && toCall > pot * 0.3) return { action: 'fold' };
    return { action: 'fold' };
  }
}

export { boardTexture, getSizing, isTurnGoodForAggressor };
