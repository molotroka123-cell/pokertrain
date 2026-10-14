// ai-arena.mjs — local lightning poker tournament between AIs on the app's own engine.
//
//   node tools/ai-arena.mjs --seed 7 --out arena.json [--hands 150] [--models qwen27,qwenfast] [--sims 100000]
//
// Seats: MathBot (equity + pot odds), local LLMs via Ollama (127.0.0.1:11434), and the app's AdaptiveAI bots.
// «Not sure» rule (owner 14.10): when a player is unsure — MathBot: equity within 6 pp of the pot odds; an LLM: its own
// confidence < 0.7 or no valid answer — the arena plays THAT exact spot (hero cards + board vs the live opponents'
// random hands) N times (default 100 000, split over worker threads) and decides/re-asks with the exact probability.
// Everything is recorded: every decision, every 100k simulation, the final standings. Local only, no money.
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { GameEngine } from '../src/engine/GameEngine.js';
import { seedRng } from '../src/engine/deck.js';
import { generateProfile } from '../src/data/aiProfiles.js';
import { AdaptiveAI } from '../src/engine/adaptiveAI.js';
import { calculateEquity, potOdds, callEV } from '../src/engine/equity.js';

const argv = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const SEED = Number(argv.seed || 7);
const MAX_HANDS = Number(argv.hands || 150);
const SIMS = Number(argv.sims || 100000);
const OUT = argv.out || 'arena.json';
const OLLAMA = argv.ollama || 'http://127.0.0.1:11434';
const MODELS = { qwen27: 'bossman-main-qwen38-27b-q5:latest', qwenfast: 'bossman-fast-qwen36-35b-a3b-q5:latest',
                 uncensored: 'bossman-community-qwen-uncensored:latest' };
const LLM_SEATS = (argv.models || 'qwen27,qwenfast').split(',').filter(Boolean);
const START = 1500, LEVEL_HANDS = 6;

// ---------------------------------------------------------------- 100k simulation on worker threads
if (process.env.ARENA_WORKER === '1') {
  const { parentPort, workerData } = await import('node:worker_threads');
  const { cards, board, opp, n, seed } = workerData;
  parentPort.postMessage(calculateEquity(cards, board, opp, n, { seed }).equity);
  process.exit(0);
}
const POOL = Math.max(2, Math.min(16, cpus().length - 2));
const sims = [];
async function exactEquity(cards, board, opp, why) {
  const t = Date.now(), per = Math.ceil(SIMS / POOL);
  const parts = await Promise.all(Array.from({ length: POOL }, (_, i) => new Promise((res, rej) => {
    const w = new Worker(fileURLToPath(import.meta.url), { env: { ...process.env, ARENA_WORKER: '1' },
      workerData: { cards, board, opp, n: per, seed: SEED * 100003 + sims.length * 97 + i } });
    w.once('message', res); w.once('error', rej);
  })));
  const eq = parts.reduce((a, b) => a + b, 0) / parts.length;
  const rec = { cards, board, opp, sims: per * POOL, equity: +eq.toFixed(4), ms: Date.now() - t, why };
  sims.push(rec);
  return rec;
}

// ---------------------------------------------------------------- brains
const log = [];
const raiseTo = (gs, x) => Math.max(gs.toCall + gs.bigBlind, Math.round(x));
const allIn = (gs) => ({ action: 'raise', amount: gs.myChips + (gs.currentBet - gs.toCall > 0 ? gs.currentBet - gs.toCall : 0) });

class MathBot {
  constructor(name) { this.name = name; }
  async decide(gs) {
    const opp = Math.max(1, (gs.playersInHand || 2) - 1);
    let eq = calculateEquity(gs.holeCards, gs.community, opp, 2000, { seed: SEED + gs.pot }).equity;
    const po = potOdds(gs.toCall, gs.pot);
    let sim = null;
    if (gs.toCall > 0 && Math.abs(eq - po) < 0.06) {        // not sure -> play the spot 100k times
      sim = await exactEquity(gs.holeCards, gs.community, opp, `MathBot: эквити ${(eq * 100).toFixed(1)}% у границы шансов банка ${(po * 100).toFixed(1)}%`);
      eq = sim.equity;
    }
    const stackBB = gs.myChips / gs.bigBlind;
    let d;
    if (gs.toCall > 0) {
      if (gs.stage === 'preflop' && stackBB <= 12 && eq > po + 0.04) d = allIn(gs);
      else d = callEV(eq, gs.pot, gs.toCall) > 0 ? { action: 'call' } : { action: 'fold' };
    } else d = eq >= 0.62 ? { action: 'raise', amount: raiseTo(gs, gs.currentBet + gs.pot * 0.66) } : { action: 'check' };
    log.push({ who: this.name, stage: gs.stage, cards: gs.holeCards, board: gs.community, pot: gs.pot, toCall: gs.toCall,
               equity: +eq.toFixed(4), potOdds: +po.toFixed(4), sim100k: !!sim, action: d.action });
    return d;
  }
}

async function ollama(model, prompt) {
  const body = { model, stream: false, think: false, keep_alive: '10m', format: 'json',
                 options: { temperature: 0.2, num_predict: 200 }, messages: [{ role: 'user', content: prompt }] };
  const r = await fetch(OLLAMA + '/api/chat', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  const j = await r.json();
  return (j.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '');
}

class LLMBot {
  constructor(name, model) { this.name = name; this.model = model; this.calls = 0; this.unsure = 0; }
  prompt(gs, exact) {
    return `Ты игрок в турнирный покер (быстрый турнир, 6 игроков). Улица: ${gs.stage}. Твои карты: ${gs.holeCards.join(' ')}. ` +
      `Борд: ${gs.community.join(' ') || 'нет'}. Банк: ${gs.pot}. К коллу: ${gs.toCall}. Твой стек: ${gs.myChips}. Большой блайнд: ${gs.bigBlind}. ` +
      `Соперников в раздаче: ${Math.max(1, (gs.playersInHand || 2) - 1)}.` +
      (exact ? ` ТОЧНАЯ вероятность выигрыша по ${exact.sims} симуляциям этой раскладки: ${(exact.equity * 100).toFixed(1)}%; шансы банка требуют ${(potOdds(gs.toCall, gs.pot) * 100).toFixed(1)}%.` : '') +
      ` Ответь JSON: {"action":"fold|check|call|raise|allin","raise_to":число или 0,"confidence":0..1}.`;
  }
  parse(text, gs) {
    try {
      const d = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '');
      const a = String(d.action || '').toLowerCase();
      if (!['fold', 'check', 'call', 'raise', 'allin', 'all-in', 'bet'].includes(a)) return null;
      let act;
      if (a === 'allin' || a === 'all-in') act = allIn(gs);
      else if (a === 'raise' || a === 'bet') act = { action: 'raise', amount: raiseTo(gs, Number(d.raise_to) || gs.currentBet * 2 + gs.bigBlind) };
      else if (a === 'check' && gs.toCall > 0) act = { action: 'fold' };
      else if (a === 'call' && gs.toCall <= 0) act = { action: 'check' };
      else act = { action: a };
      return { act, conf: Math.max(0, Math.min(1, Number(d.confidence) || 0)) };
    } catch { return null; }
  }
  async decide(gs) {
    const t = Date.now(); this.calls += 1;
    let r = this.parse(await ollama(this.model, this.prompt(gs, null)).catch(() => ''), gs);
    let sim = null;
    if (!r || r.conf < 0.7) {                               // not sure -> 100k simulation, ask again with the exact number
      this.unsure += 1;
      sim = await exactEquity(gs.holeCards, gs.community, Math.max(1, (gs.playersInHand || 2) - 1),
        `${this.name}: уверенность ${r ? r.conf : 'нет ответа'} < 0.7`);
      this.calls += 1;
      r = this.parse(await ollama(this.model, this.prompt(gs, sim)).catch(() => ''), gs) || r;
    }
    const d = r?.act || (gs.toCall <= 0 ? { action: 'check' } : { action: 'fold' });
    log.push({ who: this.name, stage: gs.stage, cards: gs.holeCards, board: gs.community, pot: gs.pot, toCall: gs.toCall,
               confidence: r?.conf ?? null, sim100k: sim ? sim.equity : null, action: d.action, ms: Date.now() - t });
    return d;
  }
}

class EngineBot {                                            // the app's own AdaptiveAI, logged
  constructor(name, profile) { this.name = name; this.ai = new AdaptiveAI(profile); }
  async decide(gs) { const d = await this.ai.decide(gs); log.push({ who: this.name, stage: gs.stage, action: d.action }); return d; }
}

// ---------------------------------------------------------------- tournament
seedRng(SEED);
const t0 = Date.now();
const seats = [
  { name: 'MathBot-100k', brain: new MathBot('MathBot-100k') },
  ...LLM_SEATS.map(k => ({ name: k, brain: new LLMBot(k, MODELS[k] || k) })),
  ...['TAG', 'LAG', 'Nit'].slice(0, 6 - 1 - LLM_SEATS.length).map((n, i) =>
    ({ name: `Engine-${n}`, brain: new EngineBot(`Engine-${n}`, generateProfile(3000 + i, i === 1 ? 'pro' : 'mid')) })),
];
const players = seats.map((s, i) => ({ id: 'p' + i, name: s.name, chips: START, isHero: false, eliminated: false }));
const bots = Object.fromEntries(players.map((p, i) => [p.id, seats[i].brain]));
const bustOrder = [];
let dealer = 0, hand = 0;
while (hand < MAX_HANDS && players.filter(p => !p.eliminated).length > 1) {
  hand += 1;
  const lvl = Math.floor((hand - 1) / LEVEL_HANDS);
  const bb = 20 * 2 ** lvl, blinds = { sb: bb / 2, bb, ante: lvl >= 3 ? bb / 10 : 0 };
  const live = players.filter(p => !p.eliminated);
  const engine = new GameEngine();
  engine.setSpeedMultiplier(0.0001);
  engine.startHand(live, dealer % live.length, blinds, bots, {});
  dealer += 1;
  await engine.runHand(() => {});
  for (const p of live) if (p.chips <= 0 && !p.eliminated) { p.eliminated = true; bustOrder.push({ name: p.name, hand }); }
  if (hand % 10 === 0) console.log(`hand ${hand} bb ${bb}: ` + live.map(p => `${p.name} ${p.chips}`).join(' | '));
}
const standings = [...players.filter(p => !p.eliminated).sort((a, b) => b.chips - a.chips).map(p => ({ name: p.name, chips: p.chips })),
                   ...bustOrder.reverse().map(b => ({ name: b.name, chips: 0, bustedHand: b.hand }))];
const llm = seats.filter(s => s.brain instanceof LLMBot).map(s => ({ name: s.name, model: s.brain.model, calls: s.brain.calls, unsureAsked100k: s.brain.unsure }));
const summary = { seed: SEED, hands: hand, sims_per_unsure_spot: SIMS, workers: POOL, unsure_spots_simulated: sims.length,
                  avg_sim_ms: sims.length ? Math.round(sims.reduce((a, s) => a + s.ms, 0) / sims.length) : 0,
                  standings, llm, elapsed_s: (Date.now() - t0) / 1000 };
writeFileSync(OUT, JSON.stringify({ source: 'tools/ai-arena.mjs', summary, sims, log }, null, 1));
console.log(JSON.stringify(summary, null, 1));
process.exit(0);
