// Card.jsx — CSS 3D flip card component
import React, { useState, useEffect } from 'react';

const SUIT_SYMBOLS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
const SUIT_COLORS = { s: '#e0e0e0', h: '#e74c3c', d: '#e74c3c', c: '#e0e0e0' };
const RANK_DISPLAY = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

const styles = {
  wrapper: {
    perspective: '600px',
    display: 'inline-block',
    width: '48px',
    height: '68px',
    margin: '0 3px',
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.4s ease',
  },
  flipped: {
    transform: 'rotateY(180deg)',
  },
  face: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    border: '1px solid #2a3a4a',
  },
  front: {
    background: '#f5f5f5',
    transform: 'rotateY(180deg)',
  },
  back: {
    background: 'linear-gradient(135deg, #1a3a5c, #0d2240)',
    border: '2px solid #2a5a8a',
  },
  backPattern: {
    fontSize: '20px',
    color: '#2a5a8a',
  },
  rank: {
    fontSize: '18px',
    fontWeight: 800,
    lineHeight: 1,
  },
  suit: {
    fontSize: '16px',
    lineHeight: 1,
    marginTop: '2px',
  },
  mini: {
    width: '36px',
    height: '52px',
  },
  miniRank: {
    fontSize: '14px',
  },
  miniSuit: {
    fontSize: '12px',
  },
};

export default function Card({ card, faceDown = false, mini = false, delay = 0 }) {
  const [revealed, setRevealed] = useState(!faceDown);

  useEffect(() => {
    if (!faceDown) {
      const timer = setTimeout(() => setRevealed(true), delay);
      return () => clearTimeout(timer);
    } else {
      setRevealed(false);
    }
  }, [faceDown, delay]);

  if (!card) return null;

  const rank = card[0];
  const suit = card[1];
  const color = SUIT_COLORS[suit] || '#e0e0e0';
  const suitSym = SUIT_SYMBOLS[suit] || '';
  const rankDisp = RANK_DISPLAY[rank] || rank;

  const wrapperStyle = { ...styles.wrapper, ...(mini ? styles.mini : {}) };

  return (
    <div style={wrapperStyle}>
      <div style={{ ...styles.card, ...(revealed ? styles.flipped : {}) }}>
        {/* Back */}
        <div style={{ ...styles.face, ...styles.back }}>
          <span style={styles.backPattern}>♠</span>
        </div>
        {/* Front */}
        <div style={{ ...styles.face, ...styles.front, color }}>
          <span style={mini ? styles.miniRank : styles.rank}>{rankDisp}</span>
          <span style={mini ? styles.miniSuit : styles.suit}>{suitSym}</span>
        </div>
      </div>
    </div>
  );
}
