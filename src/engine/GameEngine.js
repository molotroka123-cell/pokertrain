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
    this._startChips = {};   // chips at start of hand for side-pot calc
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
    this._heroFolded = false; // 2x speed after hero folds

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
  setTournamentContext(stage, isFinalTable, isBubble) {
    this._tournamentStage = stage || 'early';
    this._isFinalTable = isFinalTable || false;
    this._isBubble = isBubble || false;
  }

  startHand(players, dealerIdx, blinds, aiBots) {
    this.reset();
    this.players = players.filter(p => !p.eliminated && p.chips > 0);
    if (this.players.length < 2) return false;

    this.dealerIdx = dealerIdx % this.players.length;
    this.blinds = blinds;
    this.aiBots = aiBots || {};
    this.positions = getPositions(this.players.length, this.dealerIdx);

    // Record starting chips for side-pot calculation
    this._startChips = {};
    for (const p of this.players) this._startChips[p.id] = p.chips;

    // AI context: track hand history for multi-street awareness
    this._handAggressor = null;    // who raised last preflop (id)
    this._streetActions = [];      // all actions this hand [{playerId, position, action, amount, street, pot}]
    this._myBetsThisHand = {};     // per-player total bet/raise count for barreling
    this._heroFolded = false;

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
        // Wait for hero input — track decision time
        this._waitingForHero = true;
        const decisionStart = Date.now();
        onUpdate(this.getState());
        action = await new Promise(resolve => {
          this._heroResolve = resolve;
        });
        this._waitingForHero = false;
        action._decisionTimeMs = Date.now() - decisionStart;
        action._phase = phase;
        action._position = pos;
        action._toCall = toCall;
        action._pot = this.pot;
        action._heroChips = p.chips;
        action._community = [...this.community];
      } else {
        // AI decision (may be async if ClaudeBossBot)
        await this._delay(400 + Math.floor(cryptoRandomFloat() * 600));
        action = await this._getAIAction(p, toCall, pos);
      }

      // FIX: Never fold when toCall is 0 (free check) — preserve meta!
      if (toCall <= 0 && action.action === 'fold') {
        action = { ...action, action: 'check' }; // Spread preserves _decisionTimeMs etc.
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

  async _getAIAction(player, toCall, position) {
    const ai = this.aiBots[player.id];
    if (!ai) {
      // Fallback: simple logic
      if (toCall <= 0) return { action: 'check' };
      if (toCall > player.chips * 0.5) return { action: 'fold' };
      return { action: 'call' };
    }

    const handStr = this._getHandStrength(player.id);

    const activePlayers = this._activePlayers();
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
      playersInHand: activePlayers.length,
      playersAtTable: this.players.length,
      currentBet: this.currentBet,
      handStrength: handStr,
      // Tournament context
      tournamentStage: this._tournamentStage || 'early',
      isFinalTable: this._isFinalTable || false,
      isBubble: this._isBubble || false,
      // Multi-street context — AI sees full hand history
      streetActions: this._streetActions || [],
      isAggressor: this._handAggressor === player.id,
      aggressorId: this._handAggressor,
      // Stack awareness
      effectiveStack: Math.min(player.chips, ...activePlayers.filter(p => p.id !== player.id).map(p => p.chips)),
      spr: this.pot > 0 ? player.chips / this.pot : 20,
      // How many times I bet/raised this hand (for barreling logic)
      myBetsThisHand: Object.entries(this._myBetsThisHand || {}).filter(([k]) => k.startsWith(player.id)).reduce((sum, [, v]) => sum + v, 0),
      // Did I c-bet flop? (for turn barreling decision)
      didCbetFlop: (this._myBetsThisHand || {})[player.id + '_' + PHASE.FLOP] > 0,
      didBetTurn: (this._myBetsThisHand || {})[player.id + '_' + PHASE.TURN] > 0,
    };

    const decision = await ai.decide(gs);
    return decision;
  }

  _getHandStrength(playerId) {
    const cards = this.holeCards[playerId];
    if (!cards || cards.length < 2) return 0.5;

    if (this.community.length >= 3) {
      const eval_ = evaluateHand(cards, this.community);
      if (eval_) {
        // Proper hand strength mapping:
        // 1=High Card→0.15, 2=Pair→0.45, 3=TwoPair→0.6, 4=Trips→0.7,
        // 5=Straight→0.78, 6=Flush→0.83, 7=FullHouse→0.88, 8=Quads→0.93,
        // 9=StraightFlush→0.97, 10=Royal→1.0
        const strengthMap = [0, 0.15, 0.45, 0.60, 0.70, 0.78, 0.83, 0.88, 0.93, 0.97, 1.0];
        const base = strengthMap[eval_.rank] || 0.15;
        // Add kicker bonus (0-0.1 range based on value within rank)
        const kicker = Math.min(0.1, (eval_.value % 1e6) / 1e7);
        return Math.min(1, base + kicker);
      }
    }

    // Preflop: use range grid
    return 1 - getHandValue(cards[0], cards[1]);
  }

  _applyAction(player, action, position) {
    const toCall = Math.max(0, this.currentBet - (this.bets[player.id] || 0));

    // Hero meta for AI recording
    // Hero meta — snapshot ALL state AT decision time
    const heroMeta = player.isHero ? {
      _decisionTimeMs: action._decisionTimeMs || 0,
      _phase: this.phase,
      _toCall: toCall,
      _pot: this.pot,
      _community: [...this.community],      // Board AT this street
      _currentBet: this.currentBet,          // Bet AT this moment
      _myChips: player.chips,                // Hero chips AT this moment
      _myBet: this.bets[player.id] || 0,     // Hero bet AT this moment
      // Opponent state AT decision time (for accurate effective stack / EV)
      _opponents: this.players.filter(p => !p.isHero && !this.folded.has(p.id)).map(p => ({
        name: p.name, position: this.positions[this.players.indexOf(p)],
        chips: p.chips, style: p.profile?.style, observedVpip: p.profile?.vpip,
      })),
    } : undefined;

    switch (action.action) {
      case 'fold':
        this.folded.add(player.id);
        if (player.isHero) this._heroFolded = true;
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} folds`, player, 0, heroMeta);
        break;

      case 'check':
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} checks`, player, 0, heroMeta);
        break;

      case 'call': {
        const callAmt = Math.min(toCall, player.chips);
        player.chips -= callAmt;
        this.bets[player.id] = (this.bets[player.id] || 0) + callAmt;
        this.pot += callAmt;
        if (player.chips <= 0) this.allIn.add(player.id);
        this._log(`[${position}] ${player.isHero ? 'Hero' : player.name} calls ${callAmt}`, player, callAmt, heroMeta);
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
          player, this.bets[player.id], heroMeta
        );
        break;
      }
    }

    // Track action for AI hand history context
    if (this._streetActions) {
      this._streetActions.push({
        playerId: player.id, position,
        action: action.action, amount: action.amount || 0,
        street: this.phase, pot: this.pot, isHero: player.isHero || false,
      });
    }
    // Track aggressor (last raiser preflop)
    if (action.action === 'raise' && this.phase === PHASE.PREFLOP) {
      this._handAggressor = player.id;
    }
    // Track per-player bet/raise count per street for barreling
    if (action.action === 'raise') {
      const key = player.id + '_' + this.phase;
      this._myBetsThisHand[key] = (this._myBetsThisHand[key] || 0) + 1;
    }
  }

  // Finish hand: showdown or last man standing
  async _finishHand(onUpdate) {
    const active = this._activePlayers();
    this.phase = PHASE.SHOWDOWN;

    if (active.length === 1) {
      // Everyone folded — winner takes pot, no showdown
      this.winner = active[0];
      const winnerInvested = (this._startChips?.[this.winner.id] || 0) - this.winner.chips;
      this.potWon = this.pot - winnerInvested; // NET profit (pot minus own investment)
      this.winner.chips += this.pot;
      this.showdownResults = [{
        player: this.winner,
        cards: this.holeCards[this.winner.id],
        hand: null,
        won: this.pot,
      }];
      this._log(`${this.winner.isHero ? 'Hero' : this.winner.name} wins ${this.potWon} net (pot ${this.pot})`, this.winner, this.potWon);
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

      // Side-pot aware pot distribution
      // Track total invested per player this hand (bets + antes + blinds)
      const invested = {};
      for (const p of this.players) {
        // Total invested = startChips - currentChips (if they lost chips) or from pot contribution
        invested[p.id] = this._startChips?.[p.id] != null
          ? this._startChips[p.id] - p.chips
          : 0;
      }

      // Simple side-pot: winner can only win from each player up to their own investment
      let totalAwarded = 0;
      const bestValue = results[0].hand?.value || 0;
      const winners = results.filter(r => r.hand?.value === bestValue);

      if (winners.length === 1) {
        const w = winners[0];
        const winnerInvested = invested[w.player.id] || this.pot;
        let winnings = 0;
        for (const p of this.players) {
          const pInvested = invested[p.id] || 0;
          // Winner gets min(their investment, opponent's investment) from each player
          winnings += Math.min(winnerInvested, pInvested);
        }
        // Plus any excess from antes/blinds already in pot
        winnings = Math.max(winnings, Math.min(this.pot, winnerInvested * this.players.length));
        winnings = Math.min(winnings, this.pot); // Never more than pot
        w.won = winnings;
        w.player.chips += winnings;
        totalAwarded = winnings;

        // Return excess to other players (side pot remainder)
        const excess = this.pot - winnings;
        if (excess > 0) {
          // Give excess back to the player who put in more
          const others = this.players.filter(p => p.id !== w.player.id && !this.folded.has(p.id) && (invested[p.id] || 0) > winnerInvested);
          if (others.length > 0) {
            const excessShare = Math.floor(excess / others.length);
            for (const o of others) {
              o.chips += excessShare;
            }
          } else {
            // No clear recipient — give to winner
            w.player.chips += excess;
            w.won += excess;
          }
        }
      } else {
        // Split pot between multiple winners
        const share = Math.floor(this.pot / winners.length);
        for (const w of winners) {
          w.won = share;
          w.player.chips += share;
        }
        // Remainder chip to first winner
        const remainder = this.pot - share * winners.length;
        if (remainder > 0) { winners[0].player.chips += remainder; winners[0].won += remainder; }
      }

      this.winner = winners[0].player;
      // NET profit = chips won - own investment
      const winnerTotalInvested = (this._startChips?.[this.winner.id] || 0) - (this.winner.chips - winners[0].won);
      this.potWon = winners[0].won - winnerTotalInvested;
      // Include folded players' cards too (for AI debrief)
      const foldedResults = this.players
        .filter(p => this.folded.has(p.id) && this.holeCards[p.id])
        .map(p => ({ player: p, cards: this.holeCards[p.id], hand: null, won: 0, folded: true }));
      this.showdownResults = [...results, ...foldedResults];

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

    // Notify all AI bots: end of hand + showdown results
    const hero = this.players.find(p => p.isHero);
    const heroWon = this.winner?.isHero;
    const heroStrength = hero ? this._getHandStrength(hero.id) : 0.5;
    for (const bot of Object.values(this.aiBots || {})) {
      if (bot.endHand) bot.endHand({ bigBlind: this.blinds.bb });
      if (bot.observeShowdown) bot.observeShowdown(this.holeCards[hero?.id], heroWon, heroStrength);
    }

    // Wait for player to see showdown
    await this._delay(4000); // Longer showdown for card viewing
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
      // All hole cards — exposed at showdown/hand_over for AI debrief
      allHoleCards: (this.phase === PHASE.SHOWDOWN || this.phase === PHASE.HAND_OVER)
        ? { ...this.holeCards }
        : null,
    };
  }

  _log(msg, player, amount, meta) {
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
      ...(meta || {}),
    });
  }

  _delay(ms) {
    const actual = this._heroFolded ? Math.floor(ms / 2) : ms;
    return new Promise(r => setTimeout(r, actual));
  }
}

export { PHASE, getPositions };
