import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHandHistory, analyzeRealHands } from '../src/lib/hhParser.js';
import { isVpipAction, isPfrAction } from '../src/lib/statDefs.js';

test('statDefs: VPIP = voluntarily put chips in; a BB check or a fold is not', () => {
  for (const a of ['call', 'calls', 'raise', 'raises', 'bet', 'bets', 'allin']) assert.equal(isVpipAction(a), true, a);
  for (const a of ['fold', 'folds', 'check', 'checks', 'bb_walk', undefined]) assert.equal(isVpipAction(a), false, String(a));
  assert.equal(isPfrAction('raise'), true);
  assert.equal(isPfrAction('raises'), true);
  assert.equal(isPfrAction('call'), false);
});

test('hhParser analysis: a folded hand is not counted as VPIP', () => {
  const base = readFileSync(new URL('./fixtures/gg_sample.txt', import.meta.url), 'utf8');
  const folded = base.replace('Hero: raises 400 to 600', 'Hero: folds').replace(/Hero: bets 700\n/, '').replace(/Hero collected.*\n?/, '');
  const hands = parseHandHistory(base + '\n' + folded.replace('#TM100001', '#TM100002'));
  assert.equal(hands.length, 2);
  const a = analyzeRealHands(hands);
  assert.equal(a.totalHands, 2);
  assert.equal(a.vpip, 50);
  assert.equal(a.pfr, 50);
});
