// Test helpers: drive the real GameEngine headlessly with scripted bots and a stacked deck.
import { GameEngine } from '../src/engine/GameEngine.js';

// A bot that plays a fixed list of decisions (then checks/calls).
export function scriptedBot(script) {
  const queue = [...script];
  return {
    async decide(gs) {
      const next = queue.shift();
      if (next) return typeof next === 'function' ? next(gs) : next;
      return gs.toCall > 0 ? { action: 'call' } : { action: 'check' };
    },
    endHand() {},
    observeShowdown() {},
  };
}

// Play one full hand. `seats` = [{ id, chips, script }], dealerIdx, blinds,
// `holes` = { id: ['As','Kd'] }, `board` = 5 cards (flop3, turn, river).
export async function playStacked({ seats, dealerIdx = 0, blinds = { sb: 5, bb: 10, ante: 0 }, holes, board, options }) {
  const engine = new GameEngine();
  engine.setSpeedMultiplier(0.0001); // 0 is falsy in the engine and would mean 1x
  const players = seats.map(s => ({ id: s.id, name: s.id, chips: s.chips }));
  const bots = {};
  for (const s of seats) bots[s.id] = scriptedBot(s.script || []);
  const ok = engine.startHand(players, dealerIdx, blinds, bots, options);
  if (!ok) throw new Error('startHand failed');
  if (holes) for (const [id, cards] of Object.entries(holes)) engine.holeCards[id] = cards;
  if (board) {
    // burn, flop x3, burn, turn, burn, river
    engine.deck = ['2h', ...board.slice(0, 3), '2h', board[3], '2h', board[4]];
  }
  const before = Object.fromEntries(players.map(p => [p.id, p.chips + (engine._startChips[p.id] - p.chips)]));
  await engine.runHand(() => {});
  const chips = Object.fromEntries(engine.players.map(p => [p.id, p.chips]));
  return { engine, chips, start: engine._startChips, before };
}
