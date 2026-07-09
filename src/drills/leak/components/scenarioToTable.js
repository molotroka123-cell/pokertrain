// scenarioToTable.js — adapter: leak-drill scenario → TableViewV2 props
// Maps a drill scenario (hero, villains, actions_before_hero, board, decision)
// onto the IceCrown Engine 2.0 cinematic table contract.

function splitCards(str) {
  if (!str || str.length < 4) return null;
  return [str.slice(0, 2), str.slice(2, 4)];
}

const ACTION_MAP = { raise: 'raise', limp: 'call', call: 'call', fold: 'fold', check: 'check', bet: 'bet', shove: 'all-in' };

export function scenarioToTableProps(scenario, visibleBoard, decision) {
  if (!scenario?.hero) return null;

  // Last action + committed bet per position from the preflop history
  const lastByPos = {};
  const betByPos = {};
  (scenario.actions_before_hero || []).forEach(a => {
    if (!a.position) return;
    lastByPos[a.position] = ACTION_MAP[a.action] || a.action;
    if (a.amount_bb != null) betByPos[a.position] = a.amount_bb;
    if (a.action === 'fold') delete betByPos[a.position];
  });

  const street = decision?.street || 'preflop';
  const preflop = street === 'preflop';

  const seats = [
    {
      id: 'hero',
      name: 'Hero',
      position: scenario.hero.position,
      stack: scenario.hero.stack_bb,
      cards: splitCards(scenario.hero.cards),
      isHero: true,
      isTurn: true,
      isDealer: scenario.hero.position === 'BTN',
      bet: preflop ? (betByPos[scenario.hero.position] || 0) : 0,
      folded: false,
    },
    ...(scenario.villains || []).map((v, i) => ({
      id: 'v' + i,
      name: v.note ? v.note.split(/[,(]/)[0].trim().slice(0, 10) : v.position,
      position: v.position,
      stack: v.stack_bb,
      cards: null,
      isHero: false,
      isDealer: v.position === 'BTN',
      lastAction: preflop ? (lastByPos[v.position] || null) : null,
      bet: preflop ? (betByPos[v.position] || 0) : 0,
      folded: lastByPos[v.position] === 'fold',
    })),
  ];

  const board = [
    ...(visibleBoard?.flop || []),
    ...(visibleBoard?.turn ? [visibleBoard.turn] : []),
    ...(visibleBoard?.river ? [visibleBoard.river] : []),
  ];

  return {
    seats,
    board,
    pot: decision?.pot_bb || 0,
    stage: street.toUpperCase(),
    heroSeatIdx: 0,
    showdown: false,
    blinds: null,
    message: null,
  };
}
