// PlayerPool.js — 500 player generation + background simulation

import { generateProfile, generatePlayerName, generateCountry } from '../data/aiProfiles.js';
import { cryptoRandomFloat, cryptoRandom, shuffle as shuffleDeck } from '../engine/deck.js';

export class PlayerPool {
  constructor(format) {
    this.format = format;
    this.players = [];
    this.eliminatedPlayers = [];
  }

  // Generate hero + all AI players
  initialize(heroName) {
    this.players = [];
    this.eliminatedPlayers = [];

    // Hero player (id: 0)
    this.players.push({
      id: 0,
      name: heroName || 'Hero',
      emoji: '🎯',
      chips: this.format.startingChips,
      isHero: true,
      eliminated: false,
      finishPosition: null,
      profile: null, // Human
      tiltState: null,
    });

    // Generate AI players
    for (let i = 1; i < this.format.players; i++) {
      const profile = generateProfile(i);
      this.players.push({
        id: i,
        name: profile.name,
        emoji: profile.emoji,
        chips: this.format.startingChips,
        isHero: false,
        eliminated: false,
        finishPosition: null,
        profile,
        tiltState: profile.style === 'TILTER' ? { isOnTilt: false, handsRemaining: 0 } : null,
      });
    }

    return this.players;
  }

  // Eliminate a player
  eliminate(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.eliminated) return;

    player.eliminated = true;
    player.chips = 0;
    player.finishPosition = this.getAliveCount() + 1;
    this.eliminatedPlayers.push(player);
  }

  getAliveCount() {
    return this.players.filter(p => !p.eliminated).length;
  }

  getAlivePlayers() {
    return this.players.filter(p => !p.eliminated);
  }

  getHero() {
    return this.players[0];
  }

  // Chip leader board (top N)
  getChipLeaders(n = 10) {
    return this.getAlivePlayers()
      .sort((a, b) => b.chips - a.chips)
      .slice(0, n);
  }

  // Hero's rank
  getHeroRank() {
    const alive = this.getAlivePlayers().sort((a, b) => b.chips - a.chips);
    return alive.findIndex(p => p.isHero) + 1;
  }

  // Average stack
  getAverageStack() {
    const alive = this.getAlivePlayers();
    if (alive.length === 0) return 0;
    return Math.floor(alive.reduce((sum, p) => sum + p.chips, 0) / alive.length);
  }

  // Update bot personality based on chip changes (drift)
  updatePersonalities() {
    const avg = this.getAverageStack();
    for (const p of this.players) {
      if (p.isHero || p.eliminated || !p.profile) continue;

      const ratio = p.chips / avg;

      // Desperate short stack → play wider
      if (ratio < 0.3 && p.profile.style !== 'Maniac') {
        p.profile.vpip = Math.min(p.profile.vpip * 1.15, 0.55);
        p.profile.pfr = Math.min(p.profile.pfr * 1.20, 0.45);
      }

      // Big stack → slightly more aggressive
      if (ratio > 2.0) {
        p.profile.vpip = Math.min(p.profile.vpip * 1.05, 0.50);
        p.profile.af = Math.min(p.profile.af * 1.05, 6.0);
      }

      // Tilt check
      if (p.tiltState && p.profile.tiltProbability) {
        if (p.tiltState.isOnTilt) {
          p.tiltState.handsRemaining--;
          if (p.tiltState.handsRemaining <= 0) {
            p.tiltState.isOnTilt = false;
          }
        }
      }
    }
  }

  // Trigger tilt for a bot (e.g., after losing big pot)
  triggerTilt(playerId) {
    const p = this.players.find(pl => pl.id === playerId);
    if (!p || !p.tiltState || !p.profile.tiltProbability) return;
    if (cryptoRandomFloat() < p.profile.tiltProbability) {
      p.tiltState.isOnTilt = true;
      p.tiltState.handsRemaining = 3 + cryptoRandom(5);
    }
  }

  // Shuffle players for seating
  getShuffledPlayers() {
    const ids = this.players.map(p => p.id);
    const rand = new Uint32Array(ids.length);
    crypto.getRandomValues(rand);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = rand[i] % (i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.map(id => this.players.find(p => p.id === id));
  }
}
