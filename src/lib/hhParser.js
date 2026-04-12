// hhParser.js — Parse real poker hand histories (GGPoker/PokerStars format)
// Converts text hand histories to internal record format for analysis

import { evaluateHand, compareHands } from '../engine/evaluator.js';

export function parseHandHistory(text) {
  const hands = text.split(/(?=Poker Hand #)/g).filter(h => h.trim().length > 20);
  const parsed = [];

  for (const handText of hands) {
    try {
      const hand = parseOneHand(handText);
      if (hand) parsed.push(hand);
    } catch (e) { /* skip unparseable hands */ }
  }
  return parsed;
}

function parseOneHand(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Header: Poker Hand #tour_XXXX: Tournament #XXXX, ... Level(SB/BB) - DATE
  const header = lines[0];
  const levelMatch = header.match(/Level\d*\(([0-9,]+)\/([0-9,]+)\)/);
  const cashMatch = header.match(/\(\$([0-9,.]+)\/\$([0-9,.]+)\)/);
  const sb = levelMatch ? parseInt(levelMatch[1].replace(/,/g, '')) :
    cashMatch ? parseFloat(cashMatch[1]) : 0;
  const bb = levelMatch ? parseInt(levelMatch[2].replace(/,/g, '')) :
    cashMatch ? parseFloat(cashMatch[2]) : 0;
  const isCashGame = !!cashMatch;
  const tournMatch = header.match(/Tournament #(\d+)/);
  const tournId = tournMatch ? tournMatch[1] : (isCashGame ? 'cash' : '');
  const handIdMatch = header.match(/Hand #(\w+)/);
  const handId = handIdMatch ? handIdMatch[1] : '';
  const dateMatch = header.match(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
  const timestamp = dateMatch ? new Date(dateMatch[0].replace(/\//g, '-')).getTime() : Date.now();

  // Table info
  const tableMatch = lines[1]?.match(/(\d+)-max/);
  const maxPlayers = tableMatch ? parseInt(tableMatch[1]) : 7;

  // Seats
  const seats = [];
  let heroName = 'Hero';
  for (const line of lines) {
    const seatMatch = line.match(/Seat (\d+): (.+?) \(\$?([0-9,.]+) in chips\)/);
    if (seatMatch) {
      const name = seatMatch[2];
      const chips = parseFloat(seatMatch[3].replace(/,/g, ''));
      const isHero = name === 'Hero';
      if (isHero) heroName = name;
      seats.push({ seat: parseInt(seatMatch[1]), name, chips, isHero });
    }
  }

  // Hero cards
  let heroCards = [];
  const holeMatch = text.match(/Dealt to Hero \[(.+?)\]/);
  if (holeMatch) {
    heroCards = holeMatch[1].split(' ').filter(c => c.length >= 2);
  }

  // Community cards by street
  let community = [];
  const flopMatch = text.match(/\*\*\* FLOP \*\*\* \[(.+?)\]/);
  const turnMatch = text.match(/\*\*\* TURN \*\*\* .+?\[(.+?)\]/g);
  const riverMatch = text.match(/\*\*\* RIVER \*\*\* .+?\[(.+?)\]/g);
  if (flopMatch) community = flopMatch[1].split(' ');
  if (turnMatch) {
    const lastTurn = turnMatch[turnMatch.length - 1];
    const m = lastTurn.match(/\[(\w{2})\]$/);
    if (m) community = [...community.slice(0, 3), m[1]];
  }
  if (riverMatch) {
    const lastRiver = riverMatch[riverMatch.length - 1];
    const m = lastRiver.match(/\[(\w{2})\]$/);
    if (m) community = [...community.slice(0, 4), m[1]];
  }

  // Parse actions
  const actions = [];
  let currentStreet = 'preflop';
  const ante = text.match(/posts the ante ([0-9,]+)/);
  const anteVal = ante ? parseInt(ante[1].replace(/,/g, '')) : 0;

  for (const line of lines) {
    if (line.includes('*** FLOP ***')) currentStreet = 'flop';
    if (line.includes('*** TURN ***')) currentStreet = 'turn';
    if (line.includes('*** RIVER ***')) currentStreet = 'river';
    if (line.includes('*** SHOWDOWN ***')) currentStreet = 'showdown';

    // Action parsing
    const actionMatch = line.match(/^(.+?): (folds|checks|calls|raises|bets) ?\$?([0-9,.]*)/);
    if (actionMatch) {
      const name = actionMatch[1];
      let action = actionMatch[2];
      const amount = actionMatch[3] ? parseFloat(actionMatch[3].replace(/,/g, '')) : 0;
      if (action === 'bets') action = 'raises'; // normalize
      const isHero = name === heroName;
      actions.push({ name, action, amount, isHero, street: currentStreet });
    }

    // All-in
    if (line.includes('and is all-in')) {
      const allInMatch = line.match(/^(.+?): (?:raises|calls|bets)/);
      if (allInMatch) {
        const lastAction = actions[actions.length - 1];
        if (lastAction) lastAction.allIn = true;
      }
    }
  }

  // Result
  const heroSeat = seats.find(s => s.isHero);
  let result = 'lost';
  let potWon = 0;
  const collectMatch = text.match(/Hero collected \$?([0-9,.]+)/g);
  if (collectMatch) {
    result = 'won';
    for (const m of collectMatch) {
      const val = m.match(/\$?([0-9,.]+)/);
      if (val) potWon += parseFloat(val[1].replace(/,/g, ''));
    }
  }

  // Hero position
  let heroPosition = '?';
  const heroActions = actions.filter(a => a.isHero && a.street === 'preflop');
  // Determine position from seat order and button
  const btnMatch = text.match(/Seat #(\d+) is the button/);
  if (btnMatch && heroSeat) {
    const btnSeat = parseInt(btnMatch[1]);
    // Simple position inference
    const seatNums = seats.map(s => s.seat).sort((a, b) => a - b);
    const btnIdx = seatNums.indexOf(btnSeat);
    const heroIdx = seatNums.indexOf(heroSeat.seat);
    const n = seatNums.length;
    const relPos = ((heroIdx - btnIdx - 1) + n) % n;
    if (n <= 3) {
      heroPosition = relPos === 0 ? 'BTN' : relPos === 1 ? 'SB' : 'BB';
    } else {
      const posMap = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
      heroPosition = posMap[relPos] || 'MP';
    }
  }

  // Opponent cards at showdown
  const oppCards = {};
  const showMatches = text.matchAll(/(\w+): shows \[(.+?)\]/g);
  for (const m of showMatches) {
    if (m[1] !== heroName) {
      oppCards[m[1]] = m[2];
    }
  }

  // Hero first action
  const heroFirstAction = heroActions[0]?.action || 'fold';
  const heroAllActions = actions.filter(a => a.isHero).map(a => ({ stage: a.street, action: a.action, amount: a.amount }));

  return {
    handId, tournId, timestamp, maxPlayers,
    blinds: { sb, bb, ante: anteVal },
    position: heroPosition,
    holeCards: heroCards.join(' '),
    community: community.join(' '),
    players: seats,
    actions: heroAllActions,
    allActions: actions,
    heroAction: heroFirstAction,
    result, potWon,
    heroChipsBefore: heroSeat?.chips || 0,
    opponentCards: oppCards,
    isRealMoney: true,
  };
}

// Save opponent profiles to localStorage for bot learning
export function saveOpponentProfiles(hands) {
  try {
    const profiles = JSON.parse(localStorage.getItem('pokertrain_opponents') || '{}');

    // Build per-opponent stats
    for (const h of hands) {
      for (const a of h.allActions || []) {
        if (a.isHero || !a.name) continue;
        if (!profiles[a.name]) {
          profiles[a.name] = { hands: 0, vpip: 0, pfr: 0, calls: 0, raises: 0, folds: 0, limps: 0, showdowns: [], lastSeen: 0 };
        }
        const p = profiles[a.name];
        if (a.street === 'preflop') {
          if (!p._handsSeen) p._handsSeen = new Set();
          const hKey = h.handId + a.name;
          if (!p._handsSeen.has(hKey)) {
            p._handsSeen.add(hKey);
            p.hands++;
            if (a.action === 'folds') p.folds++;
            else {
              p.vpip++;
              if (a.action === 'raises') p.raises++;
              else if (a.action === 'calls') { p.calls++; p.limps++; }
            }
          }
        }
        p.lastSeen = Math.max(p.lastSeen, h.timestamp || 0);
      }
      // Track showdown hands
      for (const [name, cards] of Object.entries(h.opponentCards || {})) {
        if (profiles[name]) {
          profiles[name].showdowns.push(cards);
          if (profiles[name].showdowns.length > 20) profiles[name].showdowns.shift();
        }
      }
    }

    // Clean up internal tracking and compute final stats
    for (const [name, p] of Object.entries(profiles)) {
      delete p._handsSeen;
      if (p.hands > 0) {
        p.vpipPct = Math.round(p.vpip / p.hands * 100);
        p.pfrPct = Math.round(p.raises / p.hands * 100);
        p.af = p.calls > 0 ? Math.round(p.raises / p.calls * 10) / 10 : p.raises > 0 ? 99 : 0;
        p.type = p.vpipPct > 40 && p.pfrPct < 10 ? 'STATION' :
          p.vpipPct > 35 && p.af < 1 ? 'LIMPER' :
          p.vpipPct < 18 ? 'NIT' :
          p.vpipPct < 28 && p.pfrPct > 15 ? 'TAG' :
          p.vpipPct >= 28 && p.af > 2.5 ? 'LAG' :
          p.vpipPct >= 45 && p.af > 3 ? 'MANIAC' : 'UNKNOWN';
      }
    }

    localStorage.setItem('pokertrain_opponents', JSON.stringify(profiles));
    return profiles;
  } catch (e) { return {}; }
}

// Load saved opponent profiles
export function loadOpponentProfiles() {
  try {
    return JSON.parse(localStorage.getItem('pokertrain_opponents') || '{}');
  } catch (e) { return {}; }
}

// Analyze parsed hands — same metrics as bot debrief
export function analyzeRealHands(hands) {
  if (!hands || hands.length === 0) return null;

  // Group by tournament
  const tournaments = {};
  for (const h of hands) {
    const tid = h.tournId || 'cash';
    if (!tournaments[tid]) tournaments[tid] = [];
    tournaments[tid].push(h);
  }

  // Per-hand stats
  const totalHands = hands.length;
  const pfHands = hands.filter(h => h.actions.some(a => a.stage === 'preflop'));
  const vpipHands = pfHands.filter(h => {
    const pf = h.actions.find(a => a.stage === 'preflop');
    return pf && pf.action !== 'fold';
  });
  const pfrHands = pfHands.filter(h => {
    const pf = h.actions.find(a => a.stage === 'preflop');
    return pf && pf.action === 'raises';
  });
  const vpip = pfHands.length > 0 ? Math.round(vpipHands.length / pfHands.length * 100) : 0;
  const pfr = pfHands.length > 0 ? Math.round(pfrHands.length / pfHands.length * 100) : 0;

  // Position stats
  const posStat = {};
  for (const h of hands) {
    const pos = h.position;
    if (!posStat[pos]) posStat[pos] = { hands: 0, won: 0, vpip: 0, pfr: 0 };
    posStat[pos].hands++;
    if (h.result === 'won') posStat[pos].won++;
    const pf = h.actions.find(a => a.stage === 'preflop');
    if (pf && pf.action !== 'fold') posStat[pos].vpip++;
    if (pf && pf.action === 'raises') posStat[pos].pfr++;
  }

  // Limps
  const limps = hands.filter(h => {
    const pf = h.actions.find(a => a.stage === 'preflop');
    return pf && pf.action === 'calls' && h.blinds?.bb && pf.amount <= h.blinds.bb;
  });

  // Showdown hands
  const showdownHands = hands.filter(h => h.holeCards && h.community && h.result !== 'fold' && h.community.split(' ').length >= 3);

  // Key hands (big pots won/lost)
  const sortedByPot = [...hands].filter(h => h.potWon > 0 || h.result === 'lost').sort((a, b) => (b.potWon || 0) - (a.potWon || 0));
  const bigWins = sortedByPot.filter(h => h.potWon > 0).slice(0, 5);
  const bigLosses = [...hands].filter(h => h.result === 'lost' && h.actions.length > 1).slice(0, 5);

  // Mistakes: limp from non-BB, call river with high card
  const mistakes = [];
  for (const h of limps) {
    if (h.position !== 'BB' && h.position !== 'SB') {
      mistakes.push({ hand: h, type: 'limp', reason: `Лимп ${h.holeCards} из ${h.position}. Raise or fold.` });
    }
  }

  return {
    totalHands,
    vpip, pfr,
    vpipPfrGap: vpip - pfr,
    limps: limps.length,
    positionStats: posStat,
    tournaments: Object.entries(tournaments).map(([id, hh]) => ({
      id, hands: hh.length,
      result: hh.reduce((a, h) => a + (h.potWon || 0), 0) > hh.length * hh[0]?.blinds?.bb ? 'profit' : 'loss',
    })),
    bigWins,
    bigLosses,
    mistakes,
    showdownCount: showdownHands.length,
    hands, // all parsed hands for detailed view
  };
}
