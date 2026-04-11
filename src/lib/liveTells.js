// liveTells.js — Live poker tell hints during play
// Shows text-based tell hints 30% of the time when facing a bet

const TELLS = {
  strong: [
    'Opponent glances at chips after seeing flop',
    'Opponent sits up straight suddenly',
    'Opponent stares at you (intimidation = usually strong)',
    'Opponent cuts chips ready to call before you act',
    'Opponent speaks confidently about the hand',
    'Opponent\'s hand is steady and relaxed',
  ],
  weak: [
    'Opponent looks away, disinterested',
    'Opponent checks cards again nervously',
    'Opponent shuffles chips anxiously',
    'Opponent takes extra time (tank = usually weak)',
    'Opponent\'s breathing changes slightly',
  ],
  bluff: [
    'Opponent bets and immediately looks away',
    'Opponent holds breath during big bet',
    'Opponent\'s voice pitch changes when announcing bet',
    'Opponent places chips aggressively (overcompensation)',
    'Opponent avoids eye contact after betting',
  ],
  draw: [
    'Opponent snap-calls (usually drawing, would raise with made hand)',
    'Opponent glances at remaining chips (calculating implied odds)',
    'Opponent seems relaxed despite big pot (has outs)',
  ],
};

export function getLiveTell(villainHandStrength, villainAction) {
  if (Math.random() > 0.30) return null; // Only show 30% of the time

  let category;
  if (villainHandStrength > 0.65) category = 'strong';
  else if (villainHandStrength > 0.40) category = Math.random() > 0.5 ? 'strong' : 'weak'; // Ambiguous
  else if (villainHandStrength > 0.25) category = 'draw';
  else category = villainAction === 'raise' ? 'bluff' : 'weak';

  // 20% chance of reverse tell (makes it realistic — tells aren't always reliable)
  if (Math.random() < 0.20) {
    category = category === 'strong' ? 'weak' : category === 'weak' ? 'strong' : category;
  }

  const pool = TELLS[category] || TELLS.weak;
  return { text: pool[Math.floor(Math.random() * pool.length)], reliability: category === 'bluff' ? 'low' : 'medium' };
}
