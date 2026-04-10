// icm.js — Independent Chip Model calculator
// Calculates tournament equity ($EV) based on chip stacks and payout structure

// Core ICM: probability of each player finishing in each position
// Uses exhaustive enumeration for small fields, Monte Carlo for large

// Probability that player i finishes 1st = chips[i] / totalChips
// Probability that player i finishes 2nd = sum over all j!=i of:
//   P(j finishes 1st) * P(i finishes 1st in remaining field without j)
// ... and so on recursively

export function calculateICM(stacks, payouts) {
  const n = stacks.length;
  const total = stacks.reduce((a, b) => a + b, 0);

  if (n === 0) return [];
  if (n === 1) return [payouts[0] || 0];

  // For large fields, use simplified ICM
  if (n > 10) return approximateICM(stacks, payouts);

  // Exact ICM for <=10 players
  const equities = new Array(n).fill(0);
  const probs = stacks.map(s => s / total);

  // Calculate equity for each place
  const numPayouts = Math.min(payouts.length, n);

  function recurse(remaining, place, probMultiplier) {
    if (place >= numPayouts || remaining.length === 0) return;

    const remTotal = remaining.reduce((a, p) => a + p.chips, 0);
    if (remTotal <= 0) return;

    for (const player of remaining) {
      const pFinish = player.chips / remTotal;
      const contribution = probMultiplier * pFinish * payouts[place];
      equities[player.idx] += contribution;

      // Recurse for next place without this player
      if (place + 1 < numPayouts) {
        const next = remaining.filter(p => p.idx !== player.idx);
        recurse(next, place + 1, probMultiplier * pFinish);
      }
    }
  }

  const players = stacks.map((chips, idx) => ({ chips, idx }));
  recurse(players, 0, 1);

  return equities;
}

// Approximate ICM for large fields (>10 players)
function approximateICM(stacks, payouts) {
  const n = stacks.length;
  const total = stacks.reduce((a, b) => a + b, 0);
  const equities = new Array(n).fill(0);

  // Simple approximation: equity = chipEV weighted toward payout structure
  // chipEV = (chips/total) * prizePool
  const prizePool = payouts.reduce((a, b) => a + b, 0);

  // Sort by stack size
  const indexed = stacks.map((chips, idx) => ({ chips, idx }));
  indexed.sort((a, b) => b.chips - a.chips);

  // Assign equity based on relative position
  for (let i = 0; i < n; i++) {
    const player = indexed[i];
    const chipShare = player.chips / total;

    // ICM compresses: big stacks worth less per chip, short stacks worth more
    // Approximate with sqrt compression
    const compressed = Math.sqrt(chipShare);
    equities[player.idx] = compressed;
  }

  // Normalize to sum to prizePool
  const totalCompressed = equities.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    equities[i] = (equities[i] / totalCompressed) * prizePool;
  }

  return equities;
}

// ICM pressure: how much ICM affects your decisions (0 = chip EV, 1 = max ICM)
export function icmPressure(stacks, heroIdx, payouts, playersRemaining, totalPlayers) {
  // Pressure increases near the bubble and near final table
  const paidSpots = payouts.length;
  const fromBubble = playersRemaining - paidSpots;

  if (fromBubble <= 0) {
    // Already in the money — pressure from payout jumps
    const heroRank = stacks
      .map((s, i) => ({ s, i }))
      .sort((a, b) => b.s - a.s)
      .findIndex(p => p.i === heroIdx);
    // More pressure for short stacks in the money
    const avgStack = stacks.reduce((a, b) => a + b, 0) / stacks.length;
    const stackRatio = stacks[heroIdx] / avgStack;
    return Math.max(0, Math.min(1, 0.3 + (1 - stackRatio) * 0.4));
  }

  // Approaching bubble
  if (fromBubble <= Math.ceil(totalPlayers * 0.05)) {
    // Within 5% of bubble — high pressure
    const bubbleProximity = 1 - fromBubble / Math.ceil(totalPlayers * 0.05);
    const avgStack = stacks.reduce((a, b) => a + b, 0) / stacks.length;
    const stackRatio = stacks[heroIdx] / avgStack;
    // Short stacks feel more pressure near bubble
    return Math.min(1, bubbleProximity * 0.8 + (stackRatio < 0.5 ? 0.2 : 0));
  }

  // Far from bubble — low pressure
  return Math.max(0, 0.1 - fromBubble / totalPlayers);
}

// Should you call an all-in based on ICM?
export function icmCallDecision(heroStack, villainStack, potSize, equity, stacks, heroIdx, payouts) {
  // Chip EV of calling
  const chipEV = equity * (potSize + villainStack) - (1 - equity) * Math.min(heroStack, villainStack);

  // ICM adjustment: calling is worse than chip EV suggests near bubble
  const icmEquityBefore = calculateICM(stacks, payouts);

  // Simulate winning
  const stacksWin = [...stacks];
  stacksWin[heroIdx] += Math.min(heroStack, villainStack);
  const villainIdx = stacks.indexOf(villainStack);
  if (villainIdx >= 0) stacksWin[villainIdx] = Math.max(0, stacksWin[villainIdx] - villainStack);
  const icmWin = calculateICM(stacksWin, payouts);

  // Simulate losing
  const stacksLose = [...stacks];
  stacksLose[heroIdx] = Math.max(0, stacksLose[heroIdx] - Math.min(heroStack, villainStack));
  const icmLose = calculateICM(stacksLose, payouts);

  const icmEV = equity * icmWin[heroIdx] + (1 - equity) * icmLose[heroIdx] - icmEquityBefore[heroIdx];

  return {
    chipEV,
    icmEV,
    shouldCall: icmEV > 0,
    icmTax: chipEV - icmEV, // How much ICM costs you
  };
}
