// TableManager.js — Manages multiple tables, balancing, breaks

export class TableManager {
  constructor(playersPerTable) {
    this.playersPerTable = playersPerTable;
    this.tables = [];
    this.heroTableIndex = 0;
  }

  // Seat all players at tables
  seatPlayers(players) {
    this.tables = [];
    const numTables = Math.ceil(players.length / this.playersPerTable);

    for (let t = 0; t < numTables; t++) {
      const start = t * this.playersPerTable;
      const end = Math.min(start + this.playersPerTable, players.length);
      const tablePlayers = players.slice(start, end);

      this.tables.push({
        id: t,
        players: tablePlayers,
        dealer: 0,
        handNum: 0,
        isFinalTable: false,
      });
    }

    // Find hero's table
    this.heroTableIndex = this.tables.findIndex(t =>
      t.players.some(p => p.isHero)
    );

    return this.tables;
  }

  getHeroTable() {
    return this.tables[this.heroTableIndex] || null;
  }

  getActiveTables() {
    return this.tables.filter(t =>
      t.players.filter(p => !p.eliminated).length > 1
    );
  }

  // Table balancing: move players if imbalance > 1
  rebalance() {
    const active = this.getActiveTables();
    if (active.length <= 1) return [];

    const moves = [];
    let balanced = false;

    while (!balanced) {
      const sizes = active.map(t => ({
        table: t,
        count: t.players.filter(p => !p.eliminated).length,
      })).sort((a, b) => a.count - b.count);

      const smallest = sizes[0];
      const largest = sizes[sizes.length - 1];

      if (largest.count - smallest.count <= 1) {
        balanced = true;
        break;
      }

      // Move a non-hero player from largest to smallest
      const movable = largest.table.players.find(p => !p.eliminated && !p.isHero);
      if (!movable) break;

      // Remove from old table
      largest.table.players = largest.table.players.filter(p => p.id !== movable.id);
      // Add to new table
      smallest.table.players.push(movable);

      moves.push({
        player: movable.name,
        from: largest.table.id,
        to: smallest.table.id,
      });
    }

    // Break tables with ≤3 players (if more than 1 table exists)
    const verySmall = active.filter(t =>
      t.players.filter(p => !p.eliminated).length <= 3 && active.length > 1
    );
    for (const table of verySmall) {
      const playersToMove = table.players.filter(p => !p.eliminated);
      // Distribute to other tables
      const otherTables = active.filter(t => t.id !== table.id);
      for (const player of playersToMove) {
        // Find table with fewest players
        const target = otherTables
          .map(t => ({ t, c: t.players.filter(p => !p.eliminated).length }))
          .sort((a, b) => a.c - b.c)[0];
        if (target) {
          table.players = table.players.filter(p => p.id !== player.id);
          target.t.players.push(player);
          moves.push({ player: player.name, from: table.id, to: target.t.id });
        }
      }
    }

    // Update hero table index
    this.heroTableIndex = this.tables.findIndex(t =>
      t.players.some(p => p.isHero && !p.eliminated)
    );

    return moves;
  }

  // Check if final table (≤9 players remaining)
  checkFinalTable(aliveCount) {
    if (aliveCount <= this.playersPerTable && this.getActiveTables().length > 1) {
      // Consolidate to final table
      const allAlive = [];
      for (const t of this.tables) {
        for (const p of t.players) {
          if (!p.eliminated) allAlive.push(p);
        }
      }

      this.tables = [{
        id: 0,
        players: allAlive,
        dealer: 0,
        handNum: 0,
        isFinalTable: true,
      }];
      this.heroTableIndex = 0;
      return true;
    }
    return false;
  }

  // Get non-hero tables (for background simulation)
  getNonHeroTables() {
    return this.tables.filter((t, i) => i !== this.heroTableIndex);
  }
}
