// cfrWorker.js — Simplified CFR (Counterfactual Regret Minimization) Solver
// Runs in Web Worker to avoid blocking UI
// Input: hero cards, board, pot, stack, villain range estimate
// Output: GTO strategy (action frequencies + EV for each action)

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['s','h','d','c'];
const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

// ═══ Hand Evaluation (compact version for worker) ═══
function evalHand(cards) {
  if (cards.length < 5) return { rank: 0, value: 0 };
  const parsed = cards.map(c => ({ r: RV[c[0]], s: c[1] }));
  const combos = getCombinations(parsed, 5);
  let best = { rank: 0, value: 0 };
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
  else if (groups[0].count === 3 && groups[1].count === 2) { rank = 7; value = 7e10 + groups[0].rank * 1e6 + groups[1].rank; }
  else if (isFlush) { rank = 6; value = 6e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 100 + ranks[4]; }
  else if (isStraight) { rank = 5; value = 5e10 + straightHigh; }
  else if (groups[0].count === 3) { rank = 4; value = 4e10 + groups[0].rank * 1e6; }
  else if (groups[0].count === 2 && groups[1].count === 2) { rank = 3; value = 3e10 + Math.max(groups[0].rank, groups[1].rank) * 1e6 + Math.min(groups[0].rank, groups[1].rank) * 1e4; }
  else if (groups[0].count === 2) { rank = 2; value = 2e10 + groups[0].rank * 1e6; }
  else { rank = 1; value = 1e10 + ranks[0] * 1e8 + ranks[1] * 1e6 + ranks[2] * 1e4 + ranks[3] * 100 + ranks[4]; }
  return { rank, value };
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result = [];
  const [first, ...rest] = arr;
  for (const c of getCombinations(rest, k - 1)) result.push([first, ...c]);
  for (const c of getCombinations(rest, k)) result.push(c);
  return result;
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

// ═══ Equity Calculator (Monte Carlo) ═══
function calcEquity(heroCards, board, villainCards, iterations = 500) {
  const used = new Set([...heroCards, ...board, ...(villainCards || [])]);
  const remaining = createDeck().filter(c => !used.has(c));
  const boardNeeded = 5 - board.length;
  let wins = 0, ties = 0;

  for (let i = 0; i < iterations; i++) {
    const sh = shuffle(remaining);
    let idx = 0;
    const fullBoard = [...board];
    for (let b = 0; b < boardNeeded; b++) fullBoard.push(sh[idx++]);

    const vCards = villainCards || [sh[idx++], sh[idx++]];
    const heroHand = evalHand([...heroCards, ...fullBoard]);
    const villHand = evalHand([...vCards, ...fullBoard]);

    if (heroHand.value > villHand.value) wins++;
    else if (heroHand.value === villHand.value) ties++;
  }
  return (wins + ties * 0.5) / iterations;
}

// ═══ CFR Solver ═══
// Simplified 2-player CFR for current decision node
// Actions: fold, check/call, bet/raise (3 sizes: 33%, 67%, 100% pot)

function solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength, iterations = 800) {
  // Define actions available to hero
  const actions = [];
  if (toCall > 0) actions.push({ id: 'fold', cost: 0 });
  actions.push({ id: toCall > 0 ? 'call' : 'check', cost: toCall });

  const betSizes = [0.33, 0.67, 1.0];
  for (const pct of betSizes) {
    const raiseAmt = Math.round(pot * pct);
    if (raiseAmt > toCall && raiseAmt <= heroStack) {
      actions.push({ id: `raise_${Math.round(pct * 100)}`, cost: raiseAmt, size: pct });
    }
  }
  if (heroStack > pot) {
    actions.push({ id: 'allin', cost: heroStack, size: heroStack / pot });
  }

  const numActions = actions.length;
  const regrets = new Float64Array(numActions); // cumulative regrets
  const strategySum = new Float64Array(numActions); // cumulative strategy

  // Villain calling/folding model based on range strength
  // villainRangeStrength: 0=weak (folds a lot), 1=strong (calls everything)
  const villainFoldProb = Math.max(0.1, Math.min(0.7, 0.5 - villainRangeStrength * 0.3));

  for (let iter = 0; iter < iterations; iter++) {
    // Get current strategy via regret matching
    const strategy = new Float64Array(numActions);
    let positiveSum = 0;
    for (let a = 0; a < numActions; a++) {
      strategy[a] = Math.max(0, regrets[a]);
      positiveSum += strategy[a];
    }
    if (positiveSum > 0) {
      for (let a = 0; a < numActions; a++) strategy[a] /= positiveSum;
    } else {
      for (let a = 0; a < numActions; a++) strategy[a] = 1 / numActions;
    }

    // Accumulate strategy
    for (let a = 0; a < numActions; a++) strategySum[a] += strategy[a];

    // Calculate EV for each action via Monte Carlo
    const actionEVs = new Float64Array(numActions);
    const samplesPerAction = 30;

    for (let a = 0; a < numActions; a++) {
      const action = actions[a];
      let totalEV = 0;

      for (let s = 0; s < samplesPerAction; s++) {
        const equity = calcEquity(heroCards, board, null, 50);

        if (action.id === 'fold') {
          totalEV += 0; // EV of fold = 0 (we lose nothing more)
        } else if (action.id === 'call' || action.id === 'check') {
          totalEV += equity * (pot + action.cost) - (1 - equity) * action.cost;
        } else {
          // Raise/bet: villain folds or calls
          const foldP = Math.min(0.85, villainFoldProb + (action.size || 0.5) * 0.15);
          const callEV = equity * (pot + action.cost * 2) - (1 - equity) * action.cost;
          const foldEV = pot; // win pot if villain folds
          totalEV += foldP * foldEV + (1 - foldP) * callEV;
        }
      }

      actionEVs[a] = totalEV / samplesPerAction;
    }

    // Node value = weighted sum of action EVs
    let nodeValue = 0;
    for (let a = 0; a < numActions; a++) nodeValue += strategy[a] * actionEVs[a];

    // Update regrets
    for (let a = 0; a < numActions; a++) {
      regrets[a] += actionEVs[a] - nodeValue;
    }
  }

  // Average strategy = final GTO approximation
  const totalStrategySum = strategySum.reduce((a, b) => a + b, 0);
  const result = [];
  for (let a = 0; a < numActions; a++) {
    const freq = totalStrategySum > 0 ? strategySum[a] / totalStrategySum : 1 / numActions;
    const equity = calcEquity(heroCards, board, null, 200);
    const ev = actions[a].id === 'fold' ? 0
      : actions[a].id === 'call' || actions[a].id === 'check'
        ? Math.round(equity * (pot + actions[a].cost) - (1 - equity) * actions[a].cost)
        : Math.round((() => {
            const foldP = Math.min(0.85, villainFoldProb + (actions[a].size || 0.5) * 0.15);
            const callEV = equity * (pot + actions[a].cost * 2) - (1 - equity) * actions[a].cost;
            return foldP * pot + (1 - foldP) * callEV;
          })());

    result.push({
      action: actions[a].id,
      frequency: Math.round(freq * 100),
      ev,
      cost: actions[a].cost,
    });
  }

  // Sort by frequency descending
  result.sort((a, b) => b.frequency - a.frequency);
  const bestAction = result[0];

  return {
    actions: result,
    bestAction: bestAction.action,
    bestEV: bestAction.ev,
    bestFrequency: bestAction.frequency,
    equity: calcEquity(heroCards, board, null, 300),
    iterations,
  };
}

// ═══ Worker Message Handler ═══
self.onmessage = function (event) {
  const { type, data, requestId } = event.data;

  if (type === 'solve') {
    const { heroCards, board, pot, toCall, heroStack, villainRangeStrength, iterations } = data;
    try {
      const result = solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength || 0.5, iterations || 800);
      self.postMessage({ type: 'solve_result', result, requestId });
    } catch (e) {
      self.postMessage({ type: 'solve_error', error: e.message, requestId });
    }
  }
};
