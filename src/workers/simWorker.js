// simWorker.js — Background table simulation off main thread
// Runs in Web Worker, simulates ~10 hands/second per non-hero table

self.onmessage = function (event) {
  const { type, data } = event.data;

  if (type === 'simulate') {
    const { tables, heroTableId, blinds, handsPerTable } = data;
    const results = { eliminations: [], updates: [] };

    for (const table of tables) {
      if (table.id === heroTableId) continue;
      const active = table.players.filter(p => !p.eliminated);
      if (active.length <= 1) continue;

      const n = handsPerTable || (3 + Math.floor(Math.random() * 3));
      for (let h = 0; h < n; h++) {
        simulateQuickHand(table, blinds, results);
      }

      results.updates.push({
        tableId: table.id,
        players: table.players.map(p => ({ id: p.id, chips: p.chips, eliminated: p.eliminated })),
      });
    }

    self.postMessage({ type: 'sim_update', results, timestamp: Date.now() });
  }
};

function simulateQuickHand(table, blinds, results) {
  const active = table.players.filter(p => !p.eliminated);
  if (active.length <= 1) return;

  const totalChips = active.reduce((a, p) => a + p.chips, 0);
  const potBase = blinds.bb * 2 + (blinds.ante || 0) * active.length;

  // Random pot size multiplier
  const multiplier = Math.random() < 0.62 ? 1 : 3 + Math.random() * 25;
  const potSize = Math.floor(potBase * multiplier);

  // Weighted random winner
  let r = Math.random() * totalChips;
  let winner = active[0];
  for (const p of active) {
    r -= p.chips;
    if (r <= 0) { winner = p; break; }
  }

  // Random loser (not winner)
  let loserIdx;
  do {
    loserIdx = Math.floor(Math.random() * active.length);
  } while (active[loserIdx].id === winner.id && active.length > 1);
  const loser = active[loserIdx];

  const amount = Math.min(potSize, loser.chips);
  loser.chips -= amount;
  winner.chips += amount;

  if (loser.chips <= 0) {
    loser.chips = 0;
    loser.eliminated = true;
    loser.finishPosition = active.filter(p => !p.eliminated).length;
    results.eliminations.push({ id: loser.id, name: loser.name, tableId: table.id });
  }

  table.handNum++;
}
