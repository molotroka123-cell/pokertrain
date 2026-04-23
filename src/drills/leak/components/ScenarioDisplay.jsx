// ScenarioDisplay.jsx — Shows hero cards, board, stacks, and action history
import React from 'react';
import Card from '../../../components/Card.jsx';

const POS_ORDER = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function splitCards(str) {
  if (!str || str.length < 4) return [];
  return [str.slice(0, 2), str.slice(2, 4)];
}

function ActionBadge({ action, amount_bb, position }) {
  const colors = {
    raise: '#e74c3c', limp: '#f39c12', call: '#3498db', fold: '#7f8c8d',
    check: '#95a5a6', bet: '#e67e22', shove: '#8e44ad',
  };
  const bg = colors[action] || '#34495e';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10,
      background: 'rgba(10,15,25,0.7)', border: `1px solid ${bg}60`,
      fontSize: 11, color: '#bfc8d5',
    }}>
      <span style={{ color: bg, fontWeight: 700 }}>{position}</span>
      <span style={{ color: '#bfc8d5', textTransform: 'uppercase', fontWeight: 600 }}>{action}</span>
      {amount_bb != null && <span style={{ color: '#d4af37' }}>{amount_bb}bb</span>}
    </div>
  );
}

export default function ScenarioDisplay({ scenario, visibleBoard, decision, scenarioIdx, scenarioTotal }) {
  const heroCards = splitCards(scenario.hero?.cards);

  return (
    <div style={{
      background: 'linear-gradient(160deg, #0e1a2c 0%, #0a1120 100%)',
      borderRadius: 14, padding: 14, border: '1px solid rgba(74,200,255,0.15)',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#6b7b8d' }}>
          Scenario <span style={{ color: '#d4af37', fontWeight: 700 }}>{scenarioIdx + 1}/{scenarioTotal}</span>
        </div>
        <div style={{ fontSize: 10, color: '#5a6a7a', letterSpacing: 1, textTransform: 'uppercase' }}>
          {scenario.format} · {scenario.stack_bb}BB
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e0e8f0', marginBottom: 8 }}>
        {scenario.title}
      </div>

      {/* Action history */}
      {scenario.actions_before_hero?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {scenario.actions_before_hero.map((a, i) => (
            <ActionBadge key={i} action={a.action} amount_bb={a.amount_bb} position={a.position} />
          ))}
        </div>
      )}

      {/* Hero position + stack */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 10px', borderRadius: 8,
        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)',
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 11, color: '#8a9aaa' }}>
          Hero: <span style={{ color: '#d4af37', fontWeight: 700, fontSize: 14 }}>{scenario.hero.position}</span>
        </div>
        <div style={{ fontSize: 11, color: '#8a9aaa' }}>
          Stack: <span style={{ color: '#e0e8f0', fontWeight: 700 }}>{scenario.hero.stack_bb}BB</span>
        </div>
      </div>

      {/* Hero cards */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        {heroCards.map((c, i) => <Card key={c + i} card={c} hero={true} delay={i * 120} />)}
      </div>

      {/* Board (if any) */}
      {(visibleBoard.flop || visibleBoard.turn || visibleBoard.river) && (
        <div style={{
          marginTop: 8, padding: 10, borderRadius: 10,
          background: 'radial-gradient(ellipse at center, rgba(22,60,40,0.4), rgba(8,16,28,0.6))',
          border: '1px solid rgba(39,174,96,0.2)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: '#4a6a5a', marginBottom: 4, fontWeight: 700 }}>BOARD</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {(visibleBoard.flop || []).map((c, i) => <Card key={'f' + c + i} card={c} delay={i * 80} />)}
            {visibleBoard.turn && <Card key={'t' + visibleBoard.turn} card={visibleBoard.turn} delay={400} />}
            {visibleBoard.river && <Card key={'r' + visibleBoard.river} card={visibleBoard.river} delay={550} />}
          </div>
        </div>
      )}

      {/* Decision description */}
      {decision && (
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 8,
          background: 'rgba(74,200,255,0.05)', border: '1px solid rgba(74,200,255,0.2)',
        }}>
          <div style={{ fontSize: 9, color: '#4a8aba', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>
            {(decision.street || 'preflop').toUpperCase()} — POT {decision.pot_bb}BB
            {decision.toCall_bb > 0 && <span> · TO CALL {decision.toCall_bb}BB</span>}
          </div>
          <div style={{ fontSize: 13, color: '#c0d0e0', lineHeight: 1.4 }}>
            {decision.description}
          </div>
        </div>
      )}
    </div>
  );
}
