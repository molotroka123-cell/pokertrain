// handHistoryParser.js — Parses tournament .txt hand histories
// Supports PokerStars and GG Poker formats (most common tournament TXT exports).

const POSITION_LABELS_6MAX = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
const POSITION_LABELS_9MAX = ['UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function assignPositions(seats, buttonSeat) {
  // seats: [{seat, name, stack}] sorted by seat number
  // Order: starting from seat after button → SB, BB, UTG, ...
  const n = seats.length;
  if (n < 2) return {};

  // Find button index in seats array
  const btnIdx = seats.findIndex(s => s.seat === buttonSeat);
  if (btnIdx === -1) return {};

  // Positions in play order starting from SB (seat after button)
  const labels = n <= 6 ? POSITION_LABELS_6MAX : POSITION_LABELS_9MAX;

  // Reorder: SB, BB, UTG, ..., BTN
  const ordered = [];
  for (let i = 1; i <= n; i++) {
    ordered.push(seats[(btnIdx + i) % n]);
  }
  // ordered[0] = SB, ordered[1] = BB, ordered[last] = BTN
  const byName = {};
  // Remap:
  //   n=2: [SB, BB] — SB is also BTN heads-up
  //   n=6: [SB, BB, UTG, MP, CO, BTN]
  //   n=9: [SB, BB, UTG, UTG+1, MP, MP+1, HJ, CO, BTN]
  const map6 = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];
  const map9 = ['SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO', 'BTN'];
  const map = n <= 2 ? ['SB', 'BB'] : n <= 6 ? map6.slice(0, n) : map9.slice(0, n);

  ordered.forEach((p, i) => {
    byName[p.name] = map[i] || `Seat${p.seat}`;
  });
  return byName;
}

function detectFormat(text) {
  if (/^PokerStars Hand/m.test(text) || /^PokerStars Game/m.test(text)) return 'pokerstars';
  if (/^Poker Hand #\w+: /m.test(text) || /^GG Poker/m.test(text)) return 'ggpoker';
  if (/^Hand History for/m.test(text)) return 'partypoker';
  return 'unknown';
}

function parseCards(raw) {
  // "[As Kd]" → ["As", "Kd"]
  const m = raw.match(/\[([^\]]+)\]/);
  if (!m) return [];
  return m[1].trim().split(/\s+/);
}

function parseSingleHand(text, format) {
  const hand = {
    handId: null,
    timestamp: null,
    format: null,           // 'cash' | 'tournament'
    tournamentId: null,
    buyIn: null,
    stakes: null,
    level: null,
    tableName: null,
    tableSize: null,
    buttonSeat: null,
    seats: [],
    positions: {},
    hero: null,
    heroCards: [],
    heroPosition: null,
    heroStack: null,
    bigBlind: null,
    smallBlind: null,
    ante: null,
    streets: { preflop: [], flop: [], turn: [], river: [] },
    board: { flop: [], turn: null, river: null },
    potFinal: null,
    winner: null,
    heroResult: 0, // +/- chips net
    rawText: text,
  };

  const lines = text.split(/\r?\n/).map(l => l.trim());

  // Header — extract ID, stakes, timestamp
  const header = lines[0] || '';
  // PokerStars: "PokerStars Hand #242342342:  Tournament #3243252, $10+$1 USD Hold'em No Limit - Level II (10/20) - 2023/01/01 12:00:00 ET"
  // GG: "Poker Hand #HD12345: Tournament #T12345, Hold'em No Limit - Level1(10/20) - 2023-01-01 12:00:00"
  const hIdMatch = header.match(/Hand #(\w+)/);
  if (hIdMatch) hand.handId = hIdMatch[1];
  const tIdMatch = header.match(/Tournament #(\w+)/);
  if (tIdMatch) {
    hand.tournamentId = tIdMatch[1];
    hand.format = 'tournament';
  } else if (/Cash Game/i.test(header) || /Hold'em No Limit \(\$/i.test(header)) {
    hand.format = 'cash';
  } else {
    hand.format = 'tournament';
  }
  const buyMatch = header.match(/\$([\d.]+)(?:\+\$?([\d.]+))?/);
  if (buyMatch) hand.buyIn = parseFloat(buyMatch[1]) + (parseFloat(buyMatch[2] || 0));
  const lvlMatch = header.match(/Level[\s-]*([IVXLCDM0-9]+)\s*\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\)/);
  if (lvlMatch) {
    hand.level = lvlMatch[1];
    hand.smallBlind = parseFloat(lvlMatch[2]);
    hand.bigBlind = parseFloat(lvlMatch[3]);
  } else {
    const blindMatch = header.match(/\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\)/);
    if (blindMatch) {
      hand.smallBlind = parseFloat(blindMatch[1]);
      hand.bigBlind = parseFloat(blindMatch[2]);
    }
  }
  const tsMatch = header.match(/(\d{4}[-/]\d{2}[-/]\d{2}[\s]+\d{2}:\d{2}:\d{2})/);
  if (tsMatch) hand.timestamp = tsMatch[1];

  // Table: "Table '3243252 1' 9-max Seat #3 is the button"
  const tableMatch = text.match(/Table ['"]?([^'"\n]+?)['"]?\s+(\d+)-max.*?Seat\s+#?(\d+)\s+is\s+the\s+button/i)
    || text.match(/Table ['"]?([^'"\n]+?)['"]?.*?Seat\s+#?(\d+)\s+is\s+the\s+button/i);
  if (tableMatch) {
    hand.tableName = tableMatch[1];
    if (tableMatch.length === 4) {
      hand.tableSize = parseInt(tableMatch[2], 10);
      hand.buttonSeat = parseInt(tableMatch[3], 10);
    } else {
      hand.buttonSeat = parseInt(tableMatch[2], 10);
    }
  }

  // Seats: "Seat 1: PlayerName ($1,500 in chips)" or "Seat 1: PlayerName (1500 in chips)"
  const seatRe = /Seat\s+(\d+):\s+(.+?)\s+\(\$?([\d,]+(?:\.\d+)?)\s+in chips\)/g;
  let sm;
  while ((sm = seatRe.exec(text)) !== null) {
    hand.seats.push({
      seat: parseInt(sm[1], 10),
      name: sm[2].trim(),
      stack: parseFloat(sm[3].replace(/,/g, '')),
    });
  }
  hand.seats.sort((a, b) => a.seat - b.seat);

  if (!hand.tableSize) hand.tableSize = hand.seats.length;

  // Positions
  if (hand.buttonSeat) {
    hand.positions = assignPositions(hand.seats, hand.buttonSeat);
  }

  // Hero: "Dealt to Hero [As Kd]"
  const heroMatch = text.match(/Dealt to\s+([^\[\n]+?)\s+\[([^\]]+)\]/);
  if (heroMatch) {
    hand.hero = heroMatch[1].trim();
    hand.heroCards = heroMatch[2].trim().split(/\s+/);
    hand.heroPosition = hand.positions[hand.hero] || null;
    const heroSeat = hand.seats.find(s => s.name === hand.hero);
    if (heroSeat) hand.heroStack = heroSeat.stack;
  }

  // Ante
  const anteMatch = text.match(/posts the ante\s+([\d.]+)/);
  if (anteMatch) hand.ante = parseFloat(anteMatch[1]);

  // Streets
  const streetSplit = text.split(/\*\*\*\s*(HOLE CARDS|FLOP|TURN|RIVER|SHOW DOWN|SUMMARY)\s*\*\*\*/i);
  // streetSplit = [pre-hole, 'HOLE CARDS', pre-flop-body, 'FLOP', ...]
  const sections = {};
  for (let i = 1; i < streetSplit.length; i += 2) {
    sections[streetSplit[i].toUpperCase()] = streetSplit[i + 1] || '';
  }

  const parseActions = (body) => {
    const actions = [];
    if (!body) return actions;
    const actionLines = body.split(/\r?\n/);
    for (const line of actionLines) {
      // "Player: folds"
      // "Player: calls $5"
      // "Player: raises $15 to $20"
      // "Player: bets $10"
      // "Player: checks"
      // "Player: all-in" or "(all-in)"
      const m = line.match(/^(.+?):\s+(folds|checks|calls|bets|raises|all-in)(?:\s+\$?([\d,.]+))?(?:\s+to\s+\$?([\d,.]+))?/i);
      if (!m) continue;
      const name = m[1].trim();
      const actRaw = m[2].toLowerCase();
      const amount = m[3] ? parseFloat(m[3].replace(/,/g, '')) : null;
      const toAmount = m[4] ? parseFloat(m[4].replace(/,/g, '')) : null;
      const isAllIn = /all-in/i.test(line);
      let action = actRaw;
      if (action === 'bets') action = 'bet';
      else if (action === 'calls') action = 'call';
      else if (action === 'raises') action = 'raise';
      else if (action === 'all-in') action = 'shove';
      actions.push({
        player: name,
        action,
        amount: toAmount != null ? toAmount : amount,
        raiseIncrement: amount,
        isAllIn,
      });
    }
    return actions;
  };

  hand.streets.preflop = parseActions(sections['HOLE CARDS'] || '');
  hand.streets.flop = parseActions(sections['FLOP'] || '');
  hand.streets.turn = parseActions(sections['TURN'] || '');
  hand.streets.river = parseActions(sections['RIVER'] || '');

  // Board
  const flopMatch = text.match(/\*\*\*\s*FLOP\s*\*\*\*\s*\[([^\]]+)\]/i);
  if (flopMatch) hand.board.flop = flopMatch[1].trim().split(/\s+/);
  const turnMatch = text.match(/\*\*\*\s*TURN\s*\*\*\*\s*\[[^\]]+\]\s*\[([^\]]+)\]/i);
  if (turnMatch) hand.board.turn = turnMatch[1].trim();
  const riverMatch = text.match(/\*\*\*\s*RIVER\s*\*\*\*\s*\[[^\]]+\]\s*\[([^\]]+)\]/i);
  if (riverMatch) hand.board.river = riverMatch[1].trim();

  // Summary / winner
  const summary = sections['SUMMARY'] || '';
  const winMatch = summary.match(/(.+?)\s+collected\s+\$?([\d,.]+)/i)
    || text.match(/(.+?)\s+collected\s+\(\$?([\d,.]+)\)/);
  if (winMatch) {
    hand.winner = winMatch[1].trim();
    hand.potFinal = parseFloat(winMatch[2].replace(/,/g, ''));
  }

  // Hero result (approximation): sum of hero contributions minus pot if hero won
  if (hand.hero) {
    let invested = 0;
    ['preflop', 'flop', 'turn', 'river'].forEach(st => {
      hand.streets[st].forEach(a => {
        if (a.player === hand.hero && a.amount && ['call', 'raise', 'bet', 'shove'].includes(a.action)) {
          invested = Math.max(invested, a.amount); // on each street, largest chip commit is what counts
        }
      });
    });
    // Note: This is a rough approximation. Real hand history tracking needs cumulative commits per street.
    // For leak detection we care more about decisions than exact dollar result.
    hand.heroInvested = invested;
    if (hand.winner === hand.hero && hand.potFinal) {
      hand.heroResult = hand.potFinal - invested;
    } else if (hand.hero && hand.winner && hand.winner !== hand.hero) {
      hand.heroResult = -invested;
    }
  }

  return hand;
}

export function splitHands(fileText) {
  // Hand histories are separated by blank lines; each hand starts with a header line
  const text = fileText.replace(/\r\n/g, '\n');
  // Split on the header pattern
  const chunks = text.split(/\n\n+(?=(?:PokerStars|Poker|GG Poker|Hand History))/);
  return chunks.map(c => c.trim()).filter(c => c.length > 20);
}

export function parseFile(fileText) {
  const format = detectFormat(fileText);
  const chunks = splitHands(fileText);
  const hands = [];
  for (const chunk of chunks) {
    try {
      const h = parseSingleHand(chunk, format);
      if (h.handId) hands.push(h);
    } catch (e) {
      // Skip malformed hand, keep parsing rest
    }
  }
  return { format, hands };
}
