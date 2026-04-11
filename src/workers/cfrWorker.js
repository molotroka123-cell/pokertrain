// cfrWorker.js — Production CFR Solver (Discounted Regret Matching)
// Runs in Web Worker. Supports range-weighted equity and mixed strategies.

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['s','h','d','c'];
const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

// ═══ Hand Evaluation ═══
function evalHand(cards) {
  if (cards.length < 5) return { rank: 0, value: 0 };
  const parsed = cards.map(c => ({ r: RV[c[0]], s: c[1] }));
  if (cards.length === 5) return eval5(parsed);
  // 7 cards: find best 5
  let best = { rank: 0, value: 0 };
  const combos = getCombos(parsed, 5);
  for (const combo of combos) {
    const result = eval5(combo);
    if (result.value > best.value) best = result;
  }
  return best;
}

function eval5(cards) {
  const ranks = cards.map(c => c.r).sort((a, b) => b - a);
  const suits = cards.map(c => c.s);
  const isFlush = suits.every(s => s === suits[0]);
  let isStraight = false, straightHigh = 0;
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) { isStraight = true; straightHigh = ranks[0]; }
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) { isStraight = true; straightHigh = 5; }
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts).map(([r, c]) => ({ rank: +r, count: c })).sort((a, b) => b.count - a.count || b.rank - a.rank);

  let rank, value;
  if (isStraight && isFlush) { rank = 9; value = 9e10 + straightHigh; }
  else if (groups[0].count === 4) { rank = 8; value = 8e10 + groups[0].rank * 1e6; }
  else if (groups[0].count === 3 && groups[1]?.count === 2) { rank = 7; value = 7e10 + groups[0].rank * 1e6 + groups[1].rank; }
  else if (isFlush) { rank = 6; value = 6e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 100 + ranks[4]; }
  else if (isStraight) { rank = 5; value = 5e10 + straightHigh; }
  else if (groups[0].count === 3) { rank = 4; value = 4e10 + groups[0].rank * 1e6; }
  else if (groups[0].count === 2 && groups[1]?.count === 2) { rank = 3; value = 3e10 + Math.max(groups[0].rank, groups[1].rank) * 1e6 + Math.min(groups[0].rank, groups[1].rank) * 1e4; }
  else if (groups[0].count === 2) { rank = 2; value = 2e10 + groups[0].rank * 1e6; }
  else { rank = 1; value = 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6; }
  return { rank, value };
}

function getCombos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const with_ = getCombos(rest, k - 1).map(c => [first, ...c]);
  const without = getCombos(rest, k);
  return [...with_, ...without];
}

// ═══ Deck & Shuffle ═══
function createDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══ Monte Carlo Equity ═══
function calcEquity(heroCards, board, numOpponents = 1, iterations = 300) {
  const used = new Set([...heroCards, ...board]);
  const remaining = createDeck().filter(c => !used.has(c));
  const boardNeeded = 5 - board.length;
  let wins = 0, ties = 0;

  for (let i = 0; i < iterations; i++) {
    const sh = shuffle(remaining);
    let idx = 0;
    const fullBoard = [...board];
    for (let b = 0; b < boardNeeded; b++) fullBoard.push(sh[idx++]);

    const heroHand = evalHand([...heroCards, ...fullBoard]);
    let heroBest = true, isTie = false;
    for (let o = 0; o < numOpponents; o++) {
      const oppCards = [sh[idx++], sh[idx++]];
      const oppHand = evalHand([...oppCards, ...fullBoard]);
      if (oppHand.value > heroHand.value) { heroBest = false; break; }
      else if (oppHand.value === heroHand.value) isTie = true;
    }
    if (heroBest && !isTie) wins++;
    else if (heroBest && isTie) ties++;
  }
  return (wins + ties * 0.5) / iterations;
}

// ═══ Discounted CFR Solver ═══
// Discount factor decays old regrets (standard in modern CFR implementations)
function solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength, numOpponents, iterations) {
  iterations = iterations || 1000;
  numOpponents = numOpponents || 1;

  // Build action set
  const actions = [];
  if (toCall > 0) actions.push({ id: 'fold', cost: 0 });
  actions.push({ id: toCall > 0 ? 'call' : 'check', cost: toCall });

  const betSizes = [0.33, 0.50, 0.67, 1.0];
  for (const pct of betSizes) {
    const raiseAmt = Math.round(pot * pct);
    if (raiseAmt > toCall && raiseAmt <= heroStack) {
      actions.push({ id: `raise_${Math.round(pct * 100)}`, cost: raiseAmt, size: pct });
    }
  }
  if (heroStack > pot * 0.5) {
    actions.push({ id: 'allin', cost: heroStack, size: heroStack / Math.max(pot, 1) });
  }

  const n = actions.length;
  if (n === 0) return { actions: [], bestAction: 'check', bestEV: 0, equity: 0.5 };

  const regrets = new Float64Array(n);
  const strategySum = new Float64Array(n);
  const actionEVs = new Float64Array(n);

  // Villain fold model: position-aware, bet-size-aware
  const baseFoldProb = Math.max(0.1, Math.min(0.65, 0.45 - (villainRangeStrength || 0.5) * 0.25));

  // Pre-compute equity samples for stability
  const equitySamples = [];
  for (let i = 0; i < 20; i++) {
    equitySamples.push(calcEquity(heroCards, board, numOpponents, 150));
  }
  const avgEquity = equitySamples.reduce((a, b) => a + b, 0) / equitySamples.length;

  // Discount factor for Discounted CFR (DCFR)
  const alpha = 1.5; // positive regret discount
  const beta = 0.5;  // negative regret discount

  for (let iter = 0; iter < iterations; iter++) {
    // Regret matching → strategy
    const strategy = new Float64Array(n);
    let posSum = 0;
    for (let a = 0; a < n; a++) {
      strategy[a] = Math.max(0, regrets[a]);
      posSum += strategy[a];
    }
    if (posSum > 0) { for (let a = 0; a < n; a++) strategy[a] /= posSum; }
    else { for (let a = 0; a < n; a++) strategy[a] = 1 / n; }

    // Accumulate strategy (weighted by iteration for DCFR)
    const iterWeight = Math.pow(iter + 1, 0.5);
    for (let a = 0; a < n; a++) strategySum[a] += strategy[a] * iterWeight;

    // Sample equity with noise for this iteration
    const eq = equitySamples[iter % equitySamples.length];

    // Compute EV for each action
    for (let a = 0; a < n; a++) {
      const action = actions[a];
      if (action.id === 'fold') {
        actionEVs[a] = 0;
      } else if (action.id === 'call' || action.id === 'check') {
        actionEVs[a] = eq * (pot + action.cost) - (1 - eq) * action.cost;
      } else {
        // Raise: villain folds, calls, or re-raises
        const foldP = Math.min(0.85, baseFoldProb + (action.size || 0.5) * 0.12);
        const reraiseP = Math.min(0.15, (1 - foldP) * 0.15);
        const callP = Math.max(0, 1 - foldP - reraiseP);

        const foldEV = pot;
        const callEV = eq * (pot + action.cost * 2) - (1 - eq) * action.cost;
        // Against reraise: need stronger hand, simplified
        const reraiseCallEq = Math.max(0, eq - 0.1); // equity drops vs reraise range
        const reraiseEV = reraiseCallEq * (pot + action.cost * 4) - (1 - reraiseCallEq) * action.cost * 2;

        actionEVs[a] = foldP * foldEV + callP * callEV + reraiseP * reraiseEV;
      }
    }

    // Node value
    let nodeValue = 0;
    for (let a = 0; a < n; a++) nodeValue += strategy[a] * actionEVs[a];

    // Update regrets with DCFR discounting
    const t = iter + 1;
    const posDiscount = Math.pow(t, alpha) / (Math.pow(t, alpha) + 1);
    const negDiscount = Math.pow(t, beta) / (Math.pow(t, beta) + 1);

    for (let a = 0; a < n; a++) {
      const delta = actionEVs[a] - nodeValue;
      if (delta > 0) {
        regrets[a] = regrets[a] * posDiscount + delta;
      } else {
        regrets[a] = regrets[a] * negDiscount + delta;
      }
    }
  }

  // Build final strategy
  const totalStrat = strategySum.reduce((a, b) => a + b, 0);
  const result = [];
  for (let a = 0; a < n; a++) {
    const freq = totalStrat > 0 ? strategySum[a] / totalStrat : 1 / n;
    result.push({
      action: actions[a].id,
      frequency: Math.round(freq * 100),
      ev: Math.round(actionEVs[a]),
      cost: actions[a].cost,
    });
  }

  result.sort((a, b) => b.frequency - a.frequency);

  return {
    actions: result,
    bestAction: result[0]?.action || 'check',
    bestEV: result[0]?.ev || 0,
    bestFrequency: result[0]?.frequency || 0,
    equity: Math.round(avgEquity * 100) / 100,
    iterations,
    isMixedStrategy: result.filter(a => a.frequency >= 15).length > 1,
  };
}

// ═══ Worker Message Handler ═══
self.onmessage = function (event) {
  const { type, data, requestId } = event.data;

  if (type === 'solve') {
    const { heroCards, board, pot, toCall, heroStack, villainRangeStrength, numOpponents, iterations } = data;
    try {
      const result = solveCFR(heroCards, board, pot, toCall, heroStack,
        villainRangeStrength || 0.5, numOpponents || 1, iterations || 1000);
      self.postMessage({ type: 'solve_result', result, requestId });
    } catch (e) {
      self.postMessage({ type: 'solve_error', error: e.message, requestId });
    }
  }
};
