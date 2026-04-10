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

// Crypto-secure random int [0, max) — rejection sampling to avoid modulo bias
export function cryptoRandom(max) {
  if (max <= 1) return 0;
  const arr = new Uint32Array(1);
  const limit = Math.floor(4294967296 / max) * max; // Largest multiple of max that fits in uint32
  do {
    crypto.getRandomValues(arr);
  } while (arr[0] >= limit); // Reject values that would cause bias
  return arr[0] % max;
}

// Crypto-secure random float [0, 1)
export function cryptoRandomFloat() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / 4294967296;
}
