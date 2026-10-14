// gto-lab.mjs — seeded mini-tournament on the app's own engine that records the MATH of every hero decision.
//
//   node tools/gto-lab.mjs --hands 1000 --seed 14 --out lab.json --spots spots.jsonl
//
// Re-entry 6-max tournament: stacks persist, blinds x1.25 every 50 hands (ante from level 6), busted players
// re-enter with the starting stack — so 1000 hands cover 100 BB down to push/fold depths.
// Every hero decision gets: equity (Monte Carlo vs the live opponents' RANDOM hands), pot odds, required equity,
// EV(call)/EV(fold) in chips and BB, SPR, stack in BB, and the math-best action.
// HONEST LIMIT: equity vs random hands is a math baseline, not a full GTO solution (no ranges/solver) — see the
// `reference` field on every spot.
// Local only: no network, no real money.
import { writeFileSync } from 'node:fs';
import { GameEngine } from '../src/engine/GameEngine.js';
import { seedRng } from '../src/engine/deck.js';
import { generateProfile } from '../src/data/aiProfiles.js';
import { AdaptiveAI } from '../src/engine/adaptiveAI.js';
import { getHandValue } from '../src/engine/ranges.js';
import { calculateEquity, potOdds, spr } from '../src/engine/equity.js';

const argv = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const HANDS = Number(argv.hands || 1000);
const SEED = Number(argv.seed || 14);
const OUT = argv.out || 'gto-lab.json';
const SPOTS = argv.spots || 'gto-spots.jsonl';
const ITER = Number(argv.iter || 2000);
const START = 5000, LEVEL_HANDS = 50, GROWTH = 1.25;

seedRng(SEED);
const t0 = Date.now();
const NAMES = ['Hero', 'Ann', 'Bob', 'Cid', 'Dan', 'Eve'];
const players = NAMES.map((name, i) => ({ id: 'p' + i, name, chips: START, isHero: i === 0, eliminated: false,
  profile: i === 0 ? null : generateProfile(2000 + i, 'mid') }));
const bots = {};
for (const p of players) if (!p.isHero) bots[p.id] = new AdaptiveAI(p.profile);

const level = (h) => Math.floor((h - 1) / LEVEL_HANDS);
const blindsFor = (h) => {
  const bb = Math.round(50 * GROWTH ** level(h) / 10) * 10;
  return { sb: Math.round(bb / 2), bb, ante: level(h) >= 5 ? Math.round(bb / 10) : 0 };
};

const spots = [];
let cur = null;           // current hand context for the decision hook

function mathOf(s, blinds) {
  const opp = Math.max(1, s.players.filter(p => !p.folded && !p.isHero && !p.eliminated).length);
  const eq = calculateEquity(s.heroCards, s.community, opp, ITER, { seed: SEED * 7919 + cur.hand * 31 + s.community.length }).equity;
  const heroStack = s.players.find(p => p.isHero)?.chips ?? 0;
  const toCall = Math.max(0, s.toCall);
  const po = potOdds(toCall, s.pot);
  const evCall = toCall > 0 ? eq * (s.pot + toCall) - toCall : null;           // chips, vs a bet; showdown value
  const stackBB = heroStack / blinds.bb;
  let best, why;
  if (toCall > 0) {
    best = evCall > 0 ? 'call' : 'fold';
    why = `EV(колл)=${evCall.toFixed(0)} фишек: эквити ${(eq * 100).toFixed(1)}% ${evCall > 0 ? '>' : '≤'} требуемое ${(po * 100).toFixed(1)}%`;
    if (s.phase === 'preflop' && stackBB <= 15 && eq > po + 0.08) { best = 'allin'; why += '; стек ≤15 BB и запас эквити — пуш'; }
  } else {
    best = eq >= 0.6 ? 'bet' : 'check';
    why = `ставки нет: эквити ${(eq * 100).toFixed(1)}% ${eq >= 0.6 ? '≥ 60% — ставка за value' : '< 60% — чек'}`;
  }
  return { equity: +eq.toFixed(4), opponents: opp, pot: s.pot, toCall, potOdds: +po.toFixed(4),
           requiredEquity: +po.toFixed(4), evCall: evCall == null ? null : Math.round(evCall),
           evCallBB: evCall == null ? null : +(evCall / blinds.bb).toFixed(2), evFold: 0,
           heroStack, stackBB: +stackBB.toFixed(1), spr: Number.isFinite(spr(heroStack, s.pot)) ? +spr(heroStack, s.pot).toFixed(2) : null,
           mathBest: best, why, reference: 'equity_vs_random_hands_montecarlo' };
}

function heroDecision(s, blinds) {
  // The «student»: a simple rule bot, so the lab has deviations to measure against the math.
  const [a, b] = s.heroCards;
  const bb = blinds.bb;
  const canCheck = s.toCall <= 0;
  if (s.phase === 'preflop') {
    const v = getHandValue(a, b);
    if (v <= 0.12) return { action: 'raise', amount: Math.min(s.maxRaise, Math.max(s.minRaise, Math.max(s.currentBet * 3, bb * 3))) };
    if (v <= 0.22 && s.toCall <= bb * 3) return canCheck ? { action: 'check' } : { action: 'call' };
    return canCheck ? { action: 'check' } : { action: 'fold' };
  }
  const eq = calculateEquity(s.heroCards, s.community, Math.max(1, s.players.filter(p => !p.folded && !p.isHero).length), 300, { seed: SEED + s.pot + s.community.length }).equity;
  if (canCheck) return eq > 0.68 ? { action: 'raise', amount: Math.min(s.maxRaise, Math.max(s.minRaise, Math.round(s.pot * 0.6))) } : { action: 'check' };
  return eq > potOdds(s.toCall, s.pot) + 0.05 ? { action: 'call' } : { action: 'fold' };
}

const handSummaries = [];
let dealer = 0, reentries = 0;
for (let h = 1; h <= HANDS; h++) {
  for (const p of players) if (p.chips <= 0) { p.chips = START; p.eliminated = false; reentries += 1; }
  const blinds = blindsFor(h);
  const engine = new GameEngine();
  engine.setSpeedMultiplier(0.0001);
  const before = players[0].chips;
  engine.startHand(players, dealer, blinds, bots, {});
  dealer = (dealer + 1) % players.length;
  const heroCards = engine.getHeroCards();
  cur = { hand: h };
  let waiting = false;
  await engine.runHand((state) => {
    if (state.waitingForHero && !waiting) {
      waiting = true;
      const m = mathOf(state, blinds);
      const d = heroDecision(state, blinds);
      const taken = d.action === 'raise' && state.toCall <= 0 ? 'bet' : d.action;
      const agrees = taken === m.mathBest || (m.mathBest === 'allin' && taken === 'raise') ||
        (m.mathBest === 'call' && taken === 'raise') || (m.mathBest === 'bet' && taken === 'raise');
      const evLostBB = !agrees && m.evCallBB != null
        ? +Math.abs(taken === 'fold' ? m.evCallBB : (taken === 'call' ? Math.min(0, m.evCallBB) : 0)).toFixed(2) : 0;
      spots.push({ hand: h, level: level(h) + 1, blinds, stage: state.phase, position: engine.positions[0],
                   heroCards: [...state.heroCards], board: [...state.community], ...m,
                   taken, amount: d.amount ?? null, agreesWithMath: agrees, evLostBB });
      setTimeout(() => { waiting = false; engine.submitHeroAction(d.action, d.amount); }, 0);
    }
  });
  handSummaries.push({ hand: h, level: level(h) + 1, position: engine.positions[0], holeCards: heroCards,
                       chipsBefore: before, chipsAfter: players[0].chips, netProfit: players[0].chips - before });
}

const byStage = {};
for (const s of spots) {
  const k = s.stage; byStage[k] ??= { spots: 0, agree: 0, evLostBB: 0 };
  byStage[k].spots += 1; byStage[k].agree += s.agreesWithMath ? 1 : 0; byStage[k].evLostBB += s.evLostBB;
}
const summary = { hands: HANDS, seed: SEED, iterations: ITER, spots: spots.length, reentries,
                  agreement: +(spots.filter(s => s.agreesWithMath).length / Math.max(1, spots.length)).toFixed(3),
                  evLostBB: +spots.reduce((a, s) => a + s.evLostBB, 0).toFixed(1), byStage,
                  finalLevel: level(HANDS) + 1, finalBlinds: blindsFor(HANDS), elapsed_s: (Date.now() - t0) / 1000 };
writeFileSync(SPOTS, spots.map(s => JSON.stringify(s)).join('\n') + '\n');
writeFileSync(OUT, JSON.stringify({ source: 'tools/gto-lab.mjs', summary, handSummaries }, null, 1));
console.log(JSON.stringify(summary));
process.exit(0);
