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

  // ═══ BATCH 2: Jam-defense pattern (6 hands — systematic BB/SB overfold) ═══

  {
    id: 'bb_q8_call_btn_jam_14bb',
    title: 'BB Q8o — call BTN 6bb jam',
    tags: ['preflop', 'facing_jam', 'bb', 'defend_short'],
    blinds: '500/1000 (150)',
    level: 'MTT',
    hero: { pos: 'BB', cards: 'Q♣8♣', stackBB: 13.8 },
    players: { CO: 7.87, BTN: 6.17, SB: 14, BB: 13.8 },
    action: [
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'all_in', size: 6.17 },
      { street: 'preflop', actor: 'SB', action: 'fold' },
      { street: 'preflop', actor: 'BB', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.59,
    explanation:
      'BTN shove 6bb в BB = огромные шансы банка (~1:1.5). Q8o доминирует много рук из shove range BTN (Qx, 8x, low pairs). Fold теряет 0.59bb EV.',
    lesson: 'vs BTN jam ≤10bb из BB: call любой Q+ kicker, любой A, любой K, пара 22+, и много suited connectors.',
  },

  {
    id: 'sb_t6_jam_10bb',
    title: 'SB T6o — shove at 10bb',
    tags: ['preflop', 'rfi', 'sb', 'push_fold'],
    blinds: '750/1500 (225)',
    level: 'MTT',
    hero: { pos: 'SB', cards: 'T♣6♣', stackBB: 10.2 },
    players: { CO: 6.7, BTN: 7.3, SB: 10.2, BB: 3.7 },
    action: [
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'fold' },
      { street: 'preflop', actor: 'SB', action: 'fold', mistake: true, gto: 'all_in' },
    ],
    verdict: 'Mistake',
    evLoss: 0.66,
    explanation:
      'SB 10bb vs BB 3.7bb (короче) — мощный ICM-мотив бить. T6o 93% GTO шов: BB не может защищаться широко с 3.7bb стеком (фолды → +1.5bb pot). Любой 2-карты, pair+, Kx, Ax — jam.',
    lesson: 'SB 10bb vs коротыш BB: Nash чарты дают всё что выше 72o. Fold = leak.',
  },

  {
    id: 'bb_j2_call_sb_jam_4bb',
    title: 'BB J2o — call SB 4bb jam',
    tags: ['preflop', 'facing_jam', 'bb', 'defend_micro'],
    blinds: '125/250 (38)',
    level: 'MTT',
    hero: { pos: 'BB', cards: 'J♦2♦', stackBB: 15.8 },
    players: { CO: 19, BTN: 14, SB: 4, BB: 15.8 },
    action: [
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'fold' },
      { street: 'preflop', actor: 'SB', action: 'all_in', size: 4 },
      { street: 'preflop', actor: 'BB', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.74,
    explanation:
      'SB 4bb jam — отчаянный шов, range почти any-two (80%+). J-high уже сильно впереди. Шансы банка 2.5:1. Fold = huge leak.',
    lesson: 'vs SB jam ≤5bb: call ЛЮБЫМИ картами где high card J+. Даже J2o, T2s — это call.',
  },

  {
    id: 'sb_qq_river_overbet_100bb',
    title: 'SB QQ river overbet 99% — GTO 23%',
    tags: ['postflop', 'river', 'sb', 'sizing_error'],
    blinds: '25/50 (8)',
    level: 'MTT',
    hero: { pos: 'SB', cards: 'Q♥Q♠', stackBB: 66 },
    players: { CO: 66, BTN: 66, SB: 66, BB: 66 },
    action: [
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BB', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'raise', size: 2.5 },
      { street: 'preflop', actor: 'SB', action: 'raise', size: 10 },
      { street: 'preflop', actor: 'BTN', action: 'call' },
      { street: 'flop', board: 'Q♦6♠4♠', pot: 14.1 },
      { street: 'flop', actor: 'SB', action: 'check' },
      { street: 'flop', actor: 'BTN', action: 'check' },
      { street: 'turn', board: '9♠', pot: 14.1 },
      { street: 'turn', actor: 'SB', action: 'bet', size: 7 },
      { street: 'turn', actor: 'BTN', action: 'call' },
      { street: 'river', board: '9♦', pot: 28.2 },
      { street: 'river', actor: 'SB', action: 'bet', size: 28, mistake: true, gto: 'bet_small' },
    ],
    verdict: 'Mistake',
    evLoss: 1.17,
    explanation:
      'River double-paired (9♠9♦) убивает вэлью оверберта. QQ = 3-й nuts, но 99 и 66 тебя бьют. BTN коллирует small с pair, овербет выгоняет весь вэлью range кроме AA/KK/QQ-blockers.',
    lesson: 'River на paired-paired борде: thin value size (20-30% pot). Overbet только на nuts или чистый bluff.',
  },

  {
    id: 'bb_jt_call_btn_jam_54bb',
    title: 'BB JTo — call BTN 10bb jam (deep stack)',
    tags: ['preflop', 'facing_jam', 'bb', 'defend_short'],
    blinds: '600/1200 (150)',
    level: 'MTT',
    hero: { pos: 'BB', cards: 'J♣T♣', stackBB: 53.9 },
    players: { LJ: 32.2, HJ: 39.2, CO: 17.1, BTN: 10.1, SB: 17.8, BB: 53.9 },
    action: [
      { street: 'preflop', actor: 'LJ', action: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'fold' },
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'all_in', size: 10.1 },
      { street: 'preflop', actor: 'SB', action: 'fold' },
      { street: 'preflop', actor: 'BB', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 0.76,
    explanation:
      'BTN 10bb jam range = ~50% рук (Q5s+, 22+, Ax, Kx, some connectors). JTo имеет ~42% equity vs этот range. Шансы банка 2.2:1 → break-even на 31%. Call = +0.76bb EV.',
    lesson: 'Covered BB vs BTN jam ~10bb: call всеми broadway, A+, K+, 22+, JTo/JT9/T9s connectors.',
  },

  {
    id: 'bb_qt_call_btn_jam_60bb',
    title: 'BB QTo — call BTN 10bb jam',
    tags: ['preflop', 'facing_jam', 'bb', 'defend_short'],
    blinds: '600/1200 (150)',
    level: 'MTT',
    hero: { pos: 'BB', cards: 'Q♠T♥', stackBB: 60.2 },
    players: { LJ: 27.4, HJ: 64.2, CO: 3.77, BTN: 9.98, SB: 10.4, BB: 60.2 },
    action: [
      { street: 'preflop', actor: 'LJ', action: 'fold' },
      { street: 'preflop', actor: 'HJ', action: 'fold' },
      { street: 'preflop', actor: 'CO', action: 'fold' },
      { street: 'preflop', actor: 'BTN', action: 'all_in', size: 9.98 },
      { street: 'preflop', actor: 'SB', action: 'fold' },
      { street: 'preflop', actor: 'BB', action: 'fold', mistake: true, gto: 'call' },
    ],
    verdict: 'Mistake',
    evLoss: 1.05,
    explanation:
      'Ещё один BB overfold vs BTN 10bb jam. QTo ещё сильнее чем JTo: Q-blocker, T-blocker, пара Q+ с любой масти. Call = +1.05bb EV.',
    lesson: 'ПОВТОРЕНИЕ: BB vs BTN 10bb jam — QTo, JTo, KXo, AXo все call. Даже Q8o, J8s call.',
  },
];

// ═══ Bot training dataset: aggregated corrections for AI to learn from ═══
// Used by adaptiveAI to adjust bot ranges based on real GTO solutions
export const BOT_GTO_CORRECTIONS = {
  // BB defense vs short jams — systematic correction
  bb_vs_jam_6_10bb: {
    call: 'J2s+, T3s+, 93s+, 82s+, 72s+, 63s+, 53s+, 22+, A2o+, K4o+, Q7o+, J8o+, T8o+, 98o, any_suited_connector',
    evLossIfFold: 0.5,
  },
  bb_vs_jam_4_5bb: {
    call: 'any_two_cards_with_high_card_8_or_better', // ~85% of hands
    evLossIfFold: 0.7,
  },
  sb_jam_10bb_vs_short_bb: {
    jam: '22+, A2+, K2+, Q2+, J2+, T2+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+', // jam ~70% of hands
    evLossIfFold: 0.6,
  },
  // Small pairs early position — fold not raise
  small_pair_early_mtt: {
    positions: ['UTG', 'UTG1', 'LJ'],
    stackRange: [18, 35],
    fold: ['22', '33', '44'],
    evLossIfRaise: 0.07,
  },
  // BTN vs UTG open — flat wider
  btn_vs_early_open_call: {
    call: 'ATo, AJo, KJo, KQo, A9s, KJs, QJs, JTs, T9s, 98s, 87s, 76s, 22+',
    evLossIfFold: 0.13,
  },
  // Big pair river overbet on paired-paired
  river_overbet_paired_board: {
    rule: 'On double-paired river, size down to 25-35% pot even with nuts',
    evLossIfOverbet: 1.17,
  },
};

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
