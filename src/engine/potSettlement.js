// potSettlement.js — pure main/side-pot settlement with optional rake.
//
// contributions: { playerId: chipsPutInThisHand }   (blinds, antes, bets; folded players included)
// folded:        Set of playerIds that are out of the hand (their chips stay as dead money)
// scores:        { playerId: comparable hand value } for every player still contesting (higher wins)
// order:         playerIds in award order, starting with the first seat left of the button
//                (odd chips go to the first winner in this order)
// rake:          chips to remove from the contested pots (main pot first). Uncalled bets are never raked.
//
// Rules implemented: contribution levels, uncalled bet returned to its owner, dead money goes to
// the pot of the level it was paid into, ties split per pot, odd chip by `order`.

export function settlePots({ contributions, folded = new Set(), scores = {}, order = [], rake = 0 }) {
  const ids = Object.keys(contributions);
  const contenders = ids.filter(id => !folded.has(id) && (contributions[id] || 0) >= 0);
  const awards = Object.fromEntries(ids.map(id => [id, 0]));
  const levels = [...new Set(ids.map(id => contributions[id]).filter(v => v > 0))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  let carry = 0;
  let returned = 0;

  for (const lvl of levels) {
    const slice = ids.filter(id => Math.min(contributions[id], lvl) - Math.min(contributions[id], prev) > 0);
    const amount = slice.reduce((a, id) => a + Math.min(contributions[id], lvl) - Math.min(contributions[id], prev), 0) + carry;
    prev = lvl;
    const eligible = contenders.filter(id => contributions[id] >= lvl);
    if (eligible.length === 0) { carry = amount; continue; }
    carry = 0;
    const uncalled = slice.length === 1 && eligible.length === 1 && slice[0] === eligible[0];
    if (uncalled) {
      awards[eligible[0]] += amount;
      returned += amount;
      pots.push({ amount, eligible, winners: eligible, rake: 0, uncalled: true });
      continue;
    }
    let winners = eligible;
    if (eligible.length > 1) {
      const best = Math.max(...eligible.map(id => scores[id] ?? -Infinity));
      winners = eligible.filter(id => (scores[id] ?? -Infinity) === best);
    }
    pots.push({ amount, eligible, winners, rake: 0, uncalled: false });
  }
  if (carry > 0 && contenders.length) { // cannot happen with legal betting; keep chips conserved
    const top = [...contenders].sort((a, b) => contributions[b] - contributions[a])[0];
    awards[top] += carry;
  }

  // Rake comes out of the contested pots, main pot first.
  let rakeLeft = Math.max(0, Math.floor(rake));
  let rakeTaken = 0;
  for (const pot of pots) {
    if (pot.uncalled || rakeLeft <= 0) continue;
    const r = Math.min(pot.amount, rakeLeft);
    pot.amount -= r; pot.rake = r; rakeLeft -= r; rakeTaken += r;
  }

  for (const pot of pots) {
    if (pot.uncalled) continue;
    const share = Math.floor(pot.amount / pot.winners.length);
    let rem = pot.amount - share * pot.winners.length;
    for (const w of pot.winners) awards[w] += share;
    const ranked = order.filter(id => pot.winners.includes(id));
    const fallback = pot.winners.filter(id => !ranked.includes(id));
    for (const w of [...ranked, ...fallback]) {
      if (rem <= 0) break;
      awards[w] += 1; rem -= 1;
    }
  }
  return { awards, pots, rake: rakeTaken, uncalledReturned: returned };
}

// Total chips in contested pots (everything except uncalled bets) — the rake base.
export function contestedTotal(contributions) {
  const vals = Object.values(contributions).sort((a, b) => b - a);
  const total = vals.reduce((a, b) => a + b, 0);
  const uncalled = vals.length > 1 ? Math.max(0, vals[0] - vals[1]) : 0;
  return total - uncalled;
}

// Cash-game rake: percentage of the pot with a cap, nothing when the flop is not seen.
export function computeRake(contested, { pct = 0, cap = Infinity, noFlopNoDrop = true } = {}, sawFlop = true) {
  if (!(pct > 0)) return 0;
  if (noFlopNoDrop && !sawFlop) return 0;
  return Math.min(Math.floor(contested * pct), cap);
}
