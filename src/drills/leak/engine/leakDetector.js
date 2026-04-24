// leakDetector.js — Classify parsed hand histories by leak type

const BROADWAY_COMBOS = new Set(['AT', 'AJ', 'AQ', 'KJ', 'KQ', 'KT', 'QJ', 'QT', 'JT']);

function heroCombo(heroCards) {
  if (!heroCards || heroCards.length !== 2) return null;
  const [c1, c2] = heroCards;
  const r1 = c1[0], r2 = c2[0];
  const s1 = c1[1], s2 = c2[1];
  if (r1 === r2) return r1 + r2;
  const order = 'AKQJT98765432';
  const hi = order.indexOf(r1) < order.indexOf(r2) ? r1 : r2;
  const lo = hi === r1 ? r2 : r1;
  return hi + lo + (s1 === s2 ? 's' : 'o');
}

function handKey(h) {
  if (!h.heroCards || h.heroCards.length !== 2) return null;
  const [c1, c2] = h.heroCards;
  if (c1[0] === c2[0]) return c1[0] + c2[0];
  const combo = c1[0] + c2[0];
  return combo;
}

// Count active players postflop (excluding those who folded preflop)
function activePostflop(h) {
  const folded = new Set();
  h.streets.preflop.forEach(a => { if (a.action === 'fold') folded.add(a.player); });
  return h.seats.filter(s => !folded.has(s.name)).length;
}

// Did hero face a 4-bet preflop?
function heroFaced4Bet(h) {
  if (!h.hero) return false;
  const raises = h.streets.preflop.filter(a => a.action === 'raise' || a.action === 'shove');
  // Need at least 3 raises before hero's final action, and hero wasn't the 4bettor
  let raiseCount = 0;
  for (const a of h.streets.preflop) {
    if (a.action === 'raise' || a.action === 'shove') raiseCount++;
    if (a.player === h.hero && raiseCount >= 3 && a.action !== 'raise') return true;
  }
  return false;
}

// Did hero limp-call or call vs limp-raise?
function heroFacedLimpRaiseShove(h) {
  if (!h.hero) return false;
  const pf = h.streets.preflop;
  // Sequence: limp(s) → hero limp/raise → someone shoves → hero action
  const limps = pf.filter(a => a.action === 'call' && a.amount === h.bigBlind);
  if (limps.length === 0) return false;
  const shove = pf.find(a => a.action === 'shove' || (a.action === 'raise' && a.isAllIn));
  if (!shove || shove.player === h.hero) return false;
  // Hero made a decision after the shove
  const shoveIdx = pf.indexOf(shove);
  return pf.slice(shoveIdx + 1).some(a => a.player === h.hero);
}

function heroStackBB(h) {
  if (!h.heroStack || !h.bigBlind) return null;
  return h.heroStack / h.bigBlind;
}

// Hero bet on the flop in a multi-way pot?
function heroMultiwayCbet(h) {
  if (!h.hero) return false;
  const postflopPlayers = activePostflop(h);
  if (postflopPlayers < 3) return false;
  const flopActions = h.streets.flop;
  if (flopActions.length === 0) return false;
  const firstHeroAction = flopActions.find(a => a.player === h.hero);
  return firstHeroAction && (firstHeroAction.action === 'bet' || firstHeroAction.action === 'raise');
}

// Hero raised vs limpers?
function heroIsoVsLimpers(h) {
  if (!h.hero) return null;
  const pf = h.streets.preflop;
  const limps = [];
  let heroRaiseAmount = null;
  for (const a of pf) {
    if (a.action === 'call' && a.amount === h.bigBlind) limps.push(a);
    else if (a.player === h.hero && a.action === 'raise') {
      heroRaiseAmount = a.amount;
      break;
    } else if (a.action === 'raise') {
      return null; // someone raised before hero
    }
  }
  if (heroRaiseAmount == null || limps.length === 0) return null;
  const sizingBB = heroRaiseAmount / h.bigBlind;
  // Correct sizing: 1 limper = 4x, 2 = 5x, 3 = 6x
  const expected = 3 + limps.length;
  const underSized = sizingBB < expected - 0.5;
  return { limpers: limps.length, heroSizingBB: sizingBB, expected, underSized };
}

// Deep stack cash = 150+ BB
function isDeepStackCash(h) {
  const bb = heroStackBB(h);
  return h.format === 'cash' && bb && bb >= 150;
}

// Paired flop board?
function isPairedFlop(h) {
  if (!h.board.flop || h.board.flop.length < 3) return false;
  const ranks = h.board.flop.map(c => c[0]);
  return new Set(ranks).size < 3;
}

// Wet board: 2 of same suit + connected
function isWetFlop(h) {
  if (!h.board.flop || h.board.flop.length < 3) return false;
  const suits = h.board.flop.map(c => c[1]);
  const suitCount = {};
  suits.forEach(s => { suitCount[s] = (suitCount[s] || 0) + 1; });
  const flushDraw = Object.values(suitCount).some(c => c >= 2);
  const order = 'AKQJT98765432';
  const ranks = h.board.flop.map(c => order.indexOf(c[0])).sort((a, b) => a - b);
  const straighty = (ranks[2] - ranks[0]) <= 4;
  return flushDraw && straighty;
}

// Hero made a river bet with value?
function heroRiverBet(h) {
  if (!h.hero || h.streets.river.length === 0) return false;
  const heroRiverAction = h.streets.river.find(a => a.player === h.hero);
  return heroRiverAction && ['bet', 'raise'].includes(heroRiverAction.action);
}

// 3-bet pot OOP cbet by hero?
function heroThreeBPOOPCbet(h) {
  if (!h.hero) return false;
  const pf = h.streets.preflop;
  const raises = pf.filter(a => a.action === 'raise');
  if (raises.length < 2) return false;
  const heroRaise = raises.find(a => a.player === h.hero);
  if (!heroRaise) return false;
  // Hero 3-bet and was OOP (SB/BB/UTG range covers OOP)
  const oopPositions = new Set(['SB', 'BB', 'UTG', 'UTG+1', 'MP']);
  if (!oopPositions.has(h.heroPosition)) return false;
  // Flop: hero acted first and bet
  if (h.streets.flop.length === 0) return false;
  const firstHero = h.streets.flop.find(a => a.player === h.hero);
  return firstHero && firstHero.action === 'bet';
}

function heroFoldedBB(h) {
  if (!h.hero || h.heroPosition !== 'BB') return false;
  const heroActions = h.streets.preflop.filter(a => a.player === h.hero);
  if (heroActions.length === 0) return false;
  return heroActions[0].action === 'fold';
}

function heroShortStackPushFoldSpot(h) {
  const bb = heroStackBB(h);
  return bb != null && bb <= 15;
}

export function detectLeaks(hand) {
  const tags = [];
  const combo = heroCombo(hand.heroCards);

  // Broadway chase: hero had broadway combo, faced 4-bet or limp-raise shove, lost big
  const comboKey = combo && (combo.length === 3 ? combo.slice(0, 2) : combo);
  if (comboKey && BROADWAY_COMBOS.has(comboKey)) {
    if (heroFaced4Bet(hand) || heroFacedLimpRaiseShove(hand)) {
      tags.push('broadway_chase');
    }
  }

  // SB play
  if (hand.heroPosition === 'SB') {
    tags.push('sb_play');
  }

  // Multi-way cbet
  if (heroMultiwayCbet(hand)) {
    tags.push('multiway_cbet');
  }

  // Iso sizing leak: under-sized iso raise
  const iso = heroIsoVsLimpers(hand);
  if (iso && iso.underSized) {
    tags.push('iso_sizing');
  }

  // Push/fold: hero had ≤15BB
  if (heroShortStackPushFoldSpot(hand)) {
    tags.push('push_fold_nash');
  }

  // BB defend: hero folded BB facing small open
  if (heroFoldedBB(hand)) {
    // Small sample — only flag if facing <=2.5x open
    const openRaise = hand.streets.preflop.find(a => a.action === 'raise');
    if (openRaise && hand.bigBlind && openRaise.amount / hand.bigBlind <= 2.5) {
      tags.push('bb_defend');
    }
  }

  // 3BP OOP cbet
  if (heroThreeBPOOPCbet(hand)) {
    tags.push('threebet_pot_oop');
  }

  // Set on wet board: hero pocket pair, flop has 3 low cards and wet
  if (combo && combo.length === 2 && combo[0] === combo[1] && isWetFlop(hand)) {
    tags.push('set_wet_board');
  }

  // Paired board navigation
  if (isPairedFlop(hand)) {
    tags.push('paired_board');
  }

  // River sizing leak: hero made river bet
  if (heroRiverBet(hand)) {
    tags.push('river_sizing');
  }

  // Deep stack cash
  if (isDeepStackCash(hand)) {
    tags.push('deep_cash');
  }

  return tags;
}

export function classifyAll(hands) {
  const results = {};
  for (const h of hands) {
    const tags = detectLeaks(h);
    h.leakTags = tags;
    for (const t of tags) {
      if (!results[t]) results[t] = [];
      results[t].push(h.handId);
    }
  }
  return results;
}

// Summary counts for UI display
export function summarizeLeaks(hands) {
  const counts = {};
  let total = 0;
  for (const h of hands) {
    const tags = h.leakTags || detectLeaks(h);
    total++;
    for (const t of tags) counts[t] = (counts[t] || 0) + 1;
  }
  return { total, counts };
}
