// GTOAnalyzer.jsx — GTO Wizard-style analysis: Stats + Hands + Heatmap
import React, { useState, useMemo } from 'react';
import { loadSessions } from '../recorder/ActionRecorder.js';

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const POSITIONS = ['UTG','UTG+1','MP','HJ','CO','BTN','SB','BB'];

function normHand(hc) {
  if (!hc || typeof hc !== 'string') return null;
  const p = hc.split(' ');
  if (p.length < 2) return null;
  const RO = 'AKQJT98765432';
  const r1 = p[0][0], s1 = p[0][1], r2 = p[1][0], s2 = p[1][1];
  const i1 = RO.indexOf(r1), i2 = RO.indexOf(r2);
  if (i1 < 0 || i2 < 0) return null;
  if (i1 === i2) return r1 + r2;
  const suited = s1 === s2 ? 's' : 'o';
  return i1 < i2 ? r1 + r2 + suited : r2 + r1 + suited;
}

function parseBB(blinds) {
  if (!blinds) return 200;
  const parts = String(blinds).split('/');
  return parseInt(parts[1]) || parseInt(parts[0]) * 2 || 200;
}

function classify(evLostBB) {
  if (evLostBB <= 0) return 'perfect';
  if (evLostBB < 1) return 'good';
  if (evLostBB < 3) return 'inaccurate';
  if (evLostBB < 10) return 'mistake';
  return 'blunder';
}

const CLS_COLORS = { perfect: '#22c55e', good: '#86efac', inaccurate: '#fbbf24', mistake: '#ef4444', blunder: '#991b1b' };
const CLS_LABELS = { perfect: 'Perfect', good: 'Good', inaccurate: 'Inaccurate', mistake: 'Mistake', blunder: 'Blunder' };
const ACT_COLORS = { fold: '#ef4444', call: '#3b82f6', raise: '#22c55e', check: '#6b7280', bet: '#fbbf24', 'all-in': '#a855f7' };

function processData(sessions) {
  const hands = new Map(); // handNumber → { records, handKey, position, ... }
  for (const s of sessions) {
    const recs = s.records || [];
    for (const r of recs) {
      if (!hands.has(r.handNumber)) {
        hands.set(r.handNumber, {
          records: [], handKey: normHand(r.holeCards), holeCards: r.holeCards,
          position: r.position, community: '', bb: parseBB(r.blinds),
          chipsBefore: r.chipsBeforeHand || r.myChips, chipsAfter: null,
          mistakeType: null, evLost: 0, stage: r.stage,
        });
      }
      const h = hands.get(r.handNumber);
      h.records.push(r);
      if (r.community) h.community = r.community;
      if (r.chipsAfter != null) h.chipsAfter = r.chipsAfter;
      if (r.mistakeType && !h.mistakeType) { h.mistakeType = r.mistakeType; h.evLost = r.evLost || 0; }
    }
  }
  // Build processed array
  const result = [];
  for (const [hn, h] of hands) {
    const bb = h.bb || 200;
    const profit = h.chipsAfter != null && h.chipsBefore ? (h.chipsAfter - h.chipsBefore) / bb : 0;
    const evLostBB = h.evLost / bb;
    const cls = h.mistakeType ? classify(evLostBB) : (h.evLost > 0 ? 'good' : 'perfect');
    const actions = h.records.map(r => ({ stage: r.stage, action: r.action, amount: r.raiseAmount }));
    // Pot type
    const pfRecs = h.records.filter(r => r.stage === 'preflop');
    const raises = pfRecs.filter(r => r.action === 'raise').length;
    const potType = raises >= 2 ? '3BP' : raises === 1 ? 'SRP' : 'Limp';
    // Pot size in BB
    const lastRec = h.records[h.records.length - 1];
    const potBB = (lastRec?.potSize || 0) / bb;
    result.push({
      handNumber: hn, handKey: h.handKey, holeCards: h.holeCards,
      position: h.position, community: h.community, bb,
      profitBB: Math.round(profit * 100) / 100, evLostBB: Math.round(evLostBB * 100) / 100,
      cls, potType, potBB: Math.round(potBB * 10) / 10,
      actions, mistakeType: h.mistakeType,
    });
  }
  return result;
}

// ═══ STATS TAB ═══
function StatsTab({ data }) {
  const total = data.length;
  if (total === 0) return <div style={{ textAlign: 'center', color: '#555', padding: '40px' }}>No hands to analyze</div>;
  const counts = { perfect: 0, good: 0, inaccurate: 0, mistake: 0, blunder: 0 };
  let totalEvLoss = 0;
  for (const h of data) { counts[h.cls]++; totalEvLoss += h.evLostBB; }
  const gtoScore = Math.round((counts.perfect + counts.good) / total * 1000) / 10;
  const avgEvLoss = Math.round(totalEvLoss / total * 100) / 100;
  // By street
  const byStreet = {};
  for (const h of data) {
    for (const a of h.actions) {
      const st = a.stage || 'preflop';
      if (!byStreet[st]) byStreet[st] = { total: 0, perfect: 0, good: 0, inaccurate: 0, mistake: 0, blunder: 0 };
      byStreet[st].total++;
    }
    const st = h.actions[0]?.stage || 'preflop';
    if (byStreet[st]) byStreet[st][h.cls]++;
  }
  return (
    <div>
      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
          <div style={{ fontSize: '10px', color: '#666' }}>GTO Score</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: gtoScore >= 80 ? '#22c55e' : gtoScore >= 60 ? '#fbbf24' : '#ef4444' }}>{gtoScore}%</div>
        </div>
        <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
          <div style={{ fontSize: '10px', color: '#666' }}>Hands</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#e5e5e5' }}>{total}</div>
          <div style={{ fontSize: '10px', color: '#555' }}>{data.reduce((a, h) => a + h.actions.length, 0)} moves</div>
        </div>
        <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
          <div style={{ fontSize: '10px', color: '#666' }}>Avg EV Loss</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: avgEvLoss > 1 ? '#ef4444' : '#fbbf24' }}>{avgEvLoss}<span style={{ fontSize: '12px' }}>bb</span></div>
        </div>
      </div>
      {/* Score breakdown bars */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '10px' }}>Score Breakdown</div>
        {Object.entries(counts).map(([cls, n]) => (
          <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: CLS_COLORS[cls], fontWeight: 700, minWidth: '70px' }}>{CLS_LABELS[cls]}</span>
            <div style={{ flex: 1, height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${total > 0 ? n / total * 100 : 0}%`, background: CLS_COLORS[cls], borderRadius: '4px' }}/>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#aaa', minWidth: '30px', textAlign: 'right' }}>{n}</span>
          </div>
        ))}
      </div>
      {/* Street breakdown table */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '10px' }}>By Street</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead><tr style={{ borderBottom: '1px solid #333' }}>
              {['', 'TOTAL', 'PERFECT %', 'GOOD %', 'MISTAKE %', 'BLUNDER %'].map(h => (
                <th key={h} style={{ padding: '6px 4px', textAlign: h ? 'center' : 'left', color: '#555', fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {['preflop', 'flop', 'turn', 'river'].map(st => {
                const d = byStreet[st] || { total: 0, perfect: 0, good: 0, mistake: 0, blunder: 0 };
                const t = d.total || 1;
                return (
                  <tr key={st} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '6px 4px', color: '#ccc', fontWeight: 600, textTransform: 'uppercase' }}>{st}</td>
                    <td style={{ textAlign: 'center', color: '#888' }}>{d.total}</td>
                    <td style={{ textAlign: 'center', color: '#22c55e' }}>{d.total ? Math.round(d.perfect / t * 100) : '-'}</td>
                    <td style={{ textAlign: 'center', color: '#86efac' }}>{d.total ? Math.round(d.good / t * 100) : '-'}</td>
                    <td style={{ textAlign: 'center', color: '#ef4444' }}>{d.total ? Math.round(d.mistake / t * 100) : '-'}</td>
                    <td style={{ textAlign: 'center', color: '#991b1b' }}>{d.total ? Math.round(d.blunder / t * 100) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══ HANDS TAB ═══
function HandsTab({ data }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = useMemo(() => [...data].sort((a, b) => b.evLostBB - a.evLostBB), [data]);
  if (sorted.length === 0) return <div style={{ textAlign: 'center', color: '#555', padding: '40px' }}>No hands</div>;
  const statusIcon = (cls) => cls === 'perfect' ? '✓' : cls === 'good' ? '✓' : cls === 'inaccurate' ? '⚠' : '✗';
  return (
    <div>
      {sorted.map((h, i) => (
        <div key={h.handNumber} onClick={() => setExpanded(expanded === i ? null : i)} style={{
          background: '#111', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px',
          border: `1px solid ${h.cls === 'mistake' || h.cls === 'blunder' ? '#5a1a1a' : '#222'}`,
          cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Status */}
            <span style={{ fontSize: '14px', color: CLS_COLORS[h.cls], fontWeight: 900 }}>{statusIcon(h.cls)}</span>
            {/* Position */}
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#000', background: '#fbbf24', padding: '1px 5px', borderRadius: '4px' }}>{h.position}</span>
            {/* Cards */}
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e5e5e5', fontFamily: 'monospace' }}>{h.holeCards || '??'}</span>
            {/* Board */}
            {h.community && <span style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>{h.community}</span>}
            <span style={{ flex: 1 }}/>
            {/* Pot type */}
            <span style={{ fontSize: '9px', color: '#555', fontWeight: 600 }}>{h.potType}</span>
            {/* Actions */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {h.actions.slice(0, 4).map((a, j) => (
                <span key={j} style={{
                  fontSize: '9px', fontWeight: 800, padding: '1px 3px', borderRadius: '3px',
                  background: (ACT_COLORS[a.action] || '#555') + '22',
                  color: ACT_COLORS[a.action] || '#555',
                }}>{(a.action || '?')[0].toUpperCase()}</span>
              ))}
            </div>
            {/* Win/Loss */}
            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '55px', textAlign: 'right',
              color: h.profitBB > 0 ? '#22c55e' : h.profitBB < 0 ? '#ef4444' : '#555' }}>
              {h.profitBB > 0 ? '+' : ''}{h.profitBB}bb
            </span>
            {/* EV Loss */}
            {h.evLostBB > 0 && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>{h.evLostBB}bb</span>}
          </div>
          {/* Expanded: street by street */}
          {expanded === i && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #222' }} onClick={e => e.stopPropagation()}>
              {['preflop', 'flop', 'turn', 'river'].map(st => {
                const acts = h.actions.filter(a => a.stage === st);
                if (acts.length === 0) return null;
                return (
                  <div key={st} style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', marginRight: '8px' }}>{st}</span>
                    {acts.map((a, j) => (
                      <span key={j} style={{ fontSize: '11px', fontWeight: 600, color: ACT_COLORS[a.action] || '#888', marginRight: '6px' }}>
                        {a.action}{a.amount ? ` ${a.amount}` : ''}
                      </span>
                    ))}
                  </div>
                );
              })}
              {h.mistakeType && <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                Mistake: {h.mistakeType.replace(/_/g, ' ')} | EV Loss: {h.evLostBB}bb
              </div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══ HEATMAP TAB ═══
function HeatmapTab({ data }) {
  // Position stats
  const posStat = {};
  for (const h of data) {
    const p = h.position || '?';
    if (!posStat[p]) posStat[p] = { hands: 0, bbWon: 0 };
    posStat[p].hands++;
    posStat[p].bbWon += h.profitBB;
  }
  // 13×13 matrix
  const matrix = {};
  for (const h of data) {
    if (!h.handKey) continue;
    if (!matrix[h.handKey]) matrix[h.handKey] = { n: 0, bb: 0 };
    matrix[h.handKey].n++;
    matrix[h.handKey].bb += h.profitBB;
  }
  const maxBB = Math.max(1, ...Object.values(matrix).map(m => Math.abs(m.bb)));
  return (
    <div>
      {/* Position stats table */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '12px', border: '1px solid #222', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '8px' }}>Position Stats</div>
        {POSITIONS.filter(p => posStat[p]).map(p => {
          const d = posStat[p];
          const bb100 = d.hands > 0 ? Math.round(d.bbWon / d.hands * 100 * 10) / 10 : 0;
          return (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ color: '#ccc', fontWeight: 700, minWidth: '40px' }}>{p}</span>
              <span style={{ color: '#666' }}>{d.hands} hands</span>
              <span style={{ color: d.bbWon >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                {d.bbWon >= 0 ? '+' : ''}{Math.round(d.bbWon * 10) / 10}bb
              </span>
              <span style={{ color: bb100 >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{bb100}bb/100</span>
            </div>
          );
        })}
      </div>
      {/* 13×13 Matrix */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '10px', border: '1px solid #222' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '8px' }}>Hand Results</div>
        <div style={{ display: 'grid', gridTemplateColumns: `20px repeat(13, 1fr)`, gap: '1px', fontSize: '7px', fontFamily: 'monospace' }}>
          <div/>
          {RANKS.map(r => <div key={r} style={{ textAlign: 'center', color: '#555', fontWeight: 700, padding: '2px 0' }}>{r}</div>)}
          {RANKS.map((r1, ri) => (
            <React.Fragment key={ri}>
              <div style={{ color: '#555', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r1}</div>
              {RANKS.map((r2, ci) => {
                const isPair = ri === ci, isSuited = ri < ci;
                const key = isPair ? r1+r2 : isSuited ? r1+r2+'s' : r2+r1+'o';
                const label = isPair ? r1+r2 : isSuited ? r1+r2 : r2+r1;
                const m = matrix[key];
                let bg = '#0a0a0a';
                if (m) {
                  const intensity = Math.min(1, Math.abs(m.bb) / maxBB);
                  bg = m.bb >= 0
                    ? `rgba(34,197,94,${0.1 + intensity * 0.6})`
                    : `rgba(239,68,68,${0.1 + intensity * 0.6})`;
                }
                return (
                  <div key={ci} style={{
                    padding: '3px 1px', textAlign: 'center', borderRadius: '2px',
                    background: bg, color: m ? (m.bb >= 0 ? '#4ade80' : '#fca5a5') : '#222',
                    fontWeight: 700,
                  }} title={m ? `${key}: ${m.n}x, ${m.bb >= 0 ? '+' : ''}${Math.round(m.bb * 10) / 10}bb` : key}>
                    {label}
                    {m && <div style={{ fontSize: '6px', color: m.bb >= 0 ? '#22c55e88' : '#ef444488' }}>
                      {m.bb >= 0 ? '+' : ''}{Math.round(m.bb)}
                    </div>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: '9px', color: '#444', textAlign: 'center', marginTop: '6px' }}>Green = profit | Red = loss | Number = BB won/lost</div>
      </div>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function GTOAnalyzer({ onBack }) {
  const [tab, setTab] = useState('stats');
  const data = useMemo(() => {
    const sessions = loadSessions();
    return processData(sessions);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e5e5e5', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#22c55e' }}>GTO Analysis</div>
            <div style={{ fontSize: '10px', color: '#555' }}>Poker Trainer Analyzer</div>
          </div>
          <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Back</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {[{id:'stats',label:'Stats'},{id:'hands',label:'Hands'},{id:'results',label:'Results'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#22c55e' : '#111',
              color: tab === t.id ? '#000' : '#666',
              fontWeight: 700, fontSize: '13px',
            }}>{t.label}</button>
          ))}
        </div>
        {tab === 'stats' && <StatsTab data={data} />}
        {tab === 'hands' && <HandsTab data={data} />}
        {tab === 'results' && <HeatmapTab data={data} />}
      </div>
    </div>
  );
}
