// TournamentDashboard.jsx — Multi-table overview dashboard
import React from 'react';
import { formatPayout } from './PayoutStructure.js';

const s = {
  container: {
    background: '#111820',
    borderRadius: '12px',
    padding: '16px',
    margin: '12px',
    border: '1px solid #1e2a3a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffd700',
  },
  timer: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0',
    background: '#1a2840',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  blinds: {
    fontSize: '13px',
    color: '#8899aa',
    marginBottom: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '12px',
  },
  stat: {
    background: '#0d1118',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '10px',
    color: '#6b7b8d',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  statHighlight: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffd700',
  },
  section: {
    marginTop: '12px',
    borderTop: '1px solid #1a2230',
    paddingTop: '10px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8899aa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  leaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    borderBottom: '1px solid #0d1118',
  },
  leaderName: {
    color: '#c0d0e0',
  },
  leaderChips: {
    fontWeight: 600,
    color: '#ffd700',
  },
  heroRow: {
    background: 'rgba(255, 215, 0, 0.08)',
    borderRadius: '4px',
    padding: '4px 6px',
    margin: '2px -6px',
  },
  elimRow: {
    fontSize: '12px',
    color: '#6b7b8d',
    padding: '3px 0',
  },
  bubble: {
    background: '#e74c3c',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '8px 0',
    animation: 'pulse 1.5s infinite',
  },
  inMoney: {
    background: '#27ae60',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '8px 0',
  },
  payoutList: {
    fontSize: '12px',
    color: '#8899aa',
  },
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatChips(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function TournamentDashboard({ state, onBackToTable }) {
  if (!state) return null;

  const {
    format, blinds, levelTimeRemaining, playersRemaining, totalPlayers,
    tables, heroRank, heroChips, averageStack, stage, isBubble, isInMoney,
    isFinalTable, payout, chipLeaders, recentEliminations,
  } = state;

  const mRatio = blinds.bb > 0
    ? (heroChips / (blinds.sb + blinds.bb + (blinds.ante || 0) * 9)).toFixed(1)
    : '∞';

  const toMoney = playersRemaining - payout.paidPlaces;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>{format.name}</div>
        <div style={s.timer}>{formatTime(levelTimeRemaining)}</div>
      </div>

      <div style={s.blinds}>
        Level {blinds.level + 1}: {formatChips(blinds.sb)}/{formatChips(blinds.bb)}
        {blinds.ante > 0 ? ` (ante ${formatChips(blinds.ante)})` : ''}
      </div>

      {isBubble && (
        <div style={s.bubble}>BUBBLE — {toMoney} from the money!</div>
      )}
      {isInMoney && !isFinalTable && (
        <div style={s.inMoney}>IN THE MONEY</div>
      )}
      {isFinalTable && (
        <div style={{ ...s.inMoney, background: '#f39c12' }}>FINAL TABLE</div>
      )}

      <div style={s.grid}>
        <div style={s.stat}>
          <div style={s.statLabel}>Players</div>
          <div style={s.statValue}>{playersRemaining}/{totalPlayers}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Tables</div>
          <div style={s.statValue}>{tables}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Your Place</div>
          <div style={s.statHighlight}>#{heroRank}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>M-Ratio</div>
          <div style={s.statValue}>{mRatio}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Your Stack</div>
          <div style={s.statHighlight}>{formatChips(heroChips)}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Avg Stack</div>
          <div style={s.statValue}>{formatChips(averageStack)}</div>
        </div>
      </div>

      {/* Chip Leaders */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Chip Leaders</div>
        {chipLeaders.slice(0, 5).map((p, i) => (
          <div key={p.id} style={{ ...s.leaderRow, ...(p.isHero ? s.heroRow : {}) }}>
            <span style={s.leaderName}>
              {i + 1}. {p.emoji} {p.name} {p.isHero ? '(YOU)' : ''}
            </span>
            <span style={s.leaderChips}>{formatChips(p.chips)}</span>
          </div>
        ))}
        {heroRank > 5 && (
          <div style={{ ...s.leaderRow, ...s.heroRow }}>
            <span style={s.leaderName}>#{heroRank}. 🎯 Hero (YOU)</span>
            <span style={s.leaderChips}>{formatChips(heroChips)}</span>
          </div>
        )}
      </div>

      {/* Payouts */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Payouts (top {payout.paidPlaces})</div>
        <div style={s.payoutList}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{i === 1 ? '1st' : i === 2 ? '2nd' : '3rd'}</span>
              <span style={{ color: '#ffd700' }}>{formatPayout(payout.payouts[i] || 0)}</span>
            </div>
          ))}
          {!isInMoney && (
            <div style={{ color: '#e74c3c', marginTop: '4px', fontSize: '11px' }}>
              Money in {toMoney > 0 ? toMoney : 0} more eliminations
            </div>
          )}
        </div>
      </div>

      {/* Recent Eliminations */}
      {recentEliminations.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Recent Eliminations</div>
          {recentEliminations.map((p, i) => (
            <div key={p.id} style={s.elimRow}>
              #{p.finishPosition} {p.emoji} {p.name}
            </div>
          ))}
        </div>
      )}

      {onBackToTable && (
        <button
          onClick={onBackToTable}
          style={{
            width: '100%', marginTop: '12px', padding: '12px',
            background: '#1a5c3a', border: 'none', borderRadius: '10px',
            color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Back to Table
        </button>
      )}
    </div>
  );
}
