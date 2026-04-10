// GameEngine.js — Core hand logic: deal, bet rounds, showdown
// Manages full hand lifecycle with proper state machine

import { freshDeck, deal, cryptoRandomFloat } from './deck.js';
import { evaluateHand, compareHands } from './evaluator.js';
import { getHandValue } from './ranges.js';
import { BaseAI } from './ai.js';

// Hand phases
const PHASE = {
  IDLE: 'idle',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  HAND_OVER: 'hand_over',
};

// Get position labels for N players relative to dealer
function getPositions(numPlayers, dealerIdx) {
  const pos = new Array(numPlayers).fill('');
  if (numPlayers === 2) {
    pos[dealerIdx] = 'BTN';
    pos[(dealerIdx + 1) % 2] = 'BB';
    return pos;
  }
  pos[dealerIdx] = 'BTN';
  pos[(dealerIdx + 1) % numPlayers] = 'SB';
  pos[(dealerIdx + 2) % numPlayers] = 'BB';
  const rem = numPlayers - 3;
  for (let i = 0; i < rem; i++) {
    const seat = (dealerIdx + 3 + i) % numPlayers;
    if (rem === 1) { pos[seat] = 'UTG'; }
    else if (i === 0) pos[seat] = 'UTG';
    else if (i === rem - 1) pos[seat] = 'CO';
    else if (i === rem - 2 && rem > 2) pos[seat] = 'HJ';
    else if (i === 1 && rem > 3) pos[seat] = 'UTG+1';
    else pos[seat] = 'MP';
  }
  return pos;
}

export class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = PHASE.IDLE;
    this.deck = [];
    this.holeCards = {};     // { playerId: [card, card] }
    this.community = [];
    this.pot = 0;
    this.sidePots = [];
    this.bets = {};          // current street bets { playerId: amount }
    this.folded = new Set();
    this.allIn = new Set();
    this.players = [];       // seat order array of player objects
    this.dealerIdx = 0;
    this.positions = [];
    this.blinds = { sb: 0, bb: 0, ante: 0 };
    this.currentBet = 0;     // highest bet this street
    this.actionLog = [];
    this.showdownResults = null;
    this.winner = null;
    this.potWon = 0;

    // Action queue for sequential resolution
    this._actionQueue = [];
    this._currentActorIdx = -1;
    this._actionsLeft = 0;
    this._lastRaiserIdx = -1;
    this._streetDone = false;
    this._waitingForHero = false;
    this._heroResolve = null;
  }

  // Start a new hand
  startHand(players, dealerIdx, blinds, aiBots) {
    this.reset();
    this.players = players.filter(p => !p.eliminated && p.chips > 0);
    if (this.players.length < 2) return false;

    this.dealerIdx = dealerIdx % this.players.length;
    this.blinds = blinds;
    this.aiBots = aiBots || {};
    this.positions = getPositions(this.players.length, this.dealerIdx);

    // Deal cards from ONE fresh shuffled deck (52 unique cards)
    this.deck = freshDeck();
    this.holeCards = {};
    for (const p of this.players) {
      this.holeCards[p.id] = deal(this.deck, 2);
      this.bets[p.id] = 0;
    }

    // Integrity check: no duplicate cards
    const allDealt = [];
    for (const cards of Object.values(this.holeCards)) allDealt.push(...cards);
    if (new Set(allDealt).size !== allDealt.length) {
      console.error('DUPLICATE CARDS DETECTED IN DEAL!', allDealt);
      // Force re-deal
      this.deck = freshDeck();
      this.holeCards = {};
      for (const p of this.players) {
        this.holeCards[p.id] = deal(this.deck, 2);
      }
    }

    // Post antes
    if (blinds.ante > 0) {
      for (const p of this.players) {
        const ante = Math.min(blinds.ante, p.chips);
        p.chips -= ante;
        this.pot += ante;
      }
    }

    // Post blinds
    const n = this.players.length;
    if (n === 2) {
      // Heads-up: dealer is SB
      this._postBlind(this.dealerIdx, blinds.sb);
      this._postBlind((this.dealerIdx + 1) % n, blinds.bb);
    } else {
      this._postBlind((this.dealerIdx + 1) % n, blinds.sb);
      this._postBlind((this.dealerIdx + 2) % n, blinds.bb);
    }

    this.currentBet = blinds.bb;
    this.phase = PHASE.PREFLOP;

    this._log(`--- New Hand --- Blinds: ${blinds.sb}/${blinds.bb}`);

    return true;
  }

  _postBlind(idx, amount) {
    const p = this.players[idx];
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    this.bets[p.id] = actual;
    this.pot += actual;
    if (p.chips <= 0) this.allIn.add(p.id);
  }

  // Get hero's hole cards
  getHeroCards() {
    const hero = this.players.find(p => p.isHero);
    return hero ? this.holeCards[hero.id] || [] : [];
  }

  // Get all active (not folded, not eliminated) players
  _activePlayers() {
    return this.players.filter(p => !this.folded.has(p.id) && !p.eliminated);
  }

  // Players still in hand who can act (not all-in)
  _canAct() {
    return this._activePlayers().filter(p => !this.allIn.has(p.id) && p.chips > 0);
  }

  // Run the full hand — returns state updates via callback
  async runHand(onUpdate) {
    // PREFLOP
    const n = this.players.length;
    let firstToAct;
    if (n === 2) {
      firstToAct = this.dealerIdx; // Heads-up: dealer acts first preflop
    } else {
      firstToAct = (this.dealerIdx + 3) % n; // UTG
    }

    await this._runStreet(PHASE.PREFLOP, firstToAct, onUpdate);
    if (this._handEnded()) { await this._finishHand(onUpdate); return; }

    // FLOP
    deal(this.deck, 1); // burn
    this.community.push(...deal(this.deck, 3));
    this.phase = PHASE.FLOP;
    this._resetStreetBets();
    onUpdate(this.getState());
    await this._delay(600);

    const postflopFirst = this._firstPostflopActor();
    await this._runStreet(PHASE.FLOP, postflopFirst, onUpdate);
    if (this._handEnded()) { await this._finishHand(onUpdate); return; }

    // TURN
    deal(this.deck, 1); // burn
    this.community.push(...deal(this.deck, 1));
    this.phase = PHASE.TURN;
    this._resetStreetBets();
    onUpdate(this.getState());
    await this._delay(500);

    await this._runStreet(PHASE.TURN, postflopFirst, onUpdate);
    if (this._handEnded()) { await this._finishHand(onUpdate); return; }

    // RIVER
    deal(this.deck, 1); // burn
    this.community.push(...deal(this.deck, 1));
    this.phase = PHASE.RIVER;
    this._resetStreetBets();
    onUpdate(this.getState());
    await this._delay(500);

    await this._runStreet(PHASE.RIVER, postflopFirst, onUpdate);
    await this._finishHand(onUpdate);
  }

  _firstPostflopActor() {
    const n = this.players.length;
    // First active player after dealer
    for (let i = 1; i <= n; i++) {
      const idx = (this.dealerIdx + i) % n;
      const p = this.players[idx];
      if (!this.folded.has(p.id) && !this.allIn.has(p.id) && p.chips > 0) {
        return idx;
      }
    }
    return (this.dealerIdx + 1) % n;
  }

  _resetStreetBets() {
    for (const p of this.players) this.bets[p.id] = 0;
    this.currentBet = 0;
  }

  _handEnded() {
    return this._activePlayers().length <= 1 || this._canAct().length === 0;
  }

  // Run one betting street
  async _runStreet(phase, startIdx, onUpdate) {
    const n = this.players.length;
    let numToAct = this._canAct().length;
    let acted = new Set();
    let idx = startIdx;

    for (let loop = 0; loop < n * 4; loop++) { // safety limit
      if (this._activePlayers().length <= 1) break;
      if (this._canAct().length === 0) break;

      const p = this.players[idx % n];
      idx++;

      if (this.folded.has(p.id) || p.eliminated || this.allIn.has(p.id) || p.chips <= 0) continue;

      // If everyone has acted and matched the current bet, street is done
      if (acted.has(p.id) && this.bets[p.id] >= this.currentBet) break;

      const toCall = this.currentBet - (this.bets[p.id] || 0);
      const pos = this.positions[this.players.indexOf(p)];

      let action;

      if (p.isHero) {
        // Wait for hero input
        this._waitingForHero = true;
        onUpdate(this.getState());
        action = await new Promise(resolve => {
          this._heroResolve = resolve;
        });
        this._waitingForHero = false;
      } else {
        // AI decision
        await this._delay(400 + Math.floor(cryptoRandomFloat() * 600));
        action = this._getAIAction(p, toCall, pos);
      }

      // FIX: Never fold when toCall is 0 (free check)
      if (toCall <= 0 && action.action === 'fold') {
        action = { action: 'check' };
      }

      // Apply action
      this._applyAction(p, action, pos);
      acted.add(p.id);
      onUpdate(this.getState());

      // If raise happened, everyone needs to act again
      if (action.action === 'raise') {
        acted = new Set([p.id]);
      }
    }
  }

  // Hero submits action
  submitHeroAction(action, amount) {
    if (this._heroResolve) {
      this._heroResolve({ action, amount });
      this._heroResolve = null;
    }
  }

  _getAIAction(player, toCall, position) {
    const ai = this.aiBots[player.id];
    if (!ai) {
      // Fallback: simple logic
      if (toCall <= 0) return { action: 'check' };
      if (toCall > player.chips * 0.5) return { action: 'fold' };
      return { action: 'call' };
    }

    const handStr = this._getHandStrength(player.id);

    const gs = {
      stage: this.phase,
      holeCards: this.holeCards[player.id],
      community: this.community,
      pot: this.pot,
      toCall,
      myChips: player.chips,
      position,
      bigBlind: this.blinds.bb,
      smallBlind: this.blinds.sb,
      ante: this.blinds.ante || 0,
      playersInHand: this._activePlayers().length,
      playersAtTable: this.players.length,
      currentBet: this.currentBet,
      handStrength: handStr,
    };

    return ai.decide(gs);
  }

  _getHandStrength(playerId) {
    const cards = this.holeCards[playerId];
    if (!cards || cards.length < 2) return 0.5;

    if (this.community.length >= 3) {
      const eval_ = evaluateHand(cards, this.community);
      if (eval_) {
        // Normalize rank to 0-1 (rough but fast)
        return Math.min(1, eval_.rank / 9 + (eval_.value % 1e6) / 1e7);
      }
    }

    // Preflop: use range grid
    return 1 - getHandValue(cards[0], cards[1]);
  }

  _applyAction(player, action, position) {
    const toCall = Math.max(0, this.currentBet - (this.bets[player.id] || 0));

    switch (action.action) {
      case 'fold':
        this.folded.add(player.id);
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} folds`, player);
        break;

      case 'check':
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} checks`, player);
        break;

      case 'call': {
        const callAmt = Math.min(toCall, player.chips);
        player.chips -= callAmt;
        this.bets[player.id] = (this.bets[player.id] || 0) + callAmt;
        this.pot += callAmt;
        if (player.chips <= 0) this.allIn.add(player.id);
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} calls ${callAmt}`, player, callAmt);
        break;
      }

      case 'raise': {
        let raiseTotal = action.amount || this.currentBet * 2 || this.blinds.bb * 2;
        raiseTotal = Math.max(raiseTotal, this.currentBet + this.blinds.bb); // min raise
        raiseTotal = Math.min(raiseTotal, player.chips + (this.bets[player.id] || 0)); // max = all-in

        const alreadyIn = this.bets[player.id] || 0;
        const toAdd = raiseTotal - alreadyIn;
        const actualAdd = Math.min(toAdd, player.chips);

        player.chips -= actualAdd;
        this.bets[player.id] = alreadyIn + actualAdd;
        this.pot += actualAdd;
        this.currentBet = this.bets[player.id];

        if (player.chips <= 0) this.allIn.add(player.id);

        const isAllIn = player.chips <= 0;
        const label = isAllIn ? 'ALL-IN' : 'raises to';
        this._log(
          `[${position}] ${player.isHero ? 'Hero' : player.name} ${label} ${this.bets[player.id]}`,
          player, this.bets[player.id]
        );
        break;
      }
    }
  }

  // Finish hand: showdown or last man standing
  async _finishHand(onUpdate) {
    const active = this._activePlayers();
    this.phase = PHASE.SHOWDOWN;

    if (active.length === 1) {
      // Everyone folded — winner takes pot, no showdown
      this.winner = active[0];
      this.potWon = this.pot;
      this.winner.chips += this.pot;
      this.showdownResults = [{
        player: this.winner,
        cards: this.winner.isHero ? this.holeCards[this.winner.id] : null,
        hand: null,
        won: this.pot,
      }];
      this._log(`${this.winner.isHero ? 'Hero' : this.winner.name} wins ${this.pot} (everyone folded)`, this.winner, this.pot);
    } else {
      // Showdown — deal remaining community cards if needed
      while (this.community.length < 5) {
        deal(this.deck, 1); // burn
        this.community.push(...deal(this.deck, 1));
      }

      // Evaluate all hands
      const results = [];
      for (const p of active) {
        const cards = this.holeCards[p.id];
        const hand = evaluateHand(cards, this.community);
        results.push({ player: p, cards, hand, won: 0 });
      }

      // Sort by hand value (best first)
      results.sort((a, b) => {
        if (!a.hand && !b.hand) return 0;
        if (!a.hand) return 1;
        if (!b.hand) return -1;
        return compareHands(b.hand, a.hand);
      });

      // Award pot to best hand(s)
      const bestValue = results[0].hand?.value || 0;
      const winners = results.filter(r => r.hand?.value === bestValue);
      const share = Math.floor(this.pot / winners.length);

      for (const w of winners) {
        w.won = share;
        w.player.chips += share;
      }

      this.winner = winners[0].player;
      this.potWon = this.pot;
      this.showdownResults = results;

      for (const r of results) {
        const name = r.player.isHero ? 'Hero' : r.player.name;
        const cardStr = r.cards.map(c => c).join(' ');
        if (r.won > 0) {
          this._log(`${name} shows ${cardStr} — ${r.hand?.name || '?'} — WINS ${r.won}`, r.player, r.won);
        } else {
          this._log(`${name} shows ${cardStr} — ${r.hand?.name || '?'}`, r.player);
        }
      }
    }

    this.phase = PHASE.SHOWDOWN;
    onUpdate(this.getState());

    // Wait for player to see showdown
    await this._delay(2500);
    this.phase = PHASE.HAND_OVER;
    onUpdate(this.getState());
  }

  // Get full state for UI rendering
  getState() {
    const hero = this.players.find(p => p.isHero);
    const heroIdx = this.players.indexOf(hero);

    return {
      phase: this.phase,
      players: this.players.map((p, i) => ({
        ...p,
        position: this.positions[i],
        bet: this.bets[p.id] || 0,
        folded: this.folded.has(p.id),
        allIn: this.allIn.has(p.id),
      })),
      community: [...this.community],
      pot: this.pot,
      heroCards: hero ? this.holeCards[hero.id] || [] : [],
      heroIndex: heroIdx,
      dealerIdx: this.dealerIdx,
      currentBet: this.currentBet,
      waitingForHero: this._waitingForHero,
      toCall: hero ? Math.max(0, this.currentBet - (this.bets[hero.id] || 0)) : 0,
      canCheck: hero ? (this.bets[hero.id] || 0) >= this.currentBet : false,
      heroChips: hero ? hero.chips : 0,
      heroPosition: hero ? this.positions[heroIdx] : '',
      minRaise: Math.min(this.currentBet + this.blinds.bb, hero ? hero.chips + (this.bets[hero.id] || 0) : 0),
      maxRaise: hero ? hero.chips + (this.bets[hero.id] || 0) : 0,
      showdownResults: this.showdownResults,
      winner: this.winner,
      potWon: this.potWon,
      actionLog: [...this.actionLog],
      blinds: this.blinds,
    };
  }

  _log(msg, player, amount) {
    this.actionLog.push({
      text: msg,
      name: player?.isHero ? 'Hero' : player?.name || '',
      position: player ? this.positions[this.players.indexOf(player)] : '',
      action: msg.includes('folds') ? 'fold' :
              msg.includes('checks') ? 'check' :
              msg.includes('calls') ? 'call' :
              msg.includes('raises') || msg.includes('ALL-IN') ? 'raise' :
              msg.includes('wins') || msg.includes('WINS') ? 'win' : '',
      amount: amount || 0,
      isHero: player?.isHero || false,
    });
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

export { PHASE, getPositions };
