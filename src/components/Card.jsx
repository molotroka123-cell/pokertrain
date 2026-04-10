// Card.jsx — Cinematic card with deal animation + hand-strength glow
import React, { useState, useEffect } from 'react';

const SUIT_SYM = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
const RANK_DISP = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

export default function Card({ card, faceDown = false, mini = false, delay = 0, glow = false, hero = false }) {
  const [phase, setPhase] = useState('hidden');

  useEffect(() => {
    setPhase('hidden');
    const t1 = setTimeout(() => setPhase('dealing'), delay + 50);
    const t2 = setTimeout(() => setPhase('revealed'), delay + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, card]);

  const w = hero ? 70 : mini ? 36 : 54;
  const h = hero ? 100 : mini ? 52 : 76;

  // Face-down
  if (!card || card === 'Xx') {
    return (
      <div style={{
        width: w, height: h, borderRadius: mini ? 5 : 8, margin: '0 2px',
        background: 'linear-gradient(150deg, #1a3a6c 0%, #0e2040 50%, #0a1830 100%)',
        border: '1.5px solid #2a5090',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 'hidden' ? 0 : 1,
        transform: phase === 'hidden' ? 'translateY(-25px) scale(0.6)' : 'none',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          width: '50%', height: '60%', borderRadius: 3, opacity: 0.15,
          border: '1px solid #4070b0',
          background: 'repeating-linear-gradient(45deg, #3060a020, #3060a020 2px, transparent 2px, transparent 5px), repeating-linear-gradient(-45deg, #3060a020, #3060a020 2px, transparent 2px, transparent 5px)',
        }} />
      </div>
    );
  }

  const rank = card[0], suit = card[1];
  const isRed = suit === 'h' || suit === 'd';
  const suitClr = isRed ? '#dc3545' : '#1a1a2e';
  const sym = SUIT_SYM[suit] || '';
  const disp = RANK_DISP[rank] || rank;

  let transform = 'none', opacity = 1, filter = 'none';
  if (phase === 'hidden') { transform = 'translateY(-50px) rotate(-12deg) scale(0.3)'; opacity = 0; filter = 'blur(3px)'; }
  else if (phase === 'dealing') { transform = 'translateY(-3px) rotate(1deg) scale(1.04)'; opacity = 0.95; }

  // Glow shadow
  let glowShadow = '0 4px 14px rgba(0,0,0,0.5)';
  if (glow || hero) {
    glowShadow = `0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1), 0 6px 20px rgba(0,0,0,0.5)`;
  }

  return (
    <div style={{
      width: w, height: h, margin: '0 2px', perspective: 800, display: 'inline-block',
    }}>
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `${transform} ${faceDown ? '' : 'rotateY(180deg)'}`,
        opacity, filter,
        transition: phase === 'hidden' ? 'none' : 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Back */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 5 : 8,
          background: 'linear-gradient(150deg, #1e4080, #0e2850)',
          border: '1.5px solid #3060a0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '55%', height: '65%', borderRadius: 4, opacity: 0.12,
            border: '1.5px solid #4070b0',
            background: 'repeating-linear-gradient(45deg, #3060a020, #3060a020 2px, transparent 2px, transparent 5px), repeating-linear-gradient(-45deg, #3060a020, #3060a020 2px, transparent 2px, transparent 5px)',
          }} />
        </div>

        {/* Front */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', borderRadius: mini ? 5 : 8,
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(170deg, #ffffff 0%, #f4f4f4 40%, #eaeaea 100%)',
          border: `1.5px solid ${isRed ? 'rgba(220,53,69,0.2)' : 'rgba(100,120,140,0.2)'}`,
          boxShadow: glowShadow,
          overflow: 'hidden',
        }}>
          {/* Glossy highlight */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '45%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%)',
            borderRadius: `${mini ? 5 : 8}px ${mini ? 5 : 8}px 0 0`,
          }} />

          {/* Top-left rank+suit */}
          <div style={{ position: 'absolute', top: mini ? 3 : 5, left: mini ? 4 : 6, lineHeight: 1, color: suitClr }}>
            <div style={{ fontSize: hero ? 16 : mini ? 11 : 14, fontWeight: 900 }}>{disp}</div>
            <div style={{ fontSize: hero ? 14 : mini ? 9 : 12, marginTop: -1 }}>{sym}</div>
          </div>

          {/* Center suit */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontSize: hero ? 36 : mini ? 20 : 30, color: suitClr, opacity: 0.85,
          }}>{sym}</div>

          {/* Bottom-right */}
          <div style={{ position: 'absolute', bottom: mini ? 3 : 5, right: mini ? 4 : 6, lineHeight: 1, color: suitClr, transform: 'rotate(180deg)' }}>
            <div style={{ fontSize: hero ? 16 : mini ? 11 : 14, fontWeight: 900 }}>{disp}</div>
            <div style={{ fontSize: hero ? 14 : mini ? 9 : 12, marginTop: -1 }}>{sym}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
