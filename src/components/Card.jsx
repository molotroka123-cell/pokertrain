// Card.jsx — Premium card: 3D flip + deal fly-in animation
import React, { useState, useEffect, useRef } from 'react';

const SUIT_SYM = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
const RANK_DISP = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

export default function Card({ card, faceDown = false, mini = false, delay = 0, glow = false, dealFrom = null }) {
  const [phase, setPhase] = useState('hidden'); // hidden → dealing → revealed
  const ref = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dealing'), delay);
    const t2 = setTimeout(() => setPhase('revealed'), delay + 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, card]);

  if (!card || card === 'Xx') {
    // Face-down card
    const w = mini ? 34 : 52;
    const h = mini ? 48 : 74;
    return (
      <div style={{
        width: w, height: h, borderRadius: mini ? 5 : 7, margin: '0 2px',
        background: 'linear-gradient(145deg, #1a3a6c, #0d2240)',
        border: '1.5px solid #2a5a9a',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'hidden' ? 0 : 1,
        transform: phase === 'hidden' ? 'translateY(-30px) rotate(-10deg) scale(0.5)' : 'translateY(0) rotate(0deg) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: '55%', height: '65%', borderRadius: 3,
          background: `
            repeating-linear-gradient(45deg, #2a5a8a15, #2a5a8a15 2px, transparent 2px, transparent 6px),
            repeating-linear-gradient(-45deg, #2a5a8a15, #2a5a8a15 2px, transparent 2px, transparent 6px)
          `,
          border: '1px solid #3a6aaa44',
        }} />
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const isRed = suit === 'h' || suit === 'd';
  const suitColor = isRed ? '#e74c3c' : '#2c3e50';
  const sym = SUIT_SYM[suit] || '';
  const disp = RANK_DISP[rank] || rank;

  const w = mini ? 34 : 52;
  const h = mini ? 48 : 74;

  // Deal animation transform
  let transform = 'translateY(0) rotate(0deg) scale(1)';
  let opacity = 1;
  let filter = 'none';

  if (phase === 'hidden') {
    transform = 'translateY(-60px) rotate(-15deg) scale(0.3)';
    opacity = 0;
    filter = 'blur(4px)';
  } else if (phase === 'dealing') {
    transform = 'translateY(-5px) rotate(2deg) scale(1.05)';
    opacity = 0.9;
  }

  return (
    <div ref={ref} style={{
      width: w, height: h, margin: '0 2px',
      perspective: '800px', display: 'inline-block',
    }}>
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `${transform} ${faceDown ? '' : 'rotateY(180deg)'}`,
        opacity, filter,
        transition: phase === 'hidden' ? 'none' : 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Back face */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 5 : 7,
          background: 'linear-gradient(145deg, #1e4080, #0e2850)',
          border: '1.5px solid #3060a0',
          boxShadow: '0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '60%', height: '70%', borderRadius: 4,
            background: `
              repeating-linear-gradient(45deg, #3060a015, #3060a015 2px, transparent 2px, transparent 5px),
              repeating-linear-gradient(-45deg, #3060a015, #3060a015 2px, transparent 2px, transparent 5px)
            `,
            border: '1.5px solid #4070b044',
          }} />
        </div>

        {/* Front face */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 5 : 7,
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(165deg, #ffffff 0%, #f0f0f0 50%, #e8e8e8 100%)',
          border: `1.5px solid ${isRed ? '#ff888844' : '#88aabb44'}`,
          boxShadow: glow
            ? `0 0 20px ${isRed ? 'rgba(231,76,60,0.35)' : 'rgba(52,152,219,0.3)'}, 0 4px 16px rgba(0,0,0,0.4)`
            : '0 3px 12px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}>
          {/* Subtle gradient overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.03) 100%)',
            borderRadius: mini ? 5 : 7,
          }} />

          {/* Top-left */}
          <div style={{
            position: 'absolute', top: mini ? 2 : 4, left: mini ? 3 : 5,
            lineHeight: 1, color: suitColor,
          }}>
            <div style={{ fontSize: mini ? 10 : 13, fontWeight: 900 }}>{disp}</div>
            <div style={{ fontSize: mini ? 8 : 11, marginTop: -1 }}>{sym}</div>
          </div>

          {/* Center suit — large */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: mini ? 20 : 30, color: suitColor,
            opacity: 0.9,
            textShadow: isRed ? '0 0 12px rgba(231,76,60,0.15)' : 'none',
          }}>
            {sym}
          </div>

          {/* Bottom-right (rotated) */}
          <div style={{
            position: 'absolute', bottom: mini ? 2 : 4, right: mini ? 3 : 5,
            lineHeight: 1, color: suitColor, transform: 'rotate(180deg)',
          }}>
            <div style={{ fontSize: mini ? 10 : 13, fontWeight: 900 }}>{disp}</div>
            <div style={{ fontSize: mini ? 8 : 11, marginTop: -1 }}>{sym}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
