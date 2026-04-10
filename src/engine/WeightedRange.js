// WeightedRange.js — 1326 combos with weights, never binary filter
// Per MASTER-V2: "A hand in a range is NEVER just in or out"

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RV = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

export class WeightedRange {
  constructor() {
    this.combos = this._generateAllCombos();
  }

  _generateAllCombos() {
    const combos = [];
    for (let i = 0; i < 52; i++) {
      for (let j = i + 1; j < 52; j++) {
        const r1 = RANKS[Math.floor(i / 4)], s1 = SUITS[i % 4];
        const r2 = RANKS[Math.floor(j / 4)], s2 = SUITS[j % 4];
        const c1 = r1 + s1, c2 = r2 + s2;
        combos.push({
          cards: [c1, c2],
          weight: 1.0,
          strength: this._baseStrength(r1, s1, r2, s2),
          category: this._categorize(r1, s1, r2, s2),
        });
      }
    }
    return combos;
  }

  _baseStrength(r1, s1, r2, s2) {
    const v1 = RV[r1], v2 = RV[r2];
    const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
    const suited = s1 === s2;
    const pair = v1 === v2;

    let s = 0;
    if (pair) s = 0.5 + hi / 30; // AA=0.97, 22=0.57
    else {
      s = (hi / 14) * 0.5 + (lo / 14) * 0.2;
      if (suited) s += 0.06;
      if (hi - lo <= 2) s += 0.04; // connected
      if (hi - lo === 1) s += 0.02;
    }
    return Math.min(1, Math.max(0, s));
  }

  _categorize(r1, s1, r2, s2) {
    const v1 = RV[r1], v2 = RV[r2];
    const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
    const suited = s1 === s2;
    const pair = v1 === v2;
    if (pair && hi >= 12) return 'premium_pair';
    if (pair && hi >= 9) return 'mid_pair';
    if (pair) return 'small_pair';
    if (hi >= 13 && lo >= 11) return 'broadway';
    if (suited && hi - lo <= 3 && hi >= 6) return 'suited_conn';
    if (suited && hi >= 14) return 'ax_suited';
    if (suited) return 'suited_other';
    if (hi >= 14 && lo >= 10) return 'ax_offsuit';
    return 'other';
  }

  // ═══ ADJUST WEIGHTS — NEVER binary remove ═══

  applyPreflopOpen(position, vpip) {
    const openPct = vpip || 0.25;
    const sorted = [...this.combos].sort((a, b) => b.strength - a.strength);
    const cutoff = Math.floor(sorted.length * openPct);

    const idxMap = new Map();
    sorted.forEach((c, i) => idxMap.set(c, i));

    for (const combo of this.combos) {
      const rank = idxMap.get(combo);
      if (rank < cutoff * 0.8) {
        combo.weight *= 1.0;       // Core range
      } else if (rank < cutoff) {
        combo.weight *= 0.6;       // Borderline
      } else if (rank < cutoff * 1.2) {
        combo.weight *= 0.15;      // Just outside
      } else {
        combo.weight *= 0.02;      // Almost never — but NOT zero
      }
    }
  }

  applyCall() {
    for (const c of this.combos) {
      if (c.strength > 0.85) {
        c.weight *= 0.35; // Would usually raise, but sometimes traps
      } else if (c.strength > 0.45) {
        c.weight *= 1.2;  // This IS the calling range
      } else if (c.strength > 0.25) {
        c.weight *= 0.5;  // Sometimes peels
      } else {
        c.weight *= 0.05; // Rarely calls
      }
    }
  }

  applyRaise(raiseSize, potSize) {
    // PATCH 1: Polarized model — raises are VALUE or BLUFF, not medium
    for (const c of this.combos) {
      if (c.strength > 0.80) {
        c.weight *= 1.5;  // VALUE: strong hands raise
      } else if (c.strength > 0.55) {
        c.weight *= 0.20; // MEDIUM: these CALL, not raise
      } else if (c.strength > 0.30) {
        // Check for bluff candidates: suited, blockers, draws
        const isBluffCandidate =
          c.category === 'suited_conn' || c.category === 'ax_suited' ||
          c.cards.some(card => card[0] === 'A' || card[0] === 'K');
        c.weight *= isBluffCandidate ? 0.6 : 0.10;
      } else {
        c.weight *= 0.05;
      }
    }
  }

  applyCheck() {
    for (const c of this.combos) {
      if (c.strength > 0.85) {
        c.weight *= 0.4; // Trap/slowplay — don't zero out
      }
      // Medium/weak: normal check range
    }
  }

  applyBoardInteraction(board) {
    if (!board || board.length < 3) return;
    for (const c of this.combos) {
      const inter = this.evaluateBoardInteraction(c.cards, board);
      switch (inter.type) {
        case 'top_pair_plus': c.weight *= 1.3; break;
        case 'mid_pair':
        case 'draw': break; // neutral
        case 'weak_pair': c.weight *= 0.7; break;
        case 'air': c.weight *= 0.3; break;
      }
    }
  }

  // Apply villain personality
  applyVillainStyle(style) {
    if (style === 'STATION') {
      // Calling stations keep everything weighted higher
      for (const c of this.combos) {
        if (c.strength < 0.3) c.weight *= 2.0; // They keep trash
      }
    }
    if (style === 'Nit') {
      // Nits have very narrow ranges
      for (const c of this.combos) {
        if (c.strength < 0.5) c.weight *= 0.3;
      }
    }
    if (style === 'Maniac') {
      // Maniacs have wide ranges
      for (const c of this.combos) {
        c.weight *= 0.8 + c.strength * 0.4;
      }
    }
  }

  // ═══ Get combos for equity calc ═══

  getWeightedCombos(excludeCards) {
    const excluded = new Set(excludeCards || []);
    return this.combos.filter(c => {
      if (c.weight < 0.01) return false;
      if (excluded.has(c.cards[0]) || excluded.has(c.cards[1])) return false;
      return true;
    });
  }

  // What % of range is "air" on this board?
  getAirPercentage(board) {
    if (!board || board.length < 3) return 0.4;
    const combos = this.getWeightedCombos();
    let totalW = 0, airW = 0;
    for (const c of combos) {
      totalW += c.weight;
      const inter = this.evaluateBoardInteraction(c.cards, board);
      if (inter.type === 'air' || inter.type === 'weak_pair') airW += c.weight;
    }
    return totalW > 0 ? airW / totalW : 0.4;
  }

  // Shannon entropy — 0=certain, 1=max uncertainty
  entropy() {
    const combos = this.getWeightedCombos();
    const total = combos.reduce((a, c) => a + c.weight, 0);
    if (total === 0 || combos.length === 0) return 1;
    let h = 0;
    for (const c of combos) {
      const p = c.weight / total;
      if (p > 0) h -= p * Math.log2(p);
    }
    return Math.min(1, h / Math.log2(combos.length));
  }

  // ═══ Board interaction classifier ═══

  evaluateBoardInteraction(handCards, board) {
    const hRanks = handCards.map(c => RV[c[0]]);
    const bRanks = board.map(c => RV[c[0]]);
    const bSuits = board.map(c => c[1]);
    const hSuits = handCards.map(c => c[1]);
    const topBoard = Math.max(...bRanks);

    const hasTopPair = hRanks.some(r => r === topBoard);
    const hasOverpair = hRanks[0] === hRanks[1] && Math.min(...hRanks) > topBoard;
    const hasPair = hRanks.some(r => bRanks.includes(r));

    // Flush draw
    const allSuits = [...bSuits, ...hSuits];
    const suitCounts = {};
    allSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const hasFlushDraw = Object.values(suitCounts).some(c => c >= 4);

    // Straight draw
    const allVals = [...new Set([...hRanks, ...bRanks])].sort((a, b) => a - b);
    let maxConn = 1, cur = 1;
    for (let i = 1; i < allVals.length; i++) {
      if (allVals[i] - allVals[i - 1] <= 2) { cur++; maxConn = Math.max(maxConn, cur); }
      else cur = 1;
    }
    const hasStraightDraw = maxConn >= 4;

    if (hasOverpair) return { type: 'top_pair_plus', strength: 0.85 };
    if (hasTopPair) return { type: 'top_pair_plus', strength: 0.7 };
    if (hasPair) return { type: 'mid_pair', strength: 0.5 };
    if (hasFlushDraw || hasStraightDraw) return { type: 'draw', strength: 0.4 };
    if (hRanks.some(r => r > topBoard)) return { type: 'weak_pair', strength: 0.25 };
    return { type: 'air', strength: 0.1 };
  }

  // ═══ Clone for simulation ═══
  clone() {
    const wr = new WeightedRange();
    wr.combos = this.combos.map(c => ({ ...c }));
    return wr;
  }
}

export { RV, RANKS, SUITS };
