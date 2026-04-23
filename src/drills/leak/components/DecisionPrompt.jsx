// DecisionPrompt.jsx — Buttons for fold/call/raise/check/bet and sizing slider
import React, { useState, useMemo } from 'react';

const ACTION_META = {
  fold:  { label: 'FOLD',  bg: 'linear-gradient(135deg, #5a1a1a, #c0392b)' },
  check: { label: 'CHECK', bg: 'linear-gradient(135deg, #3a4a5a, #5a6a7a)' },
  call:  { label: 'CALL',  bg: 'linear-gradient(135deg, #1a3a5a, #2980b9)' },
  raise: { label: 'RAISE', bg: 'linear-gradient(135deg, #1a5a30, #27ae60)' },
  bet:   { label: 'BET',   bg: 'linear-gradient(135deg, #7a4a10, #e67e22)' },
  '3bet':{ label: '3-BET', bg: 'linear-gradient(135deg, #4a1a6a, #8e44ad)' },
  '4bet':{ label: '4-BET', bg: 'linear-gradient(135deg, #4a1a6a, #6c2d8f)' },
  '5bet':{ label: '5-BET', bg: 'linear-gradient(135deg, #4a1a6a, #5a1a7a)' },
  shove: { label: 'ALL-IN', bg: 'linear-gradient(135deg, #6a1010, #e74c3c)' },
  limp:  { label: 'LIMP',  bg: 'linear-gradient(135deg, #7a6a10, #f1c40f)' },
};

function deriveActions(decision) {
  // Always show the GTO action set so user can pick any of them,
  // plus the relevant baseline. Preserve a sensible order.
  const order = ['fold', 'check', 'call', 'limp', 'raise', 'bet', '3bet', '4bet', '5bet', 'shove'];
  const gtoKeys = Object.keys(decision.gto || {});
  // If the decision has toCall > 0, include fold/call/raise baseline
  // If toCall == 0, include check/bet baseline
  const baseline = decision.toCall_bb > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet'];
  const set = new Set([...gtoKeys, ...baseline]);
  return order.filter(a => set.has(a));
}

export default function DecisionPrompt({ decision, onSubmit, stackBB }) {
  const [selected, setSelected] = useState(null);
  const [sizing, setSizing] = useState(null);

  const actions = useMemo(() => deriveActions(decision), [decision]);
  const sizable = selected && ['raise', 'bet', '3bet', '4bet', '5bet'].includes(selected);

  const defaultSize = useMemo(() => {
    if (decision.gtoSizing) return decision.gtoSizing;
    if (decision.toCall_bb > 0) return Math.max(decision.toCall_bb * 3, 2);
    return Math.max(Math.round((decision.pot_bb || 10) * 0.5), 2);
  }, [decision]);

  const currentSize = sizing ?? defaultSize;

  function handleSubmit() {
    if (!selected) return;
    const action = { type: selected };
    if (sizable) action.sizing = currentSize;
    onSubmit(action);
  }

  return (
    <div style={{
      padding: 12, background: 'rgba(10,15,25,0.85)',
      borderRadius: 12, border: '1px solid rgba(74,200,255,0.2)',
    }}>
      <div style={{
        fontSize: 10, color: '#4a6a7a', letterSpacing: 1, fontWeight: 700, marginBottom: 8,
      }}>YOUR ACTION</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: 6 }}>
        {actions.map(a => {
          const meta = ACTION_META[a] || { label: a.toUpperCase(), bg: '#34495e' };
          const active = selected === a;
          return (
            <button key={a} onClick={() => setSelected(a)} style={{
              padding: '11px 8px', borderRadius: 8,
              background: active ? meta.bg : 'rgba(20,28,42,0.8)',
              border: active ? '2px solid #d4af37' : '1px solid rgba(74,200,255,0.15)',
              color: active ? '#fff' : '#a0b0c0',
              fontWeight: 800, fontSize: 12, cursor: 'pointer',
              letterSpacing: 1, transition: 'all 0.15s',
            }}>
              {meta.label}
            </button>
          );
        })}
      </div>

      {sizable && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a9aaa', marginBottom: 4 }}>
            <span>Sizing</span>
            <span style={{ color: '#d4af37', fontWeight: 700 }}>{currentSize}BB</span>
          </div>
          <input
            type="range"
            min={Math.max(decision.toCall_bb ? decision.toCall_bb * 2 : 2, 2)}
            max={stackBB || 100}
            step={0.5}
            value={currentSize}
            onChange={e => setSizing(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#d4af37' }}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected}
        style={{
          marginTop: 12, width: '100%', padding: '12px',
          background: selected ? 'linear-gradient(135deg, #1a5a30, #27ae60)' : '#1a2230',
          color: selected ? '#fff' : '#4a5a6a',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, letterSpacing: 1,
          cursor: selected ? 'pointer' : 'not-allowed',
        }}
      >
        SUBMIT
      </button>
    </div>
  );
}
