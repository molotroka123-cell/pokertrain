// Card.jsx — Premium card with 3D flip + deal animation
import React, { useState, useEffect } from 'react';

const SUIT_SYM = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
const SUIT_CLR = { s: '#c8d6e5', h: '#ff6b6b', d: '#48dbfb', c: '#c8d6e5' };
const SUIT_BG = { s: '#1a1d23', h: '#2a1520', d: '#15202a', c: '#1a1d23' };
const RANK_DISP = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

export default function Card({ card, faceDown = false, mini = false, delay = 0, glow = false }) {
  const [visible, setVisible] = useState(false);
  const [flipped, setFlipped] = useState(faceDown);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setFlipped(faceDown), delay + 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [faceDown, delay]);

  if (!card || card === 'Xx') {
    // Face-down card
    const w = mini ? 34 : 52;
    const h = mini ? 48 : 74;
    return (
      <div style={{
        width: w, height: h, borderRadius: mini ? 4 : 6, margin: '0 2px',
        background: 'linear-gradient(145deg, #1a3a6c, #0d2240)',
        border: '1.5px solid #2a5a9a',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.8)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: '60%', height: '70%', borderRadius: 3,
          border: '1px solid #3a6aaa', opacity: 0.4,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, #2a5a8a22 3px, #2a5a8a22 6px)',
        }} />
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const color = SUIT_CLR[suit] || '#ccc';
  const bg = SUIT_BG[suit] || '#1a1d23';
  const sym = SUIT_SYM[suit] || '';
  const disp = RANK_DISP[rank] || rank;
  const isRed = suit === 'h' || suit === 'd';

  const w = mini ? 34 : 52;
  const h = mini ? 48 : 74;

  return (
    <div style={{
      perspective: 600, display: 'inline-block', margin: '0 2px',
      width: w, height: h,
    }}>
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: visible ? 1 : 0,
        filter: visible ? 'none' : 'blur(4px)',
      }}>
        {/* Back */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 4 : 6,
          background: 'linear-gradient(145deg, #1a3a6c, #0d2240)',
          border: '1.5px solid #2a5a9a',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '60%', height: '70%', borderRadius: 3,
            border: '1px solid #3a6aaa', opacity: 0.4,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, #2a5a8a22 3px, #2a5a8a22 6px)',
          }} />
        </div>
        {/* Front */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 4 : 6,
          transform: 'rotateY(180deg)',
          background: `linear-gradient(160deg, #f8f9fa 0%, #e9ecef 100%)`,
          border: `1.5px solid ${isRed ? '#ffaaaa55' : '#aaaacc55'}`,
          boxShadow: glow
            ? `0 0 16px ${isRed ? 'rgba(255,100,100,0.4)' : 'rgba(100,150,255,0.4)'}, 0 2px 8px rgba(0,0,0,0.3)`
            : '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color,
          overflow: 'hidden',
        }}>
          {/* Top-left rank+suit */}
          <div style={{
            position: 'absolute', top: mini ? 2 : 4, left: mini ? 3 : 5,
            fontSize: mini ? 9 : 11, fontWeight: 800, lineHeight: 1, color: isRed ? '#c0392b' : '#2c3e50',
          }}>
            <div>{disp}</div>
            <div style={{ fontSize: mini ? 8 : 10 }}>{sym}</div>
          </div>
          {/* Center suit */}
          <div style={{
            fontSize: mini ? 18 : 28, color: isRed ? '#e74c3c' : '#34495e',
            textShadow: isRed ? '0 0 8px rgba(231,76,60,0.3)' : '0 0 8px rgba(52,73,94,0.2)',
            marginTop: mini ? 4 : 0,
          }}>
            {sym}
          </div>
          {/* Bottom-right rank+suit */}
          <div style={{
            position: 'absolute', bottom: mini ? 2 : 4, right: mini ? 3 : 5,
            fontSize: mini ? 9 : 11, fontWeight: 800, lineHeight: 1, color: isRed ? '#c0392b' : '#2c3e50',
            transform: 'rotate(180deg)',
          }}>
            <div>{disp}</div>
            <div style={{ fontSize: mini ? 8 : 10 }}>{sym}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
