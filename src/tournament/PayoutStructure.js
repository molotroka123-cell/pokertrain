// PayoutStructure.js — Real tournament payout tables
// Top 15% paid

export function getPayoutStructure(totalPlayers, buyIn) {
  const prizePool = totalPlayers * buyIn;
  const paidPlaces = Math.ceil(totalPlayers * 0.15);

  // Payout percentages by finish position
  const percentages = buildPayoutTable(paidPlaces);

  const payouts = {};
  for (let i = 1; i <= paidPlaces; i++) {
    payouts[i] = Math.floor(prizePool * percentages[i]);
  }

  return { prizePool, paidPlaces, payouts, percentages };
}

function buildPayoutTable(paidPlaces) {
  const pct = {};

  // Top 9 fixed percentages (standard tournament structure)
  pct[1] = 0.22;
  pct[2] = 0.14;
  pct[3] = 0.10;
  pct[4] = 0.07;
  pct[5] = 0.055;
  pct[6] = 0.045;
  pct[7] = 0.038;
  pct[8] = 0.032;
  pct[9] = 0.028;

  let allocated = 0;
  for (let i = 1; i <= Math.min(9, paidPlaces); i++) {
    allocated += pct[i];
  }

  if (paidPlaces <= 9) {
    // Redistribute to sum to 1.0
    const factor = 1 / allocated;
    for (let i = 1; i <= paidPlaces; i++) pct[i] *= factor;
    return pct;
  }

  // 10-18: even split
  const tier2Count = Math.min(9, paidPlaces - 9);
  const tier2Each = 0.018;
  for (let i = 10; i <= 9 + tier2Count; i++) {
    pct[i] = tier2Each;
    allocated += tier2Each;
  }

  // 19-27: even split
  const tier3Start = 10 + tier2Count;
  const tier3Count = Math.min(9, paidPlaces - tier3Start + 1);
  const tier3Each = 0.012;
  for (let i = tier3Start; i < tier3Start + tier3Count; i++) {
    pct[i] = tier3Each;
    allocated += tier3Each;
  }

  // 28-45: even split
  const tier4Start = tier3Start + tier3Count;
  const tier4Count = Math.min(18, paidPlaces - tier4Start + 1);
  const tier4Each = 0.008;
  for (let i = tier4Start; i < tier4Start + tier4Count; i++) {
    pct[i] = tier4Each;
    allocated += tier4Each;
  }

  // 46+: remaining split evenly
  const tier5Start = tier4Start + tier4Count;
  if (tier5Start <= paidPlaces) {
    const remaining = 1 - allocated;
    const tier5Count = paidPlaces - tier5Start + 1;
    const tier5Each = remaining / tier5Count;
    for (let i = tier5Start; i <= paidPlaces; i++) {
      pct[i] = tier5Each;
    }
  }

  return pct;
}

// Format payout for display
export function formatPayout(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

// Check if position is in the money
export function isInMoney(position, paidPlaces) {
  return position <= paidPlaces;
}

// Get payout jump info (for ICM near payout spots)
export function getPayoutJump(currentPlace, payouts) {
  const current = payouts[currentPlace] || 0;
  const next = payouts[currentPlace - 1] || current;
  return { current, next, jump: next - current };
}
