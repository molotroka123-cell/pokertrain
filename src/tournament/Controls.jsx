// Controls.jsx — Action buttons for the player

import React from 'react';

const btnBase = {
  padding: '12px 0',
  borderRadius: '10px',
  border: 'none',
  fontWeight: 700,
  fontSize: '15px',
  cursor: 'pointer',
  flex: 1,
  margin: '0 4px',
  transition: 'opacity 0.15s',
  color: '#fff',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const styles = {
  container: {
    display: 'flex',
    padding: '12px 8px',
    gap: '0px',
    background: '#0d1118',
    borderTop: '1px solid #1e2a3a',
  },
  fold: { ...btnBase, background: '#c0392b' },
  check: { ...btnBase, background: '#2980b9' },
  call: { ...btnBase, background: '#27ae60' },
  raise: { ...btnBase, background: '#f39c12' },
  allIn: { ...btnBase, background: '#e74c3c', fontSize: '13px' },
  disabled: { opacity: 0.4, cursor: 'default' },
  slider: {
    width: '100%',
    margin: '8px 0 4px',
    accentColor: '#f39c12',
  },
  raisePanel: {
    padding: '8px 12px',
    background: '#111820',
    borderTop: '1px solid #1a2230',
  },
  raiseLabel: {
    fontSize: '12px',
    color: '#8899aa',
    textAlign: 'center',
    marginBottom: '4px',
  },
  raiseAmount: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f39c12',
    textAlign: 'center',
  },
  presets: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
  },
  preset: {
    flex: 1,
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid #2a3a4a',
    background: '#151b28',
    color: '#aaa',
    fontSize: '11px',
    cursor: 'pointer',
    textAlign: 'center',
  },
};

export default function Controls({
  canCheck,
  canCall,
  toCall,
  pot,
  myChips,
  minRaise,
  maxRaise,
  onAction,
  disabled,
}) {
  const [raiseAmount, setRaiseAmount] = React.useState(minRaise || 0);
  const [showRaise, setShowRaise] = React.useState(false);

  React.useEffect(() => {
    setRaiseAmount(minRaise || 0);
    setShowRaise(false);
  }, [minRaise, pot]);

  if (disabled) return null;

  const handleRaise = () => {
    if (!showRaise) {
      setShowRaise(true);
      return;
    }
    onAction('raise', raiseAmount);
    setShowRaise(false);
  };

  const presets = [
    { label: '50%', val: Math.floor(pot * 0.5) },
    { label: '67%', val: Math.floor(pot * 0.67) },
    { label: 'Pot', val: pot },
    { label: 'All-In', val: myChips },
  ].filter(p => p.val >= (minRaise || 0) && p.val <= myChips);

  return (
    <div>
      {showRaise && (
        <div style={styles.raisePanel}>
          <div style={styles.raiseLabel}>Raise to</div>
          <div style={styles.raiseAmount}>{raiseAmount.toLocaleString()}</div>
          <input
            type="range"
            style={styles.slider}
            min={minRaise || 0}
            max={maxRaise || myChips}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
          />
          <div style={styles.presets}>
            {presets.map((p) => (
              <div key={p.label} style={styles.preset} onClick={() => setRaiseAmount(p.val)}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={styles.container}>
        <button style={styles.fold} onClick={() => { onAction('fold'); setShowRaise(false); }}>
          Fold
        </button>
        {canCheck ? (
          <button style={styles.check} onClick={() => { onAction('check'); setShowRaise(false); }}>
            Check
          </button>
        ) : canCall ? (
          <button style={styles.call} onClick={() => { onAction('call'); setShowRaise(false); }}>
            Call {toCall > 0 ? toCall.toLocaleString() : ''}
          </button>
        ) : null}
        <button style={styles.raise} onClick={handleRaise}>
          {showRaise ? 'Confirm' : myChips <= (minRaise || 0) ? 'All-In' : 'Raise'}
        </button>
      </div>
    </div>
  );
}
