import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, seedRng, useCryptoRng, shuffle, cryptoRandom } from '../src/engine/deck.js';
import { evaluate5, evaluateHand } from '../src/engine/evaluator.js';
import { calculateEquity, potOdds, mRatio, spr } from '../src/engine/equity.js';
import { calculateICM } from '../src/engine/icm.js';

test('evaluator: exhaustive 5-card category counts match the known distribution', () => {
  const deck = createDeck();
  const counts = new Array(11).fill(0);
  const n = deck.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++)
      counts[evaluate5([deck[a], deck[b], deck[c], deck[d], deck[e]]).rank]++;
  assert.deepEqual(counts.slice(1), [
    1302540, // high card
    1098240, // pair
    123552,  // two pair
    54912,   // trips
    10200,   // straight (excl. straight flushes)
    5108,    // flush
    3744,    // full house
    624,     // quads
    36,      // straight flush (excl. royal)
    4,       // royal
  ]);
});

test('evaluator: ordering within categories and wheel', () => {
  const v = (s) => evaluateHand(s.split(' ').slice(0, 2), s.split(' ').slice(2)).value;
  assert.ok(v('As Ks Qs Js Ts') > v('9s 8s 7s 6s 5s'));
  assert.ok(v('As 2d 3c 4h 5s') < v('2d 3c 4h 5s 6s')); // wheel loses to 6-high straight
  assert.ok(v('Ah Ad Kc Kd 2s') > v('Qh Qd Jc Jd As'));
  assert.ok(v('Ah Ad Ac Kd Ks') > v('Kh Kd Kc Ad As'));
  assert.equal(v('Ah Kd 9c 7d 3s'), v('As Kc 9h 7s 3d')); // pure tie across suits
});

test('equity: Monte Carlo agrees with exact enumeration on a full board', () => {
  const hero = ['Ah', 'Kd'];
  const board = ['Ac', '7d', '2s', 'Kc', '9h'];
  const used = new Set([...hero, ...board]);
  const rest = createDeck().filter(c => !used.has(c));
  const h = evaluateHand(hero, board).value;
  let sum = 0, tot = 0;
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
    const o = evaluateHand([rest[i], rest[j]], board).value;
    sum += h > o ? 1 : h === o ? 0.5 : 0; tot++;
  }
  const exact = sum / tot;
  const mc = calculateEquity(hero, board, 1, 20000, { seed: 11 });
  assert.ok(Math.abs(mc.equity - exact) < 4 * mc.stdErr + 1e-9, `mc=${mc.equity} exact=${exact} se=${mc.stdErr}`);
  assert.ok(mc.ci95[0] <= exact && exact <= mc.ci95[1] + 0.01);
});

test('equity: known preflop values (AA vs 1 random ~85.2%, 72o ~34.5%)', () => {
  const aa = calculateEquity(['As', 'Ah'], [], 1, 20000, { seed: 5 });
  assert.ok(Math.abs(aa.equity - 0.852) < 0.012, aa.equity);
  const t = calculateEquity(['7c', '2d'], [], 1, 20000, { seed: 6 });
  assert.ok(Math.abs(t.equity - 0.345) < 0.012, t.equity);
});

test('equity: ties are split pro-rata, not as one half', () => {
  // Board is a royal flush: everyone ties; hero vs 2 random opponents must be exactly 1/3.
  const r = calculateEquity(['2c', '3d'], ['As', 'Ks', 'Qs', 'Js', 'Ts'], 2, 300, { seed: 1 });
  assert.ok(Math.abs(r.equity - 1 / 3) < 1e-12, r.equity);
});

test('equity: same seed gives the same estimate; different seeds differ', () => {
  const a = calculateEquity(['Qh', 'Jh'], ['2c', '7h', 'Th'], 2, 2000, { seed: 42 });
  const b = calculateEquity(['Qh', 'Jh'], ['2c', '7h', 'Th'], 2, 2000, { seed: 42 });
  const c = calculateEquity(['Qh', 'Jh'], ['2c', '7h', 'Th'], 2, 2000, { seed: 43 });
  assert.equal(a.equity, b.equity);
  assert.notEqual(a.equity, c.equity);
});

test('seedRng makes shuffles reproducible and useCryptoRng restores randomness', () => {
  seedRng(7); const a = shuffle(createDeck());
  seedRng(7); const b = shuffle(createDeck());
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, 52);
  useCryptoRng();
  const c = shuffle(createDeck()), d = shuffle(createDeck());
  assert.notDeepEqual(c, d);
  for (let i = 0; i < 50; i++) { const x = cryptoRandom(13); assert.ok(x >= 0 && x < 13); }
});

test('pot odds / M-ratio / SPR basics', () => {
  assert.equal(potOdds(50, 100), 50 / 150);
  assert.equal(potOdds(0, 100), 1); // documented convention: nothing to call
  assert.equal(mRatio(1500, 50, 100, 0, 9), 10);
  assert.equal(mRatio(1500, 50, 100, 10, 9), 1500 / 240);
  assert.equal(spr(300, 100), 3);
});

// Reference ICM: Malmuth-Harville by explicit permutation enumeration
function refICM(stacks, payouts) {
  const n = stacks.length, eq = new Array(n).fill(0);
  const total = stacks.reduce((a, b) => a + b, 0);
  (function rec(used, place, p) {
    if (place >= Math.min(payouts.length, n)) return;
    const left = total - used.reduce((a, i) => a + stacks[i], 0);
    for (let i = 0; i < n; i++) {
      if (used.includes(i)) continue;
      const q = p * stacks[i] / left;
      eq[i] += q * payouts[place];
      rec([...used, i], place + 1, q);
    }
  })([], 0, 1);
  return eq;
}

test('ICM equals the Malmuth-Harville reference and conserves the prize pool', () => {
  for (const [stacks, pay] of [[[5000, 3000, 2000], [50, 30, 20]], [[9000, 500, 400, 100], [60, 30, 10]], [[1, 1, 1, 1, 1, 1], [40, 25, 15, 10, 6, 4]]]) {
    const got = calculateICM(stacks, pay), ref = refICM(stacks, pay);
    got.forEach((g, i) => assert.ok(Math.abs(g - ref[i]) < 1e-9, `${i}: ${g} vs ${ref[i]}`));
    assert.ok(Math.abs(got.reduce((a, b) => a + b, 0) - pay.reduce((a, b) => a + b, 0)) < 1e-9);
  }
});
