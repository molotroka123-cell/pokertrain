// deck.js — Crypto RNG shuffle using Crypto.getRandomValues()

const SUITS = ['s', 'h', 'd', 'c']; // spades, hearts, diamonds, clubs
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push(r + s);
    }
  }
  return deck;
}

// Fisher-Yates shuffle with crypto-secure randomness (rejection sampling, no modulo bias)
export function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = cryptoRandom(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create a fresh shuffled deck
export function freshDeck() {
  return shuffle(createDeck());
}

// Deal n cards from the deck (mutates deck)
export function deal(deck, n) {
  return deck.splice(0, n);
}

// Parse card string to {rank, suit}
export function parseCard(card) {
  return { rank: card[0], suit: card[1] };
}

// Rank to numeric value (2=2, ..., A=14)
export function rankValue(rank) {
  const map = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  return map[rank];
}

// Card display name
export function cardName(card) {
  const rankNames = { 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
  const suitSymbols = { 's': '\u2660', 'h': '\u2665', 'd': '\u2666', 'c': '\u2663' };
  const r = card[0];
  const s = card[1];
  return (rankNames[r] || r) + suitSymbols[s];
}

// Suit color for display
export function suitColor(suit) {
  return suit === 'h' || suit === 'd' ? '#e74c3c' : '#e0e0e0';
}

// ---- Randomness source -------------------------------------------------
// Default: crypto.getRandomValues (unpredictable, used for real play).
// For reproducible simulations/tests: seedRng(seed) switches every cryptoRandom*/shuffle call to a
// deterministic PRNG (mulberry32); useCryptoRng() switches back. A seeded stream is NOT secure.
let _seeded = null;

export function makeRng(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  return function next32() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}
export function seedRng(seed) { _seeded = makeRng(seed); }
export function useCryptoRng() { _seeded = null; }
export function isSeededRng() { return _seeded !== null; }

function nextUint32() {
  if (_seeded) return _seeded();
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0];
}

// Random int [0, max) — rejection sampling to avoid modulo bias
export function cryptoRandom(max) {
  if (max <= 1) return 0;
  const limit = Math.floor(4294967296 / max) * max; // Largest multiple of max that fits in uint32
  let v;
  do {
    v = nextUint32();
  } while (v >= limit); // Reject values that would cause bias
  return v % max;
}

// Random float [0, 1)
export function cryptoRandomFloat() {
  return nextUint32() / 4294967296;
}
