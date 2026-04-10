// storage.js — localStorage persistence helpers

const PREFIX = 'wsop_';

export function save(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

export function getAllKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
  }
  return keys;
}

// Settings
export function getSettings() {
  return load('settings', {
    soundEnabled: true,
    timerEnabled: true,
    timerMode: 'normal', // off | normal | fast | turbo
    mentalAlerts: true,
    heroName: 'Hero',
  });
}

export function saveSettings(settings) {
  save('settings', settings);
}
