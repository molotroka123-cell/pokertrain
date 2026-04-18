// Leaderboard.jsx — Community leaderboard with simulated + real player stats
import React, { useState, useEffect } from 'react';

const SIMULATED_PLAYERS = [
  { name: 'IceKing', flag: '🇷🇺', gtoScore: 82, hands: 2450, bestFinish: 1, roi: 45, vip: true },
  { name: 'SharkBait', flag: '🇺🇸', gtoScore: 78, hands: 1890, bestFinish: 1, roi: 38 },
  { name: 'NitQueen', flag: '🇩🇪', gtoScore: 76, hands: 3200, bestFinish: 2, roi: 22 },
  { name: 'AggroFish', flag: '🇬🇧', gtoScore: 71, hands: 980, bestFinish: 3, roi: 15 },
  { name: 'GTO_Wizard', flag: '🇰🇷', gtoScore: 88, hands: 5100, bestFinish: 1, roi: 62 },
  { name: 'ColdDeck', flag: '🇧🇷', gtoScore: 65, hands: 1200, bestFinish: 5, roi: -8 },
  { name: 'Solver_Pro', flag: '🇯🇵', gtoScore: 85, hands: 4300, bestFinish: 1, roi: 55 },
  { name: 'FishHunter', flag: '🇫🇷', gtoScore: 73, hands: 2100, bestFinish: 2, roi: 28 },
  { name: 'BubbleBoy', flag: '🇪🇸', gtoScore: 58, hands: 890, bestFinish: 8, roi: -15 },
  { name: 'FinalBoss', flag: '🇨🇴', gtoScore: 81, hands: 3800, bestFinish: 1, roi: 42 },
  { name: 'RiverRat', flag: '🇩🇰', gtoScore: 62, hands: 750, bestFinish: 4, roi: 5 },
  { name: 'OddsMaster', flag: '🇳🇴', gtoScore: 79, hands: 2900, bestFinish: 1, roi: 35 },
  { name: 'StackKing', flag: '🇸🇪', gtoScore: 74, hands: 1650, bestFinish: 2, roi: 20 },
  { name: 'BluffCity', flag: '🇮🇹', gtoScore: 68, hands: 1100, bestFinish: 3, roi: 12 },
  { name: 'RangeCheck', flag: '🇵🇱', gtoScore: 77, hands: 2700, bestFinish: 1, roi: 32 },
];

function getHeroStats() {
  try {
    const sessions = JSON.parse(localStorage.getItem('wsop_sessions') || '[]');
    const hands = sessions.reduce((s, ses) => s + (ses.records?.length || 0), 0);
    const wins = sessions.filter(s => s.finish === 1).length;
    const bestFinish = sessions.reduce((b, s) => Math.min(b, s.finish || 999), 999);
    const totalBuyIn = sessions.reduce((s, ses) => s + (ses.buyIn || 0), 0);
    const totalPrize = sessions.reduce((s, ses) => s + (ses.prize || 0), 0);
    const roi = totalBuyIn > 0 ? Math.round((totalPrize - totalBuyIn) / totalBuyIn * 100) : 0;
    const mistakes = sessions.reduce((s, ses) => s + (ses.records?.filter(r => r.mistakeType)?.length || 0), 0);
    const gtoScore = hands > 0 ? Math.round((1 - mistakes / Math.max(hands, 1)) * 100) : 50;
    return { hands, wins, bestFinish: bestFinish === 999 ? '-' : bestFinish, roi, gtoScore, sessions: sessions.length };
  } catch { return { hands: 0, wins: 0, bestFinish: '-', roi: 0, gtoScore: 50, sessions: 0 }; }
}

export default function Leaderboard({ onBack }) {
  const [tab, setTab] = useState('global');
  const hero = getHeroStats();
  const playerName = localStorage.getItem('pokertrain_current_profile') || 'Hero';

  const weeklyVariance = (seed) => Math.abs(((seed * 9301 + 49297) % 233280) / 233280 * 20 - 10);
  const players = tab === 'weekly'
    ? SIMULATED_PLAYERS.map((p, i) => ({ ...p, gtoScore: Math.min(99, Math.max(40, p.gtoScore + Math.round(weeklyVariance(i + 7) - 5))), hands: Math.round(p.hands * 0.08) }))
    : SIMULATED_PLAYERS;
  const allPlayers = [
    { name: playerName, flag: '⭐', gtoScore: hero.gtoScore, hands: tab === 'weekly' ? Math.round(hero.hands * 0.08) : hero.hands, bestFinish: hero.bestFinish, roi: hero.roi, isHero: true },
    ...players,
  ].sort((a, b) => b.gtoScore - a.gtoScore);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(74,200,255,0.15)',
        background: 'linear-gradient(180deg, rgba(10,16,30,0.98), rgba(6,10,16,0.95))',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4ac8ff', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>← Back</button>
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#4ac8ff', letterSpacing: '2px' }}>LEADERBOARD</div>
        <div style={{ width: '50px' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 16px' }}>
        {['global', 'weekly'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(74,200,255,0.15)' : 'rgba(10,16,30,0.6)',
            color: tab === t ? '#4ac8ff' : '#4a6a8a', fontWeight: 700, fontSize: '12px',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}>{t === 'global' ? 'All Time' : 'This Week'}</button>
        ))}
      </div>

      {/* Your rank highlight */}
      <div style={{
        margin: '0 16px 12px', padding: '14px 16px', borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(74,200,255,0.12), rgba(74,200,255,0.04))',
        border: '1px solid rgba(74,200,255,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#4a8aaa', letterSpacing: '1px' }}>YOUR RANK</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#4ac8ff' }}>
              #{allPlayers.findIndex(p => p.isHero) + 1}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>{hero.gtoScore}%</div>
            <div style={{ fontSize: '10px', color: '#4a8aaa' }}>GTO Score</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: hero.roi >= 0 ? '#22c55e' : '#ef4444' }}>{hero.roi > 0 ? '+' : ''}{hero.roi}%</div>
            <div style={{ fontSize: '10px', color: '#4a8aaa' }}>ROI</div>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px 50px 55px',
        padding: '6px 16px', fontSize: '9px', color: '#3a5a6a', fontWeight: 700, letterSpacing: '1px',
      }}>
        <div>#</div><div>PLAYER</div><div style={{ textAlign: 'right' }}>GTO</div>
        <div style={{ textAlign: 'right' }}>HANDS</div><div style={{ textAlign: 'right' }}>BEST</div>
        <div style={{ textAlign: 'right' }}>ROI</div>
      </div>

      {/* Player rows */}
      <div style={{ padding: '0 8px' }}>
        {allPlayers.map((p, idx) => (
          <div key={p.name} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px 50px 55px',
            padding: '10px 8px', borderRadius: '10px', marginBottom: '2px',
            alignItems: 'center',
            background: p.isHero ? 'rgba(74,200,255,0.08)' : idx < 3 ? 'rgba(212,175,55,0.04)' : 'transparent',
            border: p.isHero ? '1px solid rgba(74,200,255,0.2)' : '1px solid transparent',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: idx < 3 ? '#ffd700' : '#4a6a7a' }}>
              {idx < 3 ? medals[idx] : idx + 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '16px' }}>{p.flag}</span>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: p.isHero ? '#4ac8ff' : '#c0d0e0' }}>{p.name}</span>
                {p.vip && <span style={{ marginLeft: '4px', fontSize: '8px', padding: '1px 4px', borderRadius: '3px', background: '#d4af37', color: '#000', fontWeight: 800 }}>VIP</span>}
                {p.isHero && <span style={{ marginLeft: '4px', fontSize: '8px', padding: '1px 4px', borderRadius: '3px', background: '#4ac8ff', color: '#000', fontWeight: 800 }}>YOU</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 800, color: p.gtoScore >= 80 ? '#22c55e' : p.gtoScore >= 65 ? '#fbbf24' : '#ef4444' }}>{p.gtoScore}%</div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#6a8a9a' }}>{p.hands > 999 ? (p.hands / 1000).toFixed(1) + 'K' : p.hands}</div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#6a8a9a' }}>{p.bestFinish === '-' ? '-' : '#' + p.bestFinish}</div>
            <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: p.roi >= 0 ? '#22c55e' : '#ef4444' }}>{p.roi > 0 ? '+' : ''}{p.roi}%</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', color: '#2a3a4a' }}>
        Updated in real-time · {allPlayers.length} players
      </div>
    </div>
  );
}
