// OpponentHUD.jsx — Per-player HUD overlay
import React from 'react';

const s = {
  hud: {
    background: 'rgba(0, 0, 0, 0.75)',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '10px',
    color: '#c0d0e0',
    minWidth: '80px',
    backdropFilter: 'blur(4px)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '1px 0',
  },
  label: {
    color: '#6b7b8d',
  },
  value: (color) => ({
    fontWeight: 600,
    color: color || '#e0e0e0',
  }),
  style: {
    fontSize: '11px',
    fontWeight: 700,
    textAlign: 'center',
    padding: '2px 0',
    borderBottom: '1px solid #1a2230',
    marginBottom: '3px',
  },
};

function vpipColor(vpip) {
  if (vpip < 0.18) return '#2980b9'; // Tight
  if (vpip < 0.28) return '#27ae60'; // Normal
  if (vpip < 0.38) return '#f39c12'; // Loose
  return '#e74c3c'; // Very loose
}

function styleColor(style) {
  const map = {
    TAG: '#2980b9', LAG: '#e74c3c', Nit: '#6b7b8d', SemiLAG: '#f39c12',
    Maniac: '#e74c3c', STATION: '#c0392b', LIMPER: '#8e44ad',
    TILTER: '#e67e22', SCARED_MONEY: '#7f8c8d', MANIAC_FISH: '#c0392b',
  };
  return map[style] || '#8899aa';
}

export default function OpponentHUD({ player, stats }) {
  if (!player || player.isHero) return null;

  const profile = player.profile || {};
  const observed = stats || {};
  const hands = observed.hands || 0;

  return (
    <div style={s.hud}>
      <div style={{ ...s.style, color: styleColor(profile.style) }}>
        {profile.style || '?'}
      </div>

      <div style={s.row}>
        <span style={s.label}>VPIP</span>
        <span style={s.value(vpipColor(hands > 10 ? observed.vpip : profile.vpip))}>
          {((hands > 10 ? observed.vpip : profile.vpip) * 100).toFixed(0)}%
        </span>
      </div>

      <div style={s.row}>
        <span style={s.label}>PFR</span>
        <span style={s.value()}>
          {((hands > 10 ? observed.pfr : profile.pfr) * 100).toFixed(0)}%
        </span>
      </div>

      <div style={s.row}>
        <span style={s.label}>AF</span>
        <span style={s.value()}>
          {(hands > 10 ? observed.af : profile.af || 0).toFixed(1)}
        </span>
      </div>

      {hands > 0 && (
        <div style={{ ...s.row, borderTop: '1px solid #1a2230', marginTop: '2px', paddingTop: '2px' }}>
          <span style={s.label}>Hands</span>
          <span style={s.value()}>{hands}</span>
        </div>
      )}

      {player.tiltState?.isOnTilt && (
        <div style={{ color: '#e74c3c', textAlign: 'center', fontWeight: 700, marginTop: '2px' }}>
          ON TILT
        </div>
      )}
    </div>
  );
}
