// pushFoldCharts.js — Nash push/fold ranges by position and M-ratio
// true = push, false = fold
// Based on standard Nash ICM charts

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

// Hand key: "AKs", "AKo", "AA", etc.
function handKey(c1, c2) {
  const r1 = RANKS.indexOf(c1[0]);
  const r2 = RANKS.indexOf(c2[0]);
  const suited = c1[1] === c2[1];
  if (r1 === r2) return RANKS[r1] + RANKS[r2];
  const hi = Math.min(r1, r2);
  const lo = Math.max(r1, r2);
  return RANKS[hi] + RANKS[lo] + (suited ? 's' : 'o');
}

// Push ranges by M-ratio and position
// M <= value means push with this hand
// Higher M = tighter range
const PUSH_CHARTS = {
  // BTN push ranges
  BTN: {
    'AA': 99, 'KK': 99, 'QQ': 99, 'JJ': 99, 'TT': 99, '99': 99, '88': 25, '77': 20, '66': 15, '55': 13, '44': 11, '33': 10, '22': 9,
    'AKs': 99, 'AQs': 99, 'AJs': 99, 'ATs': 30, 'A9s': 25, 'A8s': 20, 'A7s': 18, 'A6s': 16, 'A5s': 20, 'A4s': 18, 'A3s': 15, 'A2s': 13,
    'AKo': 99, 'AQo': 99, 'AJo': 30, 'ATo': 20, 'A9o': 15, 'A8o': 13, 'A7o': 11, 'A6o': 10, 'A5o': 12, 'A4o': 10, 'A3o': 9, 'A2o': 8,
    'KQs': 30, 'KJs': 25, 'KTs': 20, 'K9s': 15, 'K8s': 12, 'K7s': 10, 'K6s': 9, 'K5s': 8, 'K4s': 7, 'K3s': 7, 'K2s': 6,
    'KQo': 20, 'KJo': 15, 'KTo': 12, 'K9o': 10, 'K8o': 7, 'K7o': 6, 'K6o': 5, 'K5o': 5, 'K4o': 5, 'K3o': 4, 'K2o': 4,
    'QJs': 20, 'QTs': 18, 'Q9s': 13, 'Q8s': 10, 'Q7s': 7, 'Q6s': 7, 'Q5s': 6, 'Q4s': 6, 'Q3s': 5, 'Q2s': 5,
    'QJo': 13, 'QTo': 11, 'Q9o': 8, 'Q8o': 6, 'Q7o': 5,
    'JTs': 18, 'J9s': 13, 'J8s': 10, 'J7s': 7, 'J6s': 5,
    'JTo': 11, 'J9o': 7, 'J8o': 5,
    'T9s': 15, 'T8s': 10, 'T7s': 7,
    'T9o': 8, 'T8o': 5,
    '98s': 13, '97s': 8, '96s': 6,
    '98o': 6,
    '87s': 11, '86s': 7, '85s': 5,
    '76s': 10, '75s': 6,
    '65s': 9, '64s': 5,
    '54s': 9, '53s': 5,
    '43s': 7,
    '32s': 5,
  },
  // CO push ranges (tighter than BTN)
  CO: {
    'AA': 99, 'KK': 99, 'QQ': 99, 'JJ': 99, 'TT': 99, '99': 20, '88': 15, '77': 12, '66': 10, '55': 9, '44': 8, '33': 7, '22': 6,
    'AKs': 99, 'AQs': 99, 'AJs': 25, 'ATs': 20, 'A9s': 15, 'A8s': 13, 'A7s': 12, 'A6s': 10, 'A5s': 13, 'A4s': 11, 'A3s': 10, 'A2s': 9,
    'AKo': 99, 'AQo': 25, 'AJo': 18, 'ATo': 13, 'A9o': 10, 'A8o': 8, 'A7o': 7, 'A6o': 6, 'A5o': 8, 'A4o': 6, 'A3o': 5, 'A2o': 5,
    'KQs': 20, 'KJs': 15, 'KTs': 13, 'K9s': 10, 'K8s': 7, 'K7s': 6, 'K6s': 5, 'K5s': 5,
    'KQo': 13, 'KJo': 10, 'KTo': 8, 'K9o': 6,
    'QJs': 13, 'QTs': 11, 'Q9s': 8, 'Q8s': 6,
    'QJo': 8, 'QTo': 6,
    'JTs': 12, 'J9s': 8, 'J8s': 6,
    'T9s': 10, 'T8s': 7,
    '98s': 9, '97s': 6,
    '87s': 8, '76s': 7, '65s': 6, '54s': 6,
  },
  // SB push ranges
  SB: {
    'AA': 99, 'KK': 99, 'QQ': 99, 'JJ': 99, 'TT': 99, '99': 99, '88': 25, '77': 20, '66': 15, '55': 12, '44': 10, '33': 9, '22': 8,
    'AKs': 99, 'AQs': 99, 'AJs': 99, 'ATs': 30, 'A9s': 25, 'A8s': 20, 'A7s': 18, 'A6s': 15, 'A5s': 20, 'A4s': 18, 'A3s': 15, 'A2s': 13,
    'AKo': 99, 'AQo': 99, 'AJo': 30, 'ATo': 20, 'A9o': 15, 'A8o': 12, 'A7o': 10, 'A6o': 9, 'A5o': 12, 'A4o': 9, 'A3o': 8, 'A2o': 7,
    'KQs': 25, 'KJs': 20, 'KTs': 15, 'K9s': 12, 'K8s': 9, 'K7s': 8, 'K6s': 7, 'K5s': 6, 'K4s': 5, 'K3s': 5, 'K2s': 5,
    'KQo': 18, 'KJo': 13, 'KTo': 10, 'K9o': 8, 'K8o': 5, 'K7o': 5,
    'QJs': 18, 'QTs': 15, 'Q9s': 10, 'Q8s': 7, 'Q7s': 5, 'Q6s': 5, 'Q5s': 5,
    'QJo': 10, 'QTo': 8, 'Q9o': 5,
    'JTs': 15, 'J9s': 10, 'J8s': 7,
    'JTo': 8, 'J9o': 5,
    'T9s': 13, 'T8s': 8, 'T7s': 5,
    '98s': 11, '97s': 7,
    '87s': 10, '86s': 5,
    '76s': 8, '65s': 7, '54s': 7, '43s': 5,
  },
  // UTG push (very tight)
  UTG: {
    'AA': 99, 'KK': 99, 'QQ': 99, 'JJ': 20, 'TT': 13, '99': 10, '88': 8, '77': 7, '66': 6, '55': 5,
    'AKs': 99, 'AQs': 20, 'AJs': 13, 'ATs': 10, 'A9s': 7, 'A8s': 6, 'A5s': 7, 'A4s': 6,
    'AKo': 20, 'AQo': 13, 'AJo': 10, 'ATo': 7,
    'KQs': 10, 'KJs': 8,
    'QJs': 7, 'JTs': 7, 'T9s': 5, '98s': 5,
  },
};

// Should push? Returns { push: bool, chart: string, maxM: number }
export function shouldPush(card1, card2, position, mRatio) {
  const key = handKey(card1, card2);
  const chart = PUSH_CHARTS[position] || PUSH_CHARTS.CO;
  const maxM = chart[key] || 0;
  return {
    push: mRatio <= maxM,
    maxM,
    hand: key,
    position,
    mRatio,
  };
}

// Get full push range for position + M as list of hands
export function getPushRange(position, mRatio) {
  const chart = PUSH_CHARTS[position] || PUSH_CHARTS.CO;
  const hands = [];
  for (const [hand, maxM] of Object.entries(chart)) {
    if (mRatio <= maxM) hands.push(hand);
  }
  return hands;
}

export { PUSH_CHARTS, handKey };
