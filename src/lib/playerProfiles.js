// playerProfiles.js — Multi-player profile system with data isolation

const ADMIN_ID = 'hero_admin'; // Owner — sees all data

export function getPlayers() {
  try {
    return JSON.parse(localStorage.getItem('pokertrain_players') || '[]');
  } catch { return []; }
}

export function addPlayer(name, pin) {
  const players = getPlayers();
  if (players.find(p => p.name === name)) return false;
  players.push({
    id: 'player_' + Date.now(),
    name,
    pin: pin || '',
    createdAt: Date.now(),
    isAdmin: false,
  });
  localStorage.setItem('pokertrain_players', JSON.stringify(players));
  return true;
}

export function initAdmin() {
  const players = getPlayers();
  if (!players.find(p => p.id === ADMIN_ID)) {
    players.unshift({ id: ADMIN_ID, name: 'Hero', pin: '', createdAt: Date.now(), isAdmin: true });
    localStorage.setItem('pokertrain_players', JSON.stringify(players));
  }
}

export function getCurrentPlayer() {
  try {
    return JSON.parse(localStorage.getItem('pokertrain_current_player') || 'null');
  } catch { return null; }
}

export function setCurrentPlayer(playerId) {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (player) localStorage.setItem('pokertrain_current_player', JSON.stringify(player));
}

export function verifyPin(playerId, pin) {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return false;
  if (!player.pin) return true; // no pin set
  return player.pin === pin;
}

// Data isolation: prefix localStorage keys with player ID
export function getPlayerKey(key) {
  const current = getCurrentPlayer();
  const id = current?.id || ADMIN_ID;
  return `${id}_${key}`;
}

// Admin can view any player's data
export function getPlayerData(playerId, key) {
  const current = getCurrentPlayer();
  if (!current?.isAdmin && current?.id !== playerId) return null; // blocked
  return localStorage.getItem(`${playerId}_${key}`);
}

export function isAdmin() {
  const current = getCurrentPlayer();
  return current?.isAdmin || current?.id === ADMIN_ID;
}
