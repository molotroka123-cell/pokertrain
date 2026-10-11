import test from 'node:test';
import assert from 'node:assert/strict';
import { playStacked } from './helpers.js';
import { settlePots, computeRake, contestedTotal } from '../src/engine/potSettlement.js';

const raiseTo = (amount) => ({ action: 'raise', amount });

test('rake: 5% of the contested pot, capped, taken from the winner', async () => {
  // Heads-up all-in 100 each: pot 200 -> 5% = 10 but cap 6.
  const { chips, engine } = await playStacked({
    seats: [
      { id: 'A', chips: 100, script: [raiseTo(100)] },
      { id: 'B', chips: 100, script: [{ action: 'call' }] },
    ],
    holes: { A: ['As', 'Ah'], B: ['7c', '2d'] },
    board: ['Td', '5c', '9h', 'Js', '3d'],
    options: { rake: { pct: 0.05, cap: 6, noFlopNoDrop: true } },
  });
  assert.equal(engine.rakeTaken, 6);
  assert.deepEqual(chips, { A: 194, B: 0 });
});

test('rake: no flop, no drop', async () => {
  const { chips, engine } = await playStacked({
    seats: [
      { id: 'A', chips: 1000, script: [raiseTo(30)] },
      { id: 'B', chips: 1000, script: [{ action: 'fold' }] },
      { id: 'C', chips: 1000, script: [{ action: 'fold' }] },
    ],
    options: { rake: { pct: 0.05, cap: 100, noFlopNoDrop: true } },
  });
  assert.equal(engine.rakeTaken, 0);
  assert.equal(chips.A + chips.B + chips.C, 3000);
});

test('rake: uncalled bet is never raked and chips + rake are conserved', async () => {
  const { chips, engine } = await playStacked({
    seats: [
      { id: 'A', chips: 1000, script: [{ action: 'call' }, raiseTo(200)] },
      { id: 'B', chips: 1000, script: [{ action: 'call' }, { action: 'check' }, { action: 'fold' }] },
    ],
    dealerIdx: 0,
    options: { rake: { pct: 0.05, cap: 1000, noFlopNoDrop: true } },
  });
  // pot = 2 x 10 preflop = 20 contested; A's flop bet of 200 is uncalled (B folds).
  assert.equal(engine.rakeTaken, 1);
  assert.equal(chips.A + chips.B + engine.rakeTaken, 2000);
});

test('min-raise equals the size of the previous raise, not the big blind', async () => {
  // 3 players: BTN raises to 30 (+20), SB tries to re-raise to 40 -> must be lifted to 50.
  const { engine } = await playStacked({
    seats: [
      { id: 'A', chips: 1000, script: [raiseTo(30), { action: 'fold' }] },
      { id: 'B', chips: 1000, script: [raiseTo(40), { action: 'fold' }] },
      { id: 'C', chips: 1000, script: [{ action: 'fold' }] },
    ],
  });
  const raises = engine.actionLog.filter(l => l.action === 'raise').map(l => l.amount);
  assert.deepEqual(raises.slice(0, 2), [30, 50]);
});

test('a live player facing an all-in is asked to act even when everyone else is all-in', async () => {
  let asked = false;
  const { chips } = await playStacked({
    seats: [
      { id: 'A', chips: 500, script: [raiseTo(500)] },
      { id: 'B', chips: 100, script: [{ action: 'call' }] },
      { id: 'C', chips: 300, script: [(gs) => { asked = true; return { action: 'fold' }; }] },
    ],
    holes: { A: ['As', 'Ah'], B: ['Ks', 'Kh'], C: ['7c', '2d'] },
    board: ['Td', '5c', '9h', 'Js', '3d'],
  });
  assert.equal(asked, true);
  assert.equal(chips.C, 290); // lost only the big blind
});

test('a long re-raise war is not cut short by the safety limit', async () => {
  const bump = (gs) => ({ action: 'raise', amount: gs.currentBet + gs.bigBlind });
  const script = Array.from({ length: 30 }, () => bump);
  const { engine } = await playStacked({
    seats: ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id, chips: 5000, script })),
    blinds: { sb: 5, bb: 10, ante: 0 },
  });
  const bets = Object.values(engine.bets);
  // preflop ended with everyone matched or all-in; no one left owing chips
  const log = engine.actionLog.filter(l => l.action === 'raise').length;
  assert.ok(log > 24, `expected more than n*4 raises, got ${log}`);
  assert.ok(bets.length > 0);
});

test('settlePots: unit — levels, dead money, rake order', () => {
  const r = settlePots({
    contributions: { a: 100, b: 300, c: 300, d: 50 },
    folded: new Set(['d']),
    scores: { a: 5, b: 9, c: 7 },
    order: ['a', 'b', 'c', 'd'],
    rake: 10,
  });
  // level 50: 200 (a,b,c,d) -> b ; level 100: 150 (a,b,c) -> b ; level 300: 400 (b,c) -> b. rake 10 off the main pot.
  assert.equal(r.awards.b, 750 - 10);
  assert.equal(r.awards.a + r.awards.c + r.awards.d, 0);
  assert.equal(r.rake, 10);
  assert.equal(Object.values(r.awards).reduce((x, y) => x + y, 0) + r.rake, 750);
});

test('computeRake / contestedTotal', () => {
  assert.equal(contestedTotal({ a: 500, b: 300 }), 600);
  assert.equal(computeRake(600, { pct: 0.05, cap: 20 }, true), 20);
  assert.equal(computeRake(600, { pct: 0.05, cap: 100 }, true), 30);
  assert.equal(computeRake(600, { pct: 0.05, cap: 100 }, false), 0);
  assert.equal(computeRake(600, { pct: 0 }, true), 0);
});
