// coachHands.js — Tournament hands from GTO Wizard with full solutions
// Each hand captures the full street-by-street context and the GTO correction.
// Used by the "Тренер Турниры" (Tournament Coach) study module.

export const COACH_HANDS = [
  {
    id: 'sb_call_jam_a7o_24bb',
    title: 'SB A7o vs HJ Jam — call wider',
    tags: ['preflop', 'facing_jam', 'sb', 'defend_short'],
    blinds: '2500/5000 (600)',
    level: 'MTT',
    hero: { pos: 'SB', cards: 'A♠7♥', stackBB: 24 },
    players: {
      UTG: 31.9, UTG1: 29.9, LJ: 21.5, HJ: 6.56, CO: 29.1, BTN: 18.7, SB: 24, BB: 10.3,
    },
    action: [
      { street: 'preflop', actor: 'UTG', action: 'fold' },
      { street: 'preflop', actor: 'UTG1', action: 'fold' },
      { street: 'preflop', actor: 'LJ', action: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'all_in', size: 6.56 },
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'fold' },
      { street: 'preflop', actor: 'SB', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.08,
    explanation:
      'При жаме HJ на 6.56bb, SB получает огромные шансы банка. A7o доминирует много рук из диапазона жама короткого HJ. Fold теряет EV — нужно call.',
    lesson: 'Защита vs короткого all-in: A-high и PP от 22+ = call, даже A7o/A5o.',
  },

  {
    id: 'lj_33_open_23bb',
    title: 'LJ 33 — small pairs fold at 23bb',
    tags: ['preflop', 'rfi', 'lj', 'small_pair'],
    blinds: '2500/5000 (600)',
    level: 'MTT',
    hero: { pos: 'LJ', cards: '3♦3♥', stackBB: 23.1 },
    players: {
      UTG: 27.6, UTG1: 18.2, LJ: 23.1, HJ: 6.04, CO: 29.7, BTN: 25.9, SB: 27.5, BB: 14,
    },
    action: [
      { street: 'preflop', actor: 'UTG', action: 'fold' },
      { street: 'preflop', actor: 'UTG1', action: 'fold' },
      { street: 'preflop', actor: 'LJ', action: 'raise', size: 2, mistake: true, gto: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'fold' },
      { street: 'preflop', actor: 'CO', action: 'call' },
      { street: 'preflop', actor: 'BTN', action: 'fold' },
      { street: 'preflop', actor: 'SB', action: 'call' },
      { street: 'preflop', actor: 'BB', action: 'fold' },
      { street: 'flop', board: 'J♥T♦4♠', pot: 7.96 },
      { street: 'flop', actor: 'SB', action: 'check' },
      { street: 'flop', actor: 'LJ', action: 'check', mistake: true, gto: 'bet' },
      { street: 'flop', actor: 'CO', action: 'bet', size: 3.98 },
      { street: 'flop', actor: 'SB', action: 'fold' },
      { street: 'flop', actor: 'LJ', action: 'fold' },
    ],
    verdict: 'Mistake',
    evLoss: 0.07,
    explanation:
      'С 33 из LJ при 23bb — плохой сет-майнинг (нет глубины) и плохая плейабилити. GTO рекомендует fold. Даже если открыл, ты должен c-bet на JTx как часть своего range (чтобы не капитулировать против flat-caller).',
    lesson: 'Маленькие пары (22-44) на ранних позициях при 20-30bb — часто fold. Открытие = ~180 combos (13%), не 22+.',
  },

  {
    id: 'btn_ato_vs_utg1_open_26bb',
    title: 'BTN ATo vs UTG1 open — call, don\'t fold',
    tags: ['preflop', 'vs_open', 'btn', 'ato'],
    blinds: '1000/2000 (250)',
    level: 'MTT',
    hero: { pos: 'BTN', cards: 'A♠T♣', stackBB: 26 },
    players: {
      UTG: 46.3, UTG1: 63.9, LJ: 34.7, HJ: 5.11, CO: 9.57, BTN: 26, SB: 22.6, BB: 39.1,
    },
    action: [
      { street: 'preflop', actor: 'UTG', action: 'fold' },
      { street: 'preflop', actor: 'UTG1', action: 'raise', size: 3 },
      { street: 'preflop', actor: 'LJ', action: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'fold' },
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.13,
    explanation:
      'ATo на BTN против 3x open с ранней позиции — GTO flat call. Есть IP, блокеры (A и T) к премиумам, хорошие одно-пары. 3-bet с ATo тут плохо (доминируется AQ/AK/AJs/TT+).',
    lesson: 'BTN vs UTG1/LJ open: ATo, A9s, KQo, KJo, TT, 99 = часто call, не fold. Реализуешь equity в позиции.',
  },

  {
    id: 'bb_94o_multiway_fold_21bb',
    title: 'BB 94o multiway — fold даже с шансами',
    tags: ['preflop', 'bb_defense', 'multiway', 'trash'],
    blinds: '125/250 (30)',
    level: 'MTT',
    hero: { pos: 'BB', cards: '9♦4♠', stackBB: 21.2 },
    players: {
      LJ: 140, HJ: 128, CO: 39.1, BTN: 120, SB: 40.2, BB: 21.2,
    },
    action: [
      { street: 'preflop', actor: 'LJ', action: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'raise', size: 2 },
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'call' },
      { street: 'preflop', actor: 'SB', action: 'fold' },
      { street: 'preflop', actor: 'BB', action: 'call', mistake: true, gto: 'fold' },
      { street: 'flop', board: 'K♣7♠2♦', pot: 7.22 },
      { street: 'flop', actor: 'BB', action: 'check' },
      { street: 'flop', actor: 'HJ', action: 'bet', size: 3.3 },
      { street: 'flop', actor: 'BTN', action: 'fold' },
      { street: 'flop', actor: 'BB', action: 'fold' },
    ],
    verdict: 'Mistake',
    evLoss: 0.15,
    explanation:
      'Multiway с 94o — слишком слабо даже при 3:1 шансах банка. Ты будешь флопать мало (нет коннекторов, нет мастей), а постфлоп против 2 игроков OOP теряешь часто.',
    lesson: 'BB defend vs HJ+BTN multiway: fold almost all трэш (92o, 94o, 52o). Call только: любые suited, 65o+, K5o+, любой A, любая пара.',
  },

  {
    id: 'utg1_88_jj6_flop_check_25bb',
    title: 'UTG1 88 call 3bet → flop JJ6 check',
    tags: ['postflop', 'flop', 'vs_3bet', 'flop_check'],
    blinds: '1000/2000 (250)',
    level: 'MTT',
    hero: { pos: 'UTG1', cards: '8♣8♥', stackBB: 25.5 },
    players: {
      UTG: 9.07, UTG1: 25.5, LJ: 21.6, HJ: 34.6, CO: 44.3, BTN: 65.6, SB: 32.2, BB: 14.3,
    },
    action: [
      { street: 'preflop', actor: 'UTG', action: 'fold' },
      { street: 'preflop', actor: 'UTG1', action: 'raise', size: 2 },
      { street: 'preflop', actor: 'HJ', action: 'raise', size: 6.88 },
      { street: 'preflop', actor: 'UTG1', action: 'call' },
      { street: 'flop', board: 'J♥J♦6♦', pot: 16.3 },
      { street: 'flop', actor: 'UTG1', action: 'bet', size: 8.13, mistake: true, gto: 'check' },
      { street: 'flop', actor: 'HJ', action: 'all_in' },
      { street: 'flop', actor: 'UTG1', action: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.25,
    explanation:
      'На JJ6 flop как preflop caller vs 3bettor — range vs range невыгодно лидить. 3-better имеет JJ+, AA, KK, QQ намного чаще. 88 нужен чек-колл (bluff-catcher), не bet-jam.',
    lesson: 'После call 3-bet OOP — чекай как default. Лид только на flop которые бьют твой range (98x, 76x, low connectors).',
  },
];

// Group by tag for filtering
export function getHandsByTag(tag) {
  return COACH_HANDS.filter(h => h.tags.includes(tag));
}

// Group by position
export function getHandsByPosition(pos) {
  return COACH_HANDS.filter(h => h.hero.pos === pos);
}

// Summary stats for analytics
export function getCoachStats() {
  const byVerdict = {};
  let totalEvLost = 0;
  for (const h of COACH_HANDS) {
    byVerdict[h.verdict] = (byVerdict[h.verdict] || 0) + 1;
    totalEvLost += h.evLoss;
  }
  return {
    total: COACH_HANDS.length,
    byVerdict,
    totalEvLost: Math.round(totalEvLost * 100) / 100,
    avgEvLoss: Math.round(totalEvLost / COACH_HANDS.length * 100) / 100,
  };
}
