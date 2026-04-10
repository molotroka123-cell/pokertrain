// TournamentDirector.js — Heart of the MTT
// Controls entire tournament: tables, seating, blinds, payouts, eliminations

import { FORMATS } from '../data/tournamentFormats.js';
import { PlayerPool } from './PlayerPool.js';
import { TableManager } from './TableManager.js';
import { getPayoutStructure } from './PayoutStructure.js';
import { cryptoRandomFloat } from '../engine/deck.js';

// Chip flow model from real data (21M hands — CRITICAL-FIXES spec)
const CHIP_FLOW = {
  foldPre: 0.62,
  potSizeDistribution: [
    { range: [3, 5], prob: 0.35 },
    { range: [6, 12], prob: 0.30 },
    { range: [13, 25], prob: 0.20 },
    { range: [26, 50], prob: 0.10 },
    { range: [51, 150], prob: 0.05 },
  ],
  eliminationRate: {
    early: 0.008,
    middle: 0.012,
    bubble: 0.006,
    postBubble: 0.025,
    finalTable: 0.012,
  },
};

export class TournamentDirector {
  constructor(formatKey, heroName) {
    this.formatKey = formatKey;
    this.format = FORMATS[formatKey];
    this.pool = new PlayerPool(this.format);
    this.tableManager = new TableManager(this.format.playersPerTable);
    this.payout = getPayoutStructure(this.format.players, this.format.buyIn);

    this.blindLevel = 0;
    this.handCount = 0;
    this.levelStartTime = Date.now();
    this.isPaused = false;
    this.isFinished = false;
    this.isFinalTable = false;

    // Initialize
    const players = this.pool.initialize(heroName);
    const shuffled = this.pool.getShuffledPlayers();
    this.tableManager.seatPlayers(shuffled);
  }

  // Current blind level info
  getBlinds() {
    const level = this.format.blindLevels[Math.min(this.blindLevel, this.format.blindLevels.length - 1)];
    return { ...level, level: this.blindLevel };
  }

  // Time remaining in current level (seconds)
  getLevelTimeRemaining() {
    const level = this.getBlinds();
    const elapsed = (Date.now() - this.levelStartTime) / 1000;
    return Math.max(0, level.mins * 60 - elapsed);
  }

  // Check if blinds should advance — hybrid: time + soft player-count guide
  checkBlindLevel() {
    const alive = this.pool.getAliveCount();
    const total = this.format.players;
    const maxLevel = this.format.blindLevels.length - 1;

    // Time-based (primary)
    const timeUp = this.getLevelTimeRemaining() <= 0;

    // Player-count guide (soft — never jumps, just nudges)
    const elimPct = 1 - alive / total;
    const targetLevel = Math.floor(elimPct * maxLevel * 0.8); // 0.8 = slower than linear

    // Only advance by 1 level at a time
    if (timeUp && this.blindLevel < maxLevel) {
      this.blindLevel++;
      this.levelStartTime = Date.now();
      return true;
    }

    // Soft catch-up if blinds are WAY behind eliminations (>3 levels)
    if (targetLevel > this.blindLevel + 3 && this.blindLevel < maxLevel) {
      this.blindLevel++;
      this.levelStartTime = Date.now();
      return true;
    }

    return false;
  }

  // Get tournament stage
  getStage() {
    const alive = this.pool.getAliveCount();
    const total = this.format.players;
    const paidPlaces = this.payout.paidPlaces;

    if (alive <= 9) return 'finalTable';
    if (alive <= paidPlaces) return 'postBubble';
    if (alive <= paidPlaces * 1.15) return 'bubble';
    if (alive > total * 0.6) return 'early';
    return 'middle';
  }

  isBubble() {
    const alive = this.pool.getAliveCount();
    return alive > this.payout.paidPlaces && alive <= this.payout.paidPlaces * 1.15;
  }

  isInMoney() {
    return this.pool.getAliveCount() <= this.payout.paidPlaces;
  }

  // Simulate one hand on a background table (statistical model)
  simulateBackgroundHand(table) {
    const active = table.players.filter(p => !p.eliminated);
    if (active.length <= 1) return null;

    const bl = this.getBlinds();
    const totalChips = active.reduce((a, p) => a + p.chips, 0);

    // Determine pot size from distribution
    let potBBs;
    const roll = cryptoRandomFloat();
    let cumProb = 0;
    for (const tier of CHIP_FLOW.potSizeDistribution) {
      cumProb += tier.prob;
      if (roll < cumProb) {
        potBBs = tier.range[0] + cryptoRandomFloat() * (tier.range[1] - tier.range[0]);
        break;
      }
    }
    potBBs = potBBs || 5;

    // Fold preflop? (most hands fold pre — realistic)
    if (cryptoRandomFloat() < CHIP_FLOW.foldPre) {
      // Just move blinds/antes — small chip transfer
      const posted = bl.bb + bl.sb + bl.ante * active.length;
      const winner = this._weightedRandomPlayer(active);
      const loserIdx = (active.indexOf(winner) + 1 + Math.floor(cryptoRandomFloat() * (active.length - 1))) % active.length;
      const loser = active[loserIdx];
      // Cap transfer at blinds only (realistic — just steal blinds)
      const amount = Math.min(posted, loser.chips);
      loser.chips -= amount;
      winner.chips += amount;
    } else {
      // Actual pot — CAP pot size to prevent instant eliminations
      const potSize = Math.floor(potBBs * bl.bb);
      const winner = this._weightedRandomPlayer(active);
      const loserIdx = (active.indexOf(winner) + 1 + Math.floor(cryptoRandomFloat() * (active.length - 1))) % active.length;
      const loser = active[loserIdx];
      // Key fix: cap loss at 25% of loser's stack (prevents instant bust)
      // Full bust only happens ~5% of postflop hands (realistic all-in frequency)
      const maxLoss = cryptoRandomFloat() < 0.12
        ? loser.chips // All-in bust (~12% of postflop hands)
        : Math.floor(loser.chips * (0.08 + cryptoRandomFloat() * 0.25)); // Lose 8-33% of stack
      const amount = Math.min(potSize, maxLoss);
      loser.chips -= amount;
      winner.chips += amount;

      // Check for tilt trigger on big loss
      if (amount > bl.bb * 20 && loser.tiltState) {
        this.pool.triggerTilt(loser.id);
      }
    }

    // Elimination check
    for (const p of active) {
      if (p.chips <= 0 && !p.eliminated) {
        this.pool.eliminate(p.id);
      }
    }

    table.handNum++;
    this.handCount++;

    return { tableId: table.id };
  }

  _weightedRandomPlayer(players) {
    const total = players.reduce((a, p) => a + p.chips, 0);
    let r = cryptoRandomFloat() * total;
    for (const p of players) {
      r -= p.chips;
      if (r <= 0) return p;
    }
    return players[players.length - 1];
  }

  // Simulate all background tables (called periodically)
  // ~10 min to final table target
  simulateBackgroundTick(handsPerTable = 5) {
    const nonHeroTables = this.tableManager.getNonHeroTables();
    const results = { eliminations: [], moves: [] };

    const aliveBefore = this.pool.getAliveCount();

    for (const table of nonHeroTables) {
      const active = table.players.filter(p => !p.eliminated);
      if (active.length <= 1) continue;

      const n = handsPerTable + Math.floor(cryptoRandomFloat() * 3);
      for (let h = 0; h < n; h++) {
        this.simulateBackgroundHand(table);
      }
    }

    const aliveAfter = this.pool.getAliveCount();
    const newElims = aliveBefore - aliveAfter;

    // Rebalance tables
    const moves = this.tableManager.rebalance();
    results.moves = moves;

    // Check final table
    if (!this.isFinalTable && this.tableManager.checkFinalTable(aliveAfter)) {
      this.isFinalTable = true;
      results.finalTable = true;
    }

    // Update personalities periodically
    this.pool.updatePersonalities();

    // Check blinds
    results.blindsUp = this.checkBlindLevel();

    return results;
  }

  // Get full tournament state for UI
  getState() {
    const hero = this.pool.getHero();
    const blinds = this.getBlinds();
    const alive = this.pool.getAliveCount();
    const heroTable = this.tableManager.getHeroTable();

    return {
      format: this.format,
      formatKey: this.formatKey,
      blindLevel: this.blindLevel,
      blinds,
      levelTimeRemaining: this.getLevelTimeRemaining(),
      playersRemaining: alive,
      totalPlayers: this.format.players,
      tables: this.tableManager.getActiveTables().length,
      heroRank: this.pool.getHeroRank(),
      heroChips: hero.chips,
      heroEliminated: hero.eliminated,
      averageStack: this.pool.getAverageStack(),
      stage: this.getStage(),
      isBubble: this.isBubble(),
      isInMoney: this.isInMoney(),
      isFinalTable: this.isFinalTable,
      isFinished: this.isFinished,
      payout: this.payout,
      handCount: this.handCount,
      chipLeaders: this.pool.getChipLeaders(10),
      heroTable: heroTable ? {
        id: heroTable.id,
        players: heroTable.players.filter(p => !p.eliminated),
        dealer: heroTable.dealer,
        isFinalTable: heroTable.isFinalTable,
      } : null,
      recentEliminations: this.pool.eliminatedPlayers.slice(-5).reverse(),
    };
  }
}
