// statDefs.js — single definition of the preflop stats used across the app.
// VPIP: the hero voluntarily put chips in preflop (call / raise / bet / all-in).
//       Folding, a BB check (free option) and a BB walk do NOT count.
// PFR:  the hero raised preflop.
// Accepts both the app's own action names ('call', 'raise') and the parser's ('calls', 'raises').
const NON_VPIP = new Set(['fold', 'folds', 'check', 'checks', 'bb_walk', '', undefined, null]);

export function isVpipAction(action) {
  return !NON_VPIP.has(action);
}

export function isPfrAction(action) {
  return action === 'raise' || action === 'raises' || action === 'bet' || action === 'bets';
}
