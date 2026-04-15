// DrillShell.jsx — Premium drill wrapper: timer, streaks, speed modes, GTO frequencies
import React, { useState, useEffect, useRef } from 'react';

const SPEED_MODES = { casual: 0, standard: 15, hyper: 5 };

const s = {
  container: { padding: '12px 16px', maxWidth: '500px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1a2a3a',
  },
  title: { fontSize: '17px', fontWeight: 700, color: '#ffd700' },
  back: {
    padding: '5px 12px', background: '#0d1118', border: '1px solid #1a2230',
    borderRadius: '6px', color: '#6b7b8d', fontSize: '11px', cursor: 'pointer',
  },
  statsRow: {
    display: 'flex', gap: '1px', marginBottom: '10px', borderRadius: '10px',
    overflow: 'hidden', background: '#1a2230',
  },
  stat: (active) => ({
    flex: 1, padding: '8px 4px', textAlign: 'center',
    background: active ? '#0d1a14' : '#0a0e14',
  }),
  statLabel: { fontSize: '8px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statVal: (color) => ({ fontSize: '18px', fontWeight: 800, color: color || '#c0d0e0' }),
  timerBar: (pct, color) => ({
    height: '4px', background: '#0a0e14', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden',
    position: 'relative',
  }),
  timerFill: (pct, color) => ({
    height: '100%', width: `${pct}%`, borderRadius: '2px',
    background: color, transition: 'width 0.3s linear',
  }),
  streakBadge: {
    textAlign: 'center', padding: '4px', fontSize: '11px', fontWeight: 700,
    color: '#ffd700', marginBottom: '6px',
  },
  speedToggle: {
    display: 'flex', gap: '4px', marginBottom: '8px',
  },
  speedBtn: (active) => ({
    flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    background: active ? '#1a3a2a' : '#0a0e14',
    color: active ? '#27ae60' : '#3a4a5a',
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
  }),
  card: {
    background: '#0d1118', borderRadius: '12px', padding: '14px',
    border: '1px solid #1a2230', marginBottom: '10px',
  },
  gtoBox: {
    padding: '10px', borderRadius: '8px', background: '#0a1018',
    border: '1px solid #1a2a3a', marginTop: '8px',
  },
  gtoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 0', fontSize: '12px',
  },
  gtoBar: (pct, color) => ({
    height: '6px', width: `${pct}%`, background: color,
    borderRadius: '3px', minWidth: '4px',
  }),
  confidence: (conf) => ({
    fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', display: 'inline-block',
    background: conf === 'solver' ? '#0a2a1a' : conf === 'gto' ? '#1a2a0a' : '#1a1a0a',
    color: conf === 'solver' ? '#48bb78' : conf === 'gto' ? '#a0d080' : '#d0c060',
    marginTop: '4px',
  }),
};

export default function DrillShell({ title, correct, total, onBack, streak, children, onTimeout, timerActive }) {
  const [speed, setSpeed] = useState('standard');
  const [timeLeft, setTimeLeft] = useState(SPEED_MODES.standard);
  const intervalRef = useRef(null);

  // Timer
  useEffect(() => {
    if (speed === 'casual' || !timerActive) {
      setTimeLeft(SPEED_MODES[speed] || 15);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const maxTime = SPEED_MODES[speed] || 15;
    setTimeLeft(maxTime);
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          if (onTimeout) onTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [speed, timerActive, onTimeout]);

  const maxTime = SPEED_MODES[speed] || 15;
  const timerPct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 100;
  const timerColor = timerPct > 50 ? '#27ae60' : timerPct > 25 ? '#f39c12' : '#e74c3c';
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>{title}</div>
        <button onClick={onBack} style={s.back}>Back</button>
      </div>

      {/* Speed mode toggle */}
      <div style={s.speedToggle}>
        {['casual', 'standard', 'hyper'].map(m => (
          <button key={m} onClick={() => setSpeed(m)} style={s.speedBtn(speed === m)}>
            {m === 'casual' ? 'Easy' : m === 'standard' ? 'Normal (15s)' : 'Hard (5s)'}
          </button>
        ))}
      </div>

      {/* Timer bar */}
      {speed !== 'casual' && timerActive && (
        <div style={s.timerBar(timerPct, timerColor)}>
          <div style={s.timerFill(timerPct, timerColor)} />
        </div>
      )}

      {/* Streak badge */}
      {streak >= 5 && (
        <div style={s.streakBadge}>
          {streak >= 20 ? '🔥🔥🔥' : streak >= 10 ? '🔥🔥' : '🔥'} {streak} streak!
        </div>
      )}

      {/* Stats row */}
      <div style={s.statsRow}>
        <div style={s.stat(false)}>
          <div style={s.statLabel}>Correct</div>
          <div style={s.statVal('#27ae60')}>{correct}</div>
        </div>
        <div style={s.stat(false)}>
          <div style={s.statLabel}>Total</div>
          <div style={s.statVal('#c0d0e0')}>{total}</div>
        </div>
        <div style={s.stat(false)}>
          <div style={s.statLabel}>Accuracy</div>
          <div style={s.statVal(pct >= 70 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#e74c3c')}>{pct}%</div>
        </div>
        <div style={s.stat(true)}>
          <div style={s.statLabel}>Streak</div>
          <div style={s.statVal(streak >= 10 ? '#ffd700' : streak >= 5 ? '#f39c12' : '#6b7b8d')}>{streak || 0}</div>
        </div>
      </div>

      {children}
    </div>
  );
}

// GTO frequency display component
export function GTOFrequencies({ frequencies, heroAction, isCorrect }) {
  if (!frequencies) return null;
  // frequencies = { raise: 35, call: 50, fold: 15 }
  const colors = { raise: '#27ae60', call: '#3498db', fold: '#e74c3c', check: '#8899aa' };
  const sorted = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  const bestAction = sorted[0][0];
  const heroFreq = frequencies[heroAction] || 0;
  const score = Math.round(heroFreq * 0.9 + (heroAction === bestAction ? 10 : 0));

  return (
    <div style={s.gtoBox}>
      <div style={{ fontSize: '11px', color: '#5a6a7a', marginBottom: '6px', fontWeight: 700, letterSpacing: '1px' }}>GTO STRATEGY</div>
      {sorted.filter(([, pct]) => pct > 0).map(([action, pct]) => (
        <div key={action} style={s.gtoRow}>
          <span style={{
            color: action === heroAction ? (isCorrect ? '#27ae60' : '#e74c3c') : '#6b7b8d',
            fontWeight: action === heroAction ? 700 : 400,
          }}>
            {action === heroAction ? '► ' : '  '}{action.toUpperCase()}
          </span>
          <div style={{ flex: 1, margin: '0 8px' }}>
            <div style={s.gtoBar(pct, colors[action] || '#6b7b8d')} />
          </div>
          <span style={{ color: '#8a9aaa', fontWeight: 600, fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>{pct}%</span>
        </div>
      ))}
      <div style={{ fontSize: '11px', color: '#4a5a6a', marginTop: '6px' }}>
        Your score: <span style={{ color: score >= 70 ? '#27ae60' : score >= 40 ? '#f39c12' : '#e74c3c', fontWeight: 700 }}>{score}</span>/100
      </div>
    </div>
  );
}

// ═══ SPACED REPETITION HELPERS ═══

// Save missed hand for later review
export function spacedRepMiss(drillId, handKey) {
  try {
    const key = `drill_spaced_${drillId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[handKey] = { misses: (data[handKey]?.misses || 0) + 1, nextReview: Date.now() + 60000 };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

// Check if a missed hand is due for review
export function spacedRepDue(drillId) {
  try {
    const data = JSON.parse(localStorage.getItem(`drill_spaced_${drillId}`) || '{}');
    const now = Date.now();
    return Object.entries(data).filter(([, v]) => v.nextReview <= now).map(([k]) => k);
  } catch (e) { return []; }
}

// Mark reviewed
export function spacedRepReviewed(drillId, handKey, correct) {
  try {
    const key = `drill_spaced_${drillId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    if (correct) { delete data[handKey]; }
    else { data[handKey] = { ...data[handKey], nextReview: Date.now() + 180000 }; } // retry in 3 min
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

// ═══ GLOBAL DRILL STATS ═══

export function saveGlobalStats(drillId, correct, total) {
  try {
    const key = 'drill_stats_global';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    if (!data[drillId]) data[drillId] = { totalAttempts: 0, totalCorrect: 0, sessions: 0, lastPlayed: 0 };
    data[drillId].totalAttempts += total;
    data[drillId].totalCorrect += correct;
    data[drillId].sessions++;
    data[drillId].lastPlayed = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

export function loadGlobalStats(drillId) {
  try {
    const data = JSON.parse(localStorage.getItem('drill_stats_global') || '{}');
    return data[drillId] || null;
  } catch (e) { return null; }
}

export { s as drillStyles };
