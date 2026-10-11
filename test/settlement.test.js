import test from 'node:test';
import assert from 'node:assert/strict';
import { playStacked } from './helpers.js';

const allIn = (amount) => ({ action: 'raise', amount });

// Seat order [P0 BTN, P1 SB, P2 BB]; preflop action order with 3 players: P0, P1, P2.
test('side pot: uncalled part of the biggest stack is returned, not given to the 2nd best hand', async () => {
  // C=500 (BTN) shoves, A=100 (SB) and B=300 (BB) call all-in.
  // Hands: A best, B second, C worst. Levels: 100 -> A; 100..300 -> B; 300..500 uncalled -> C.
  const { chips } = await playStacked({
    seats: [
      { id: 'C', chips: 500, script: [allIn(500)] },
      { id: 'A', chips: 100, script: [{ action: 'call' }] },
      { id: 'B', chips: 300, script: [{ action: 'call' }] },
    ],
    holes: { A: ['As', 'Ah'], B: ['Ks', 'Kh'], C: ['7c', '2d'] },
    board: ['Td', '5c', '9h', 'Js', '3d'],
  });
  assert.deepEqual(chips, { C: 200, A: 300, B: 400 });
});

test('split pot between players with different investments only splits the levels they both covered', async () => {
  // BTN B=300, SB A=100, BB C=300. A and B tie for best (board plays A-K-9-8 + kicker), C loses.
  const { chips } = await playStacked({
    seats: [
      { id: 'B', chips: 300, script: [allIn(300)] },
      { id: 'A', chips: 100, script: [{ action: 'call' }] },
      { id: 'C', chips: 300, script: [{ action: 'call' }] },
    ],
    holes: { A: ['Ah', '4c'], B: ['As', '4d'], C: ['Qh', 'Jh'] },
    board: ['Kd', '9c', '7h', '2s', '8d'],
  });
  // level 100: 300 chips split A/B -> 150 each; level 100..300: 400 chips, only B and C contest -> B.
  assert.deepEqual(chips, { A: 150, B: 550, C: 0 });
});

test('three-way main pot split with an odd chip goes to the first winner left of the button', async () => {
  const { chips } = await playStacked({
    seats: [
      { id: 'A', chips: 101, script: [allIn(101)] },
      { id: 'B', chips: 101, script: [{ action: 'call' }] },
      { id: 'C', chips: 101, script: [{ action: 'call' }] },
    ],
    holes: { A: ['Ah', '4c'], B: ['As', '4d'], C: ['3h', '5h'] },
    board: ['Kd', '9c', '7h', '2s', '8d'],
  });
  // pot 303; C has pair of kings; A and B tie with aces... A,B ties => C loses. 303/2 = 151 rem 1 -> first left of button (B at idx1).
  assert.equal(chips.A + chips.B + chips.C, 303);
  assert.equal(chips.C, 0);
  assert.deepEqual([chips.A, chips.B].sort(), [151, 152]);
  assert.equal(chips.B, 152);
});

test('chips are conserved on random-looking multiway all-ins', async () => {
  for (let k = 0; k < 8; k++) {
    const { chips, start } = await playStacked({
      seats: [
        { id: 'P0', chips: 100 + 37 * k, script: [allIn(10000)] },
        { id: 'P1', chips: 220 + 11 * k, script: [{ action: 'call' }] },
        { id: 'P2', chips: 90 + 53 * k, script: [{ action: 'call' }] },
        { id: 'P3', chips: 400, script: [{ action: 'call' }] },
      ],
      dealerIdx: k % 4,
    });
    const tot = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    assert.equal(tot(chips), tot(start));
  }
});
