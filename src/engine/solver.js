// solver.js — CFR Solver wrapper with IndexedDB caching
// Usage: const result = await solve(heroCards, board, pot, toCall, stack, opts)
//
// UPGRADE PATH TO WASM POSTFLOP (PioSolver accuracy):
// 1. Clone https://github.com/b-inary/wasm-postflop
// 2. npm install && npm run wasm
// 3. Copy wasm/postflop_solver_bg.wasm + postflop_solver.js to public/
// 4. In cfrWorker.js, import WASM module instead of JS solver
// 5. Pass range strings from rangeEstimator.js to WASM solver
// The solve() API stays the same — only worker internals change.
// Cache (solverCache.js) works with both backends.

import { getCachedSolution, cacheSolution, buildSpotKey } from './solverCache.js';

let worker = null;
let requestId = 0;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/cfrWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, result, error, requestId: rid } = e.data;
      const resolver = pending.get(rid);
      if (!resolver) return;
      pending.delete(rid);
      if (type === 'solve_result') resolver.resolve(result);
      else resolver.reject(new Error(error || 'Solver failed'));
    };
  }
  return worker;
}

// Solve with caching
export async function solve(heroCards, board, pot, toCall, heroStack, opts = {}) {
  const { villainRangeStrength = 0.5, numOpponents = 1, iterations = 1000,
          heroPosition, villainPosition, boardCategory, handCategory, stackDepthBB } = opts;

  // Try cache first
  if (heroPosition && villainPosition) {
    const key = buildSpotKey(heroPosition, villainPosition, board.length >= 5 ? 'river' : board.length >= 4 ? 'turn' : board.length >= 3 ? 'flop' : 'preflop',
      boardCategory || 'mixed', handCategory || 'mixed', stackDepthBB || 30);
    const cached = await getCachedSolution(key);
    if (cached) return { ...cached, fromCache: true };
  }

  // Solve via Web Worker
  const result = await solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength, numOpponents, iterations);

  // Cache the result
  if (heroPosition && villainPosition) {
    const key = buildSpotKey(heroPosition, villainPosition, board.length >= 5 ? 'river' : board.length >= 4 ? 'turn' : board.length >= 3 ? 'flop' : 'preflop',
      boardCategory || 'mixed', handCategory || 'mixed', stackDepthBB || 30);
    cacheSolution(key, result).catch(() => {});
  }

  return result;
}

// Direct solver call (no caching)
export function solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength = 0.5, numOpponents = 1, iterations = 1000) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    const w = getWorker();
    w.postMessage({
      type: 'solve',
      requestId: id,
      data: { heroCards, board, pot, toCall, heroStack, villainRangeStrength, numOpponents, iterations },
    });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Solver timeout'));
      }
    }, 15000);
  });
}

export function terminateSolver() {
  if (worker) { worker.terminate(); worker = null; }
}
