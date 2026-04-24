// FeedbackPanel.jsx — Shows correct answer + explanation + GTO frequencies
import React from 'react';
import RangeGrid, { cardsToHand } from './RangeGrid.jsx';

const RATING_META = {
  perfect:    { label: '✓ Perfect',    color: '#27ae60', bg: 'rgba(39,174,96,0.10)' },
  acceptable: { label: '~ Acceptable', color: '#f39c12', bg: 'rgba(243,156,18,0.10)' },
  mistake:    { label: '✗ Mistake',    color: '#e74c3c', bg: 'rgba(231,76,60,0.10)' },
};

const ACTION_COLORS = {
  raise: '#27ae60', bet: '#e67e22', '3bet': '#8e44ad', '4bet': '#8e44ad', '5bet': '#8e44ad',
  call: '#3498db', check: '#8899aa', fold: '#e74c3c', shove: '#e74c3c', limp: '#f1c40f',
};

function FreqBar({ action, pct, isHero }) {
  const color = ACTION_COLORS[action] || '#7f8c8d';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <div style={{
        minWidth: 55, fontSize: 11, fontWeight: isHero ? 800 : 500,
        color: isHero ? color : '#8a9aaa', textTransform: 'uppercase',
      }}>
        {isHero ? '► ' : '  '}{action}
      </div>
      <div style={{ flex: 1, height: 8, background: 'rgba(10,20,30,0.6)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <div style={{ minWidth: 36, fontSize: 11, fontWeight: 700, color: '#c0d0e0', textAlign: 'right' }}>
        {pct}%
      </div>
    </div>
  );
}

export default function FeedbackPanel({ evaluation, userAction, onNext, isLast, scenario, decision }) {
  const meta = RATING_META[evaluation.rating] || RATING_META.mistake;
  const gtoAll = evaluation.gtoAll || {};
  const sorted = Object.entries(gtoAll)
    .filter(([, f]) => f > 0)
    .sort((a, b) => b[1] - a[1]);

  // Build a minimal RangeGrid that highlights the hero's hand position
  // with the GTO primary action color for this decision
  const heroHand = scenario?.hero?.cards ? cardsToHand(scenario.hero.cards) : null;
  const showGrid = decision?.street === 'preflop' && heroHand && gtoAll && Object.keys(gtoAll).length > 0;
  const heroRangeEntry = showGrid ? { [heroHand]: { ...gtoAll } } : null;

  return (
    <div style={{
      marginTop: 10, padding: 14, borderRadius: 12,
      background: meta.bg, border: `1px solid ${meta.color}40`,
    }}>
      <div style={{
        fontSize: 18, fontWeight: 800, color: meta.color, marginBottom: 6, letterSpacing: 0.5,
      }}>
        {meta.label}
      </div>

      <div style={{ fontSize: 12, color: '#c0d0e0', marginBottom: 8 }}>
        You chose <b style={{ color: ACTION_COLORS[userAction.type] || '#fff' }}>
          {userAction.type.toUpperCase()}
          {userAction.sizing ? ` (${userAction.sizing}bb)` : ''}
        </b>
        {' · '}GTO prefers <b style={{ color: ACTION_COLORS[evaluation.gtoPrimary] || '#fff' }}>
          {evaluation.gtoPrimary.toUpperCase()}
        </b>
        {evaluation.gtoSizing ? ` (${evaluation.gtoSizing}bb)` : ''}
      </div>

      {/* Explanation */}
      {evaluation.explanation && (
        <div style={{
          padding: 10, borderRadius: 8, marginBottom: 10,
          background: 'rgba(8,14,22,0.6)', borderLeft: `3px solid ${meta.color}`,
          fontSize: 13, color: '#c8d4e0', lineHeight: 1.5, whiteSpace: 'pre-line',
        }}>
          {evaluation.explanation}
        </div>
      )}

      {/* GTO frequencies */}
      {sorted.length > 0 && (
        <div style={{
          padding: 10, borderRadius: 8, background: 'rgba(8,14,22,0.4)',
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 10, color: '#5a6a7a', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6,
          }}>GTO STRATEGY</div>
          {sorted.map(([action, freq]) => (
            <FreqBar key={action} action={action} pct={Math.round(freq * 100)} isHero={action === userAction.type} />
          ))}
        </div>
      )}

      {/* Range grid: highlight hero hand with GTO action mix */}
      {showGrid && (
        <div style={{
          padding: 10, borderRadius: 8, background: 'rgba(8,14,22,0.4)',
          marginBottom: 10,
          display: 'flex', justifyContent: 'center',
        }}>
          <RangeGrid
            range={heroRangeEntry}
            selected={heroHand}
            size="small"
            title={`YOUR HAND: ${heroHand}`}
            showLegend={true}
          />
        </div>
      )}

      <button
        onClick={onNext}
        style={{
          width: '100%', padding: 12, borderRadius: 10,
          background: 'linear-gradient(135deg, #1e5a80, #2980b9)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontWeight: 800, fontSize: 14, letterSpacing: 1,
        }}
      >
        {isLast ? 'FINISH' : 'NEXT →'}
      </button>
    </div>
  );
}
