// SessionStats.js — localStorage persistence for leak drill sessions

const STORAGE_KEY = 'pokertrain_leak_drill_stats';

function prefixedKey() {
  const prefix = (typeof window !== 'undefined' && window.__playerPrefix) || '';
  return prefix + STORAGE_KEY;
}

export function saveSession(leak, stats) {
  try {
    const history = loadHistory();
    history.push({ leak, timestamp: Date.now(), stats });
    if (history.length > 100) history.splice(0, history.length - 100);
    localStorage.setItem(prefixedKey(), JSON.stringify(history));
  } catch (_) { /* ignore */ }
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(prefixedKey()) || '[]');
  } catch {
    return [];
  }
}

export function getLeakProgress(leak) {
  const history = loadHistory().filter(s => s.leak === leak);
  if (history.length === 0) return null;

  const recent = history.slice(-5);
  const older = history.slice(-10, -5);

  const avg = arr => arr.reduce((s, x) => s + (x.stats?.accuracy || 0), 0) / arr.length;
  const avgRecent = avg(recent);
  const avgOlder = older.length ? avg(older) : avgRecent;

  return {
    currentAccuracy: avgRecent,
    trend: avgRecent - avgOlder,
    totalSessions: history.length,
    lastPlayed: history[history.length - 1]?.timestamp || 0,
  };
}
