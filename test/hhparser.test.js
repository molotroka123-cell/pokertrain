import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHandHistory } from '../src/lib/hhParser.js';
import { getPositions } from '../src/engine/positions.js';

const text = readFileSync(new URL('./fixtures/gg_sample.txt', import.meta.url), 'utf8');

test('hhParser: raise amount is the raise-to total, not the increment', () => {
  const [h] = parseHandHistory(text);
  const raise = h.allActions.find(a => a.isHero && a.street === 'preflop');
  assert.equal(raise.action, 'raises');
  assert.equal(raise.amount, 600);
});

test('hhParser: hero position uses the same labels as the engine (button = seat 4, hero seat 1)', () => {
  const [h] = parseHandHistory(text);
  // 6 seats, button index 3 -> hero idx 0 is 3 seats after the BB (idx 5): UTG
  assert.equal(h.position, getPositions(6, 3)[0]);
  assert.equal(h.position, 'UTG');
});

test('hhParser: hero on the button is BTN, SB and BB are recognised', () => {
  const asBtn = text.replace('Seat #4 is the button', 'Seat #1 is the button');
  assert.equal(parseHandHistory(asBtn)[0].position, 'BTN');
  const asSb = text.replace('Seat #4 is the button', 'Seat #6 is the button');
  assert.equal(parseHandHistory(asSb)[0].position, 'SB');
  const asBb = text.replace('Seat #4 is the button', 'Seat #5 is the button');
  assert.equal(parseHandHistory(asBb)[0].position, 'BB');
});

test('hhParser: result and blinds', () => {
  const [h] = parseHandHistory(text);
  assert.equal(h.result, 'won');
  assert.equal(h.potWon, 1500);
  assert.deepEqual([h.blinds.sb, h.blinds.bb], [100, 200]);
  assert.equal(h.holeCards, 'Ah Kd');
});
