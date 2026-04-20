// NewBadge.jsx — Animated NEW badge for features/drills
import React from 'react';

export default function NewBadge({ size = 'md', variant = 'pulse' }) {
  const sizes = { sm: { fs: 8, px: 5, py: 2 }, md: { fs: 9, px: 8, py: 3 }, lg: { fs: 11, px: 10, py: 4 } };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      position: 'absolute', top: '-6px', right: '-6px', zIndex: 10,
      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      color: '#fff', fontWeight: 800, letterSpacing: '0.5px',
      fontSize: `${s.fs}px`, padding: `${s.py}px ${s.px}px`,
      borderRadius: '10px', lineHeight: 1, textTransform: 'uppercase',
      boxShadow: '0 2px 8px rgba(231,76,60,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
      userSelect: 'none', pointerEvents: 'none',
      animation: variant === 'pulse' ? 'badgePulse 2s infinite ease-in-out'
        : variant === 'shimmer' ? 'badgePulse 2s infinite ease-in-out' : 'none',
      overflow: 'hidden',
    }}>
      NEW
      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(231,76,60,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 4px 16px rgba(231,76,60,0.6); }
        }
      `}</style>
    </span>
  );
}
