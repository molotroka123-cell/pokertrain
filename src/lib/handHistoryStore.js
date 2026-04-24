// handHistoryStore.js — localStorage persistence for parsed hand histories

const STORAGE_KEY = 'pokertrain_imported_hands';
const META_KEY = 'pokertrain_imported_hands_meta';

function prefixedKey(key) {
  const prefix = (typeof window !== 'undefined' && window.__playerPrefix) || '';
  return prefix + key;
}

// We keep a lightweight "meta" index separately to render lists fast,
// and store the full hand JSON under the main key.

export function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(prefixedKey(STORAGE_KEY)) || '[]');
  } catch {
    return [];
  }
}

export function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(prefixedKey(META_KEY)) || '[]');
  } catch {
    return [];
  }
}

function saveAll(hands) {
  try {
    localStorage.setItem(prefixedKey(STORAGE_KEY), JSON.stringify(hands));
    const meta = hands.map(h => ({
      handId: h.handId,
      timestamp: h.timestamp,
      tournamentId: h.tournamentId,
      format: h.format,
      heroPosition: h.heroPosition,
      heroCards: h.heroCards,
      heroResult: h.heroResult,
      bigBlind: h.bigBlind,
      leakTags: h.leakTags || [],
    }));
    localStorage.setItem(prefixedKey(META_KEY), JSON.stringify(meta));
  } catch (e) {
    // localStorage quota exceeded — keep in-memory only
    console.warn('Hand history storage full:', e);
  }
}

export function addHands(newHands) {
  const existing = loadAll();
  const existingIds = new Set(existing.map(h => h.handId));
  const added = [];
  for (const h of newHands) {
    if (h.handId && !existingIds.has(h.handId)) {
      existing.push(h);
      existingIds.add(h.handId);
      added.push(h);
    }
  }
  saveAll(existing);
  return { added: added.length, total: existing.length };
}

export function clearAll() {
  localStorage.removeItem(prefixedKey(STORAGE_KEY));
  localStorage.removeItem(prefixedKey(META_KEY));
}

export function updateHandTags(handId, leakTags) {
  const hands = loadAll();
  const h = hands.find(x => x.handId === handId);
  if (h) {
    h.leakTags = leakTags;
    saveAll(hands);
  }
}

export function getHandById(handId) {
  const hands = loadAll();
  return hands.find(h => h.handId === handId) || null;
}
