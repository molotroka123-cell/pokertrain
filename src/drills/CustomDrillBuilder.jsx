// CustomDrillBuilder.jsx — Build your own drill: pick position, stack, scenario type
import React, { useState } from 'react';
import DrillShell, { drillStyles as ds } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { cryptoRandomFloat } from '../engine/deck.js';

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS = ['h','d','c','s'];
const pick = (arr) => arr[Math.floor(cryptoRandomFloat() * arr.length)];
const pickN = (arr, n) => { const s = [...arr]; const r = []; while (r.length < n && s.length) { const i = Math.floor(cryptoRandomFloat() * s.length); r.push(s.splice(i, 1)[0]); } return r; };

function genCards(n) {
  const used = new Set();
  const cards = [];
  while (cards.length < n) { const c = pick(RANKS) + pick(SUITS); if (!used.has(c)) { used.add(c); cards.push(c); } }
  return cards;
}

function genScenario(cfg) {
  const allCards = genCards(7);
  const hero = allCards.slice(0, 2);
  const board = allCards.slice(2, 2 + (cfg.street === 'preflop' ? 0 : cfg.street === 'flop' ? 3 : cfg.street === 'turn' ? 4 : 5));
  const pot = cfg.stack * (cfg.street === 'preflop' ? 0.1 : cfg.street === 'flop' ? 0.25 : 0.5);
  const toCall = cfg.facing === 'bet' ? Math.round(pot * (0.3 + cryptoRandomFloat() * 0.7)) : 0;

  const heroRank1 = RANKS.indexOf(hero[0][0]);
  const heroRank2 = RANKS.indexOf(hero[1][0]);
  const paired = heroRank1 === heroRank2;
  const suited = hero[0][1] === hero[1][1];
  const highCard = Math.min(heroRank1, heroRank2);
  const connected = Math.abs(heroRank1 - heroRank2) <= 2;

  let correct, reason;
  if (cfg.street === 'preflop') {
    if (paired || highCard <= 3) { correct = 'raise'; reason = 'Strong preflop hand — raise for value.'; }
    else if (highCard <= 6 && (suited || connected)) { correct = 'raise'; reason = 'Playable suited/connected — open raise.'; }
    else if (highCard >= 10 && !suited) { correct = 'fold'; reason = 'Weak offsuit hand — fold preflop.'; }
    else { correct = cfg.facing === 'bet' ? 'fold' : 'raise'; reason = cfg.facing === 'bet' ? 'Marginal hand vs raise — fold.' : 'Marginal but unopened — open.'; }
  } else {
    const boardRanks = board.map(c => RANKS.indexOf(c[0]));
    const hasPair = boardRanks.some(br => br === heroRank1 || br === heroRank2);
    const hasOverpair = paired && heroRank1 < Math.min(...boardRanks);
    if (hasOverpair || (hasPair && highCard <= 4)) { correct = toCall > 0 ? 'call' : 'bet'; reason = hasPair ? 'Top pair+ — bet/call for value.' : 'Overpair — strong, bet for value.'; }
    else if (hasPair) { correct = toCall > 0 ? 'call' : 'check'; reason = 'Weak pair — check or call small. Don\'t build big pot.'; }
    else if (suited && board.filter(c => c[1] === hero[0][1]).length >= 2) { correct = toCall > 0 ? 'call' : 'bet'; reason = 'Flush draw — semi-bluff or call with equity.'; }
    else { correct = toCall > 0 ? 'fold' : 'check'; reason = 'No pair, no draw — give up or check.'; }
  }

  return { hero, board, pot: Math.round(pot), toCall, correct, reason, pos: cfg.position, street: cfg.street, stack: cfg.stack, facing: cfg.facing };
}

export default function CustomDrillBuilder({ onBack }) {
  const [mode, setMode] = useState('config');
  const [cfg, setCfg] = useState({ position: 'BTN', stack: 50, street: 'flop', facing: 'check', hands: 15 });
  const [spot, setSpot] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  if (mode === 'config') {
    return (
      <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto', minHeight: '100vh', background: '#050b18' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ac8ff' }}>Custom Drill</div>
          <button onClick={onBack} style={{ padding: '8px 16px', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '10px', color: '#4ac8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>← Back</button>
        </div>

        {/* Position */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>POSITION</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(p => (
              <button key={p} onClick={() => setCfg(c => ({ ...c, position: p }))} style={{
                padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${cfg.position === p ? '#4ac8ff' : 'rgba(74,200,255,0.15)'}`,
                background: cfg.position === p ? 'rgba(74,200,255,0.15)' : 'rgba(8,16,28,0.8)',
                color: cfg.position === p ? '#4ac8ff' : '#6a8a9a', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stack depth */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>STACK DEPTH (BB)</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[10, 20, 30, 50, 100].map(s => (
              <button key={s} onClick={() => setCfg(c => ({ ...c, stack: s }))} style={{
                padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${cfg.stack === s ? '#ffa020' : 'rgba(74,200,255,0.15)'}`,
                background: cfg.stack === s ? 'rgba(255,160,32,0.12)' : 'rgba(8,16,28,0.8)',
                color: cfg.stack === s ? '#ffa020' : '#6a8a9a', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}>{s}bb</button>
            ))}
          </div>
        </div>

        {/* Street */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>STREET</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['preflop', 'flop', 'turn', 'river'].map(s => (
              <button key={s} onClick={() => setCfg(c => ({ ...c, street: s }))} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${cfg.street === s ? '#22c55e' : 'rgba(74,200,255,0.15)'}`,
                background: cfg.street === s ? 'rgba(34,197,94,0.12)' : 'rgba(8,16,28,0.8)',
                color: cfg.street === s ? '#22c55e' : '#6a8a9a', fontWeight: 700, fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Facing */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>FACING ACTION</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['check', 'bet'].map(f => (
              <button key={f} onClick={() => setCfg(c => ({ ...c, facing: f }))} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${cfg.facing === f ? '#8b5cf6' : 'rgba(74,200,255,0.15)'}`,
                background: cfg.facing === f ? 'rgba(139,92,246,0.12)' : 'rgba(8,16,28,0.8)',
                color: cfg.facing === f ? '#8b5cf6' : '#6a8a9a', fontWeight: 700, fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize',
              }}>{f === 'check' ? 'Checked to you' : 'Facing bet'}</button>
            ))}
          </div>
        </div>

        {/* Hands count */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>HANDS: {cfg.hands}</div>
          <input type="range" min={5} max={30} value={cfg.hands} onChange={e => setCfg(c => ({ ...c, hands: +e.target.value }))}
            style={{ width: '100%' }} />
        </div>

        <button onClick={() => { setSpot(genScenario(cfg)); setMode('play'); }} style={{
          width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #1a6a3a, #22a050)',
          color: '#fff', fontWeight: 900, fontSize: '16px', cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(34,160,80,0.3)',
        }}>START CUSTOM DRILL</button>
      </div>
    );
  }

  if (total >= cfg.hands || !spot) {
    const pct = total > 0 ? Math.round(correct / total * 100) : 0;
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh', background: '#050b18' }}>
        <div style={{ fontSize: '24px', fontWeight: 900, color: pct >= 70 ? '#22c55e' : '#ffa020', marginBottom: '10px' }}>{pct}% Correct</div>
        <div style={{ fontSize: '14px', color: '#8899aa' }}>{correct}/{total} hands</div>
        <div style={{ fontSize: '12px', color: '#5a6a7a', marginTop: '8px' }}>{cfg.position} · {cfg.stack}bb · {cfg.street} · {cfg.facing}</div>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '14px 28px', background: '#22a050', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Done</button>
      </div>
    );
  }

  const answer = (action) => {
    if (answered) return;
    setAnswered(true);
    const isCorrect = action === spot.correct;
    setTotal(t => t + 1);
    if (isCorrect) setCorrect(c => c + 1);
    setFeedback({ isCorrect, correctAction: spot.correct, reason: spot.reason });
  };

  const next = () => { setSpot(genScenario(cfg)); setFeedback(null); setAnswered(false); };

  return (
    <DrillShell title={`Custom: ${cfg.position} ${cfg.stack}bb ${cfg.street}`} correct={correct} total={total} streak={0} onBack={onBack} timerActive={!answered}>
      <div style={ds.card}>
        <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '8px' }}>
          <span style={{ color: '#4ac8ff', fontWeight: 700 }}>{spot.pos}</span>
          {' | '}{spot.street.toUpperCase()} | Stack: {spot.stack}bb | Pot: {spot.pot}
          {spot.toCall > 0 ? ` | Facing: ${spot.toCall}` : ' | Your action'}
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
          {spot.hero.map((c, i) => <Card key={i} card={c} hero delay={i * 200} />)}
        </div>
        {spot.board.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
            {spot.board.map((c, i) => <Card key={i} card={c} mini delay={i * 150} />)}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#5a6a7a', textAlign: 'center' }}>Hand {total + 1}/{cfg.hands}</div>
      </div>

      {feedback ? (
        <div style={{ ...ds.card, background: feedback.isCorrect ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)', border: `1px solid ${feedback.isCorrect ? '#27ae6033' : '#e74c3c33'}` }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '6px' }}>
            {feedback.isCorrect ? '✓ Correct!' : `✗ GTO: ${feedback.correctAction.toUpperCase()}`}
          </div>
          <div style={{ fontSize: '12px', color: '#8899aa', lineHeight: 1.5 }}>{feedback.reason}</div>
          <button onClick={next} style={{ marginTop: '10px', padding: '12px 24px', background: '#1a3a2a', border: 'none', borderRadius: '10px', color: '#27ae60', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '14px' }}>Next Hand →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => answer('fold')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a1a1a', color: '#aaa', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>FOLD</button>
          {spot.toCall > 0 ? (
            <button onClick={() => answer('call')} style={{ flex: 1.4, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a3a2a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>CALL</button>
          ) : (
            <button onClick={() => answer('check')} style={{ flex: 1.2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1a2a3a', color: '#4ac8ff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>CHECK</button>
          )}
          <button onClick={() => answer(spot.toCall > 0 ? 'raise' : 'bet')} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3a3010', color: '#d4af37', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{spot.toCall > 0 ? 'RAISE' : 'BET'}</button>
        </div>
      )}
    </DrillShell>
  );
}
