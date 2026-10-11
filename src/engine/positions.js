// Get position labels for N players relative to dealer
export function getPositions(numPlayers, dealerIdx) {
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

