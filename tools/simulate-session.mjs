// simulate-session.mjs — headless, seeded cash-game session on the app's own engine,
// written in the same JSON shape as the in-app "Export session" (handSummaries + records).
//
//   node tools/simulate-session.mjs --hands 300 --seed 7 --stake NL10 --out session.json
//
// Local only: no network, no real money, no third-party site. The hero is a fixed, simple rule bot
// (so the report has something to analyse); opponents are the app's AdaptiveAI profiles.
import { writeFileSync } from 'node:fs';
import { GameEngine } from '../src/engine/GameEngine.js';
import { seedRng } from '../src/engine/deck.js';
import { generateProfile } from '../src/data/aiProfiles.js';
import { AdaptiveAI } from '../src/engine/adaptiveAI.js';
import { CASH_FORMATS } from '../src/data/cashFormats.js';
import { getHandValue } from '../src/engine/ranges.js';
import { calculateEquity, potOdds } from '../src/engine/equity.js';

const argv = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const HANDS = Number(argv.hands || 200);
const SEED = Number(argv.seed || 1);
const STAKE = argv.stake || 'NL10';
const OUT = argv.out || 'session.json';
const fmt = CASH_FORMATS[STAKE];
if (!fmt) { console.error('unknown stake', STAKE, Object.keys(CASH_FORMATS).join(',')); process.exit(2); }

seedRng(SEED);
const t0 = Date.now();
const NAMES = ['Hero', 'Ann', 'Bob', 'Cid', 'Dan', 'Eve'];
const players = NAMES.map((name, i) => ({ id: 'p' + i, name, chips: fmt.buyIn, isHero: i === 0, eliminated: false,
  profile: i === 0 ? null : generateProfile(1000 + i, fmt.fieldLevel || 'micro') }));
const bots = {};
for (const p of players) if (!p.isHero) bots[p.id] = new AdaptiveAI(p.profile);
const blinds = { sb: fmt.smallBlind, bb: fmt.bigBlind, ante: 0 };
const rake = { pct: fmt.rake, cap: fmt.rakeCap, noFlopNoDrop: true };

function heroDecision(s) {
  const [a, b] = s.heroCards;
  const bb = blinds.bb;
  const canCheck = s.toCall <= 0;
  if (s.phase === 'preflop') {
    const v = getHandValue(a, b); // 0 strongest .. 1 weakest
    if (v <= 0.12) return { action: 'raise', amount: Math.min(s.maxRaise, Math.max(s.minRaise, Math.max(s.currentBet * 3, bb * 3))) };
    if (v <= 0.22 && s.toCall <= bb * 3) return canCheck ? { action: 'check' } : { action: 'call' };
    return canCheck ? { action: 'check' } : { action: 'fold' };
  }
  const eq = calculateEquity(s.heroCards, s.community, Math.max(1, s.players.filter(p => !p.folded && !p.isHero).length), 300, { seed: SEED + s.pot + s.community.length }).equity;
  if (canCheck) return eq > 0.68 ? { action: 'raise', amount: Math.min(s.maxRaise, Math.max(s.minRaise, Math.round(s.pot * 0.6))) } : { action: 'check' };
  return eq > potOdds(s.toCall, s.pot) + 0.05 ? { action: 'call' } : { action: 'fold' };
}

const handSummaries = [];
const records = [];
let rakeTotal = 0;
let dealer = 0;

for (let h = 1; h <= HANDS; h++) {
  for (const p of players) { p.chips = fmt.buyIn; p.eliminated = false; }
  const engine = new GameEngine();
  engine.setSpeedMultiplier(0.0001);
  engine.startHand(players, dealer, blinds, bots, { rake });
  dealer = (dealer + 1) % players.length;
  const hero = players[0];
  const heroCards = engine.getHeroCards();
  let waitingFor = false;
  await engine.runHand((state) => {
    if (state.waitingForHero && !waitingFor) {
      waitingFor = true;
      const d = heroDecision(state);
      setTimeout(() => { waitingFor = false; engine.submitHeroAction(d.action, d.amount); }, 0);
    }
  });
  const acts = engine.actionLog.filter(l => l.isHero && ['fold', 'check', 'call', 'raise'].includes(l.action));
  const net = hero.chips - fmt.buyIn;
  rakeTotal += engine.rakeTaken || 0;
  handSummaries.push({
    hand: h,
    position: engine.positions[0],
    holeCards: heroCards,
    actions: acts.map(a => ({ stage: a._phase || 'preflop', action: a.action, amount: a.action === 'raise' ? a.amount : null })),
    chipsBefore: fmt.buyIn, chipsAfter: hero.chips, netProfit: net,
    result: net > 0 ? 'won' : net < 0 ? 'lost' : 'even',
    isSplitPot: engine.isSplitPot || false, mistake: null, evLost: 0, rake: engine.rakeTaken || 0,
  });
  records.push({ handNumber: h, blinds: { sb: blinds.sb, bb: blinds.bb }, stage: 'preflop' });
}

const out = {
  sessionId: `sim_${STAKE}_seed${SEED}`,
  source: 'headless simulation of the Poker Train engine (tools/simulate-session.mjs)',
  stake: STAKE, seed: SEED,
  rake: { pct: rake.pct, cap_chips: rake.cap, no_flop_no_drop: true, total_chips: rakeTotal },
  totalHands: HANDS,
  handSummaries, records,
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`wrote ${OUT}: ${HANDS} hands, ${((Date.now() - t0) / 1000).toFixed(1)} s, rake ${rakeTotal} chips`);
process.exit(0);
