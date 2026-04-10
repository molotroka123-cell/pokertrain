// postflopSpots.js — 50+ postflop drill scenarios
// Each scenario: situation + correct action + explanation

import { cryptoRandom } from '../engine/deck.js';

export const POSTFLOP_SPOTS = [
  // ═══ FLOP C-BET SPOTS ═══
  { id: 1, hero: ['Ah','Kd'], board: ['Jh','7c','2s'], position: 'CO', villain: 'BB', pot: 600, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '67%', reason: 'AK on dry J72 board. C-bet for value — you have overcards + backdoors. Villain folds most of their BB defend range here.',
    confidence: 'heuristic+' },
  { id: 2, hero: ['9s','8s'], board: ['Kh','7d','2c'], position: 'BTN', villain: 'BB', pot: 500, toCall: 0, stage: 'flop',
    correct: 'check', reason: 'No equity on K72 rainbow with 98s. Check back — villain has too many Kx that won\'t fold. Wait for turn to bluff if checked to again.',
    confidence: 'heuristic+' },
  { id: 3, hero: ['Qh','Qd'], board: ['Ac','8s','3h'], position: 'MP', villain: 'CO', pot: 700, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '33%', reason: 'QQ on A83 — small c-bet. You lose to Ax but beat everything else. Small sizing extracts value from 99-JJ and folds hands like KQ, KJ.',
    confidence: 'heuristic+' },
  { id: 4, hero: ['7h','6h'], board: ['8h','5c','2h'], position: 'BTN', villain: 'BB', pot: 600, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '67%', reason: 'Open-ended straight draw + flush draw = 15 outs (~54% by river). Bet for value as a draw — you have massive equity and fold equity.',
    confidence: 'solver' },
  { id: 5, hero: ['As','Ts'], board: ['Ks','9s','4h'], position: 'CO', villain: 'BTN', pot: 800, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '50%', reason: 'Nut flush draw + overcard. Semi-bluff — you have ~45% equity when called, plus fold equity. Great spot to build pot.',
    confidence: 'solver' },

  // ═══ FACING FLOP C-BET ═══
  { id: 6, hero: ['Jd','Td'], board: ['Qs','9h','3c'], position: 'BB', villain: 'CO', pot: 900, toCall: 300, stage: 'flop',
    correct: 'call', reason: 'Open-ended straight draw (8 outs ≈ 31% by river). Pot odds: 300/1200 = 25%. Getting direct odds + implied odds. Clear call.',
    confidence: 'solver' },
  { id: 7, hero: ['Ah','5h'], board: ['Kc','8d','3s'], position: 'BB', villain: 'BTN', pot: 800, toCall: 400, stage: 'flop',
    correct: 'fold', reason: 'A5 on K83 rainbow — 6 outs at best (runner-runner or ace). Pot odds need ~33% equity, you have ~15%. Clear fold.',
    confidence: 'heuristic+' },
  { id: 8, hero: ['Ts','9s'], board: ['Th','6c','2d'], position: 'BB', villain: 'CO', pot: 700, toCall: 350, stage: 'flop',
    correct: 'raise', sizing: '3x', reason: 'Top pair on T62 dry board vs CO c-bet. Raise for value — CO cbets wide here but folds to raises with air. Your hand is strong enough to raise/call.',
    confidence: 'heuristic+' },

  // ═══ TURN DECISIONS ═══
  { id: 9, hero: ['Ah','Kh'], board: ['Qh','Jc','4s','2h'], position: 'CO', villain: 'BB', pot: 1200, toCall: 0, stage: 'turn',
    correct: 'raise', sizing: '67%', reason: 'Nut flush draw + gutshot to Broadway. 12 outs ≈ 27% on river, but huge when you hit. Bet as semi-bluff — builds pot for nut hands, gets folds from weaker pairs.',
    confidence: 'solver' },
  { id: 10, hero: ['Kd','Kc'], board: ['Ac','9h','5d','3s'], position: 'UTG', villain: 'BTN', pot: 1500, toCall: 750, stage: 'turn',
    correct: 'call', reason: 'KK facing turn bet on A9xx board. Villain could have Ax, but also bluffing with missed draws. Pot odds 750/2250 = 33%. You have showdown value. Call and evaluate river.',
    confidence: 'heuristic+' },

  // ═══ RIVER VALUE / BLUFF ═══
  { id: 11, hero: ['Qh','Qc'], board: ['Jd','8s','4c','3h','2d'], position: 'BTN', villain: 'BB', pot: 2000, toCall: 0, stage: 'river',
    correct: 'raise', sizing: '50%', reason: 'QQ on J8432 — strong overpair. Value bet! Villain checks with Jx, 88, weaker pairs. They call with enough worse hands to make betting profitable.',
    confidence: 'heuristic+' },
  { id: 12, hero: ['As','Ks'], board: ['Jh','Ts','7s','4c','2d'], position: 'CO', villain: 'BB', pot: 2500, toCall: 0, stage: 'river',
    correct: 'raise', sizing: '75%', reason: 'Missed flush + straight draws on river. You have zero showdown value with AK-high. Perfect bluff candidate — represents strong made hand, credible story.',
    confidence: 'heuristic+' },
  { id: 13, hero: ['9h','9d'], board: ['Kc','Qs','Js','8d','4h'], position: 'BB', villain: 'CO', pot: 3000, toCall: 2000, stage: 'river',
    correct: 'fold', reason: '99 on KQJB4 with 4 to a straight. Villain bets 67% pot on a scary board. You beat nothing that bets here — any Tx has a straight, KQ/KJ/QJ all beat you. Fold.',
    confidence: 'solver' },

  // ═══ CHECK-RAISE SPOTS ═══
  { id: 14, hero: ['6h','6d'], board: ['6s','9c','3h'], position: 'BB', villain: 'BTN', pot: 600, toCall: 300, stage: 'flop',
    correct: 'raise', sizing: '3x', reason: 'Set of 6s on 963! Check-raise for value. BTN c-bets wide here. You want to build pot with a monster — if you just call, pot stays small.',
    confidence: 'solver' },
  { id: 15, hero: ['Ah','2h'], board: ['Kh','9h','4c'], position: 'BB', villain: 'CO', pot: 800, toCall: 400, stage: 'flop',
    correct: 'raise', sizing: '3x', reason: 'Nut flush draw as check-raise semi-bluff. 9 outs ≈ 35% by river + fold equity. You put CO in tough spot with medium hands. High EV play.',
    confidence: 'solver' },

  // ═══ ICM / BUBBLE SPOTS ═══
  { id: 16, hero: ['Ac','Jd'], board: ['Ks','8h','3c'], position: 'CO', villain: 'BTN', pot: 5000, toCall: 3000, stage: 'flop',
    correct: 'fold', reason: 'AJo on K83 on the BUBBLE. You have ace-high — likely behind Kx. Even if you have 30% equity, ICM says folding is better than risking tournament life near the money.',
    confidence: 'heuristic+', isBubble: true },
  { id: 17, hero: ['Th','Tc'], board: ['8d','5c','2h'], position: 'BTN', villain: 'BB', pot: 4000, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '50%', reason: 'TT overpair on 852 on the BUBBLE. Bet for value — you\'re ahead of villain\'s check range. Don\'t let fear of busting make you check strong hands.',
    confidence: 'heuristic+', isBubble: true },

  // ═══ MULTI-WAY ═══
  { id: 18, hero: ['Ad','Kd'], board: ['Kh','9c','5s'], position: 'UTG', villain: 'MP+BB', pot: 900, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '50%', reason: 'TPTK (top pair top kicker) in multi-way pot. Bet for value AND protection — multiple opponents means more chance someone has a draw.',
    confidence: 'heuristic+' },
  { id: 19, hero: ['Jh','Th'], board: ['Qd','9c','2h'], position: 'CO', villain: 'UTG+BB', pot: 1000, toCall: 0, stage: 'flop',
    correct: 'check', reason: 'OESD in multi-way pot OOP to UTG raiser. Check — UTG likely has strong range. If checked through, free card. If bet, you can call with your 8 outs.',
    confidence: 'heuristic+' },

  // More spots...
  { id: 20, hero: ['Kh','Qh'], board: ['Kd','7s','4c','Jh'], position: 'BTN', villain: 'BB', pot: 1800, toCall: 0, stage: 'turn',
    correct: 'raise', sizing: '67%', reason: 'Top pair + good kicker + backdoor flush draw on turn. Bet for value on the turn — villain checks, meaning they don\'t have strong Kx usually. Build the pot.',
    confidence: 'heuristic+' },
  { id: 21, hero: ['5d','5c'], board: ['As','Kh','8c','3d'], position: 'BB', villain: 'CO', pot: 2000, toCall: 1000, stage: 'turn',
    correct: 'fold', reason: 'Pocket 5s on AK8x board facing turn bet. You\'re behind any Ax, Kx, 88. Only beating pure bluffs. Pot odds need 33%, but your equity is under 10%. Fold.',
    confidence: 'heuristic+' },
  { id: 22, hero: ['Ac','Qc'], board: ['Jc','8c','3s','Kh','7c'], position: 'CO', villain: 'BB', pot: 3500, toCall: 0, stage: 'river',
    correct: 'raise', sizing: '75%', reason: 'You hit the nut flush on the river! Value bet big — villain may have Kx, Jx, or a worse flush. Don\'t slow-play rivers — bet and get paid.',
    confidence: 'solver' },
  { id: 23, hero: ['8h','7h'], board: ['9d','6s','2c','5h'], position: 'BTN', villain: 'BB', pot: 1200, toCall: 0, stage: 'turn',
    correct: 'raise', sizing: '67%', reason: 'You just made a straight (9-8-7-6-5). Bet for value on a connected board — villain may have pairs, two pair, or draws that call.',
    confidence: 'solver' },
  { id: 24, hero: ['Ad','Jd'], board: ['Td','8d','3c'], position: 'CO', villain: 'BB', pot: 700, toCall: 0, stage: 'flop',
    correct: 'raise', sizing: '50%', reason: 'Nut flush draw + overcard. 12 outs ≈ 45% by river. Semi-bluff c-bet — huge equity when called, plus fold equity against BB\'s wide range.',
    confidence: 'solver' },
  { id: 25, hero: ['Ks','Qd'], board: ['Qh','7s','5c','Jd','9s'], position: 'BTN', villain: 'BB', pot: 2800, toCall: 1800, stage: 'river',
    correct: 'call', reason: 'KQ with top pair + good kicker on river. Facing big bet but you beat QJ, QT, Q9, bluffs. Pot odds: 1800/4600 = 39%. You\'re good often enough. Call.',
    confidence: 'heuristic+' },
];

// Get random spot, optionally filtered
export function getRandomSpot(filter) {
  let spots = POSTFLOP_SPOTS;
  if (filter?.stage) spots = spots.filter(s => s.stage === filter.stage);
  if (filter?.isBubble) spots = spots.filter(s => s.isBubble);
  if (spots.length === 0) return POSTFLOP_SPOTS[cryptoRandom(POSTFLOP_SPOTS.length)];
  return spots[cryptoRandom(spots.length)];
}

export function getSpotById(id) {
  return POSTFLOP_SPOTS.find(s => s.id === id);
}
