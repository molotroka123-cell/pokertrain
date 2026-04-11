// solver.js — CFR Solver wrapper (runs in Web Worker)
// Usage: const result = await solveCFR(heroCards, board, pot, toCall, stack)

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

export function solveCFR(heroCards, board, pot, toCall, heroStack, villainRangeStrength = 0.5, iterations = 800) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    const w = getWorker();
    w.postMessage({
      type: 'solve',
      requestId: id,
      data: { heroCards, board, pot, toCall, heroStack, villainRangeStrength, iterations },
    });
    // Timeout after 10 seconds
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Solver timeout'));
      }
    }, 10000);
  });
}

export function terminateSolver() {
  if (worker) { worker.terminate(); worker = null; }
}
