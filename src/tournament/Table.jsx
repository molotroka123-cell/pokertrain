// Table.jsx — Main table UI with 9-max seating
import React from 'react';
import Card from '../components/Card.jsx';

// 9-max seat positions (mobile-first layout, relative %)
const SEAT_POSITIONS = [
  { left: '50%', top: '85%' },   // 0: Hero (bottom center)
  { left: '15%', top: '72%' },   // 1: left bottom
  { left: '5%',  top: '48%' },   // 2: left mid
  { left: '15%', top: '24%' },   // 3: left top
  { left: '35%', top: '8%' },    // 4: top left
  { left: '65%', top: '8%' },    // 5: top right
  { left: '85%', top: '24%' },   // 6: right top
  { left: '95%', top: '48%' },   // 7: right mid
  { left: '85%', top: '72%' },   // 8: right bottom
];

const styles = {
  tableArea: {
    position: 'relative',
    width: '100%',
    maxWidth: '500px',
    height: '360px',
    margin: '0 auto',
  },
  felt: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: '80%',
    height: '65%',
    background: 'radial-gradient(ellipse, #1a5c3a 0%, #0d3d24 70%, #0a2d1a 100%)',
    borderRadius: '120px',
    border: '4px solid #2a7a4a',
    boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
  },
  potArea: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  potLabel: {
    fontSize: '11px',
    color: '#8ca88c',
    letterSpacing: '1px',
  },
  potAmount: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffd700',
  },
  community: {
    position: 'absolute',
    top: '55%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    gap: '4px',
  },
  seat: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '68px',
  },
  seatName: {
    fontSize: '10px',
    color: '#a0b0c0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '68px',
  },
  seatChips: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#ffd700',
  },
  seatCards: {
    display: 'flex',
    justifyContent: 'center',
    margin: '2px 0',
  },
  seatBet: {
    fontSize: '10px',
    color: '#4caf50',
    fontWeight: 600,
  },
  heroGlow: {
    boxShadow: '0 0 12px rgba(255, 215, 0, 0.3)',
    borderRadius: '8px',
    padding: '4px',
    background: 'rgba(255, 215, 0, 0.05)',
  },
  dealerChip: {
    position: 'absolute',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#ffd700',
    color: '#000',
    fontSize: '10px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  positionLabel: {
    fontSize: '9px',
    color: '#6b8fa3',
    fontWeight: 600,
  },
  eliminated: {
    opacity: 0.3,
  },
};

const POSITION_NAMES_9 = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN'];

function formatChips(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function Table({
  players = [],
  community = [],
  pot = 0,
  dealer = 0,
  heroCards = [],
  heroIndex = 0,
  bets = {},
  stage = '',
}) {
  // Reorder so hero is at seat 0
  const reordered = [];
  for (let i = 0; i < players.length; i++) {
    const idx = (heroIndex + i) % players.length;
    reordered.push(players[idx]);
  }

  // Position labels relative to dealer
  const getPosition = (seatIdx) => {
    const numPlayers = players.length;
    const dealerRelative = (seatIdx - dealer + numPlayers) % numPlayers;
    if (numPlayers <= 3) return ['BTN', 'SB', 'BB'][dealerRelative] || '';
    if (dealerRelative === 0) return 'BTN';
    if (dealerRelative === 1) return 'SB';
    if (dealerRelative === 2) return 'BB';
    const remaining = numPlayers - 3;
    const pos = dealerRelative - 3;
    if (pos === 0) return 'UTG';
    if (pos === remaining - 1) return 'CO';
    if (pos === remaining - 2 && remaining > 2) return 'HJ';
    if (pos === 1 && remaining > 3) return 'UTG+1';
    return 'MP';
  };

  return (
    <div style={styles.tableArea}>
      <div style={styles.felt}>
        {/* Pot */}
        {pot > 0 && (
          <div style={styles.potArea}>
            <div style={styles.potLabel}>POT</div>
            <div style={styles.potAmount}>{formatChips(pot)}</div>
          </div>
        )}
        {/* Community cards */}
        {community.length > 0 && (
          <div style={styles.community}>
            {community.map((c, i) => (
              <Card key={i} card={c} mini delay={i * 150} />
            ))}
          </div>
        )}
      </div>

      {/* Seats */}
      {reordered.map((player, i) => {
        if (!player || player.eliminated) return null;
        const pos = SEAT_POSITIONS[i % SEAT_POSITIONS.length];
        const isHero = i === 0;
        const isDealer = (heroIndex + i) % players.length === dealer;
        const bet = bets[player.id] || 0;
        const realIdx = (heroIndex + i) % players.length;
        const posLabel = getPosition(realIdx);

        return (
          <div
            key={player.id}
            style={{
              ...styles.seat,
              left: pos.left,
              top: pos.top,
              ...(isHero ? styles.heroGlow : {}),
            }}
          >
            <div style={styles.positionLabel}>{posLabel}</div>
            <div style={styles.seatName}>
              {player.emoji || ''} {player.name}
            </div>
            <div style={styles.seatCards}>
              {isHero && heroCards.length > 0 ? (
                heroCards.map((c, ci) => <Card key={ci} card={c} mini delay={ci * 200} />)
              ) : !isHero ? (
                <>
                  <Card card="Xx" faceDown mini />
                  <Card card="Xx" faceDown mini />
                </>
              ) : null}
            </div>
            <div style={styles.seatChips}>{formatChips(player.chips)}</div>
            {bet > 0 && <div style={styles.seatBet}>{formatChips(bet)}</div>}
            {isDealer && (
              <div style={{ ...styles.dealerChip, position: 'absolute', top: '-5px', right: '-5px' }}>D</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
