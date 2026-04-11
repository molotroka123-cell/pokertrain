// HandReplay.jsx — Street-by-street hand replayer
import React, { useState } from 'react';
import Card from '../components/Card.jsx';

const s = {
  container: {
    background: '#111820', borderRadius: '12px', padding: '16px',
    margin: '12px', border: '1px solid #1e2a3a',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px',
  },
  title: { fontSize: '16px', fontWeight: 700, color: '#ffd700' },
  nav: { display: 'flex', gap: '6px' },
  navBtn: (active) => ({
    padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    background: active ? '#1a5c3a' : '#1a2840', color: active ? '#fff' : '#6b7b8d',
    fontWeight: 600, fontSize: '11px',
  }),
  street: {
    padding: '10px', background: '#0d1118', borderRadius: '8px', marginBottom: '8px',
  },
  streetTitle: { fontSize: '12px', color: '#8899aa', fontWeight: 600, marginBottom: '6px' },
  actionLine: { fontSize: '12px', color: '#c0d0e0', padding: '3px 0' },
  heroAction: { color: '#ffd700', fontWeight: 600 },
  cards: { display: 'flex', justifyContent: 'center', margin: '8px 0', gap: '4px' },
  result: (won) => ({
    textAlign: 'center', padding: '10px', borderRadius: '8px', marginTop: '8px',
    background: won ? '#1a3a2a' : '#3a1a1a',
    color: won ? '#27ae60' : '#e74c3c',
    fontWeight: 700, fontSize: '14px',
  }),
  mistake: {
    marginTop: '10px', padding: '10px', background: '#2a1a10', borderRadius: '8px',
    border: '1px solid #5a3a1a',
  },
  mistakeTitle: { fontSize: '12px', fontWeight: 700, color: '#f39c12', marginBottom: '4px' },
  mistakeText: { fontSize: '12px', color: '#c0d0e0', lineHeight: 1.5 },
};

export default function HandReplay({ hand, onClose }) {
  const [visibleStreet, setVisibleStreet] = useState('all');

  if (!hand) return null;

  const streets = ['preflop', 'flop', 'turn', 'river'];
  const actions = hand.actions || [];
  const heroWon = hand.result === 'won';

  const getStreetActions = (street) => actions.filter(a => a.stage === street);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>Hand #{hand.handNumber}</div>
        <div style={s.nav}>
          <button style={s.navBtn(visibleStreet === 'all')} onClick={() => setVisibleStreet('all')}>All</button>
          {streets.map(st => (
            <button key={st} style={s.navBtn(visibleStreet === st)} onClick={() => setVisibleStreet(st)}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
          {onClose && <button style={{ ...s.navBtn(false), color: '#e74c3c' }} onClick={onClose}>Close</button>}
        </div>
      </div>

      {/* Hero cards */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#6b7b8d' }}>Your hand: [{hand.position}]</div>
        <div style={s.cards}>
          {(hand.holeCards || '').split(' ').filter(Boolean).map((c, i) => (
            <Card key={i} card={c} />
          ))}
        </div>
      </div>

      {/* Streets */}
      {streets.map(street => {
        if (visibleStreet !== 'all' && visibleStreet !== street) return null;
        const streetActions = getStreetActions(street);
        if (streetActions.length === 0 && street !== 'preflop') return null;

        return (
          <div key={street} style={s.street}>
            <div style={s.streetTitle}>
              {street.toUpperCase()}
              {street !== 'preflop' && hand.boardByStreet?.[street] && (
                <span style={{ color: '#6b7b8d' }}> — {hand.boardByStreet[street]}</span>
              )}
            </div>
            {/* Board cards for this street */}
            {street !== 'preflop' && hand.boardByStreet?.[street] && (
              <div style={s.cards}>
                {hand.boardByStreet[street].split(' ').filter(Boolean).map((c, i) => (
                  <Card key={i} card={c} mini />
                ))}
              </div>
            )}
            {streetActions.map((a, i) => (
              <div key={i} style={{ ...s.actionLine, ...(a.isHero ? s.heroAction : {}) }}>
                [{a.position}] {a.isHero ? 'Hero' : a.name} {a.action}
                {a.amount ? ` ${a.amount.toLocaleString()}` : ''}
              </div>
            ))}
          </div>
        );
      })}

      {/* Result */}
      <div style={s.result(heroWon)}>
        {heroWon ? `Won +${((hand.chipsAfter || 0) - (hand.chipsBeforeHand || hand.myChips || 0)).toLocaleString()}` : `Lost — ${hand.result || 'folded'}`}
      </div>

      {/* Mistake analysis */}
      {hand.mistake && (
        <div style={s.mistake}>
          <div style={s.mistakeTitle}>
            {hand.mistake.severity === 'critical' ? '🔴' : hand.mistake.severity === 'high' ? '🟡' : '🟠'}
            {' '}{hand.mistake.severity?.toUpperCase()} — {hand.mistake.type?.replace(/_/g, ' ')}
          </div>
          {hand.mistake.explanation && (
            <>
              <div style={s.mistakeText}>{hand.mistake.explanation.what}</div>
              <div style={{ ...s.mistakeText, marginTop: '4px', color: '#f39c12' }}>{hand.mistake.explanation.why}</div>
              <div style={{ ...s.mistakeText, marginTop: '4px', color: '#27ae60' }}>{hand.mistake.explanation.alternative}</div>
              {hand.mistake.drillRecommendation && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#8899aa' }}>
                  {hand.mistake.drillRecommendation.icon} Recommended: {hand.mistake.drillRecommendation.drill}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
