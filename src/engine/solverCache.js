// solverCache.js — IndexedDB cache for solved poker spots
// LRU eviction at 5000 entries

const DB_NAME = 'pokertrain_solver';
const STORE = 'solutions';
const MAX_ENTRIES = 5000;
let db = null;

function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedSolution(key) {
  try {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          // Update access time (in a separate transaction)
          try {
            const tx2 = d.transaction(STORE, 'readwrite');
            tx2.objectStore(STORE).put({ ...result, lastAccess: Date.now() });
          } catch (e) {}
        }
        resolve(result?.solution || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function cacheSolution(key, solution) {
  try {
    const d = await openDB();
    const tx = d.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({ key, solution, timestamp: Date.now(), lastAccess: Date.now() });

    // LRU eviction if over limit
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_ENTRIES) {
        // Delete oldest 500 entries
        const cursor = store.openCursor();
        let deleted = 0;
        const toDelete = countReq.result - MAX_ENTRIES + 500;
        cursor.onsuccess = (e) => {
          const c = e.target.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          }
        };
      }
    };
  } catch (e) {
    // Cache write failure is non-critical
  }
}

// Build cache key from spot parameters
export function buildSpotKey(heroPosition, villainPosition, street, boardCategory, handCategory, stackDepthBB) {
  const stackBucket = stackDepthBB < 15 ? 'short' : stackDepthBB < 30 ? 'medium' : stackDepthBB < 60 ? 'deep' : 'vdeep';
  return `${heroPosition}_${villainPosition}_${street}_${boardCategory}_${handCategory}_${stackBucket}`;
}

export async function getCacheStats() {
  try {
    const d = await openDB();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readonly');
      const countReq = tx.objectStore(STORE).count();
      countReq.onsuccess = () => resolve({ totalEntries: countReq.result });
      countReq.onerror = () => resolve({ totalEntries: 0 });
    });
  } catch (e) {
    return { totalEntries: 0 };
  }
}
