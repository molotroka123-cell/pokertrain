// LobbyV2.jsx — IceCrown Engine 2.0 flagship lobby scene.
// Reads the same persistent state as the V1 Lobby (bankroll via achievements.js,
// 'pokertrain_total_xp', 'wsop_sessions', daily-visit / streak keys) and exposes
// pure navigation callbacks — all game-start side effects live in AppV2.
import React, { useState } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js';
import {
  Btn, Panel, Modal, Screen, SectionTitle, Badge, ListItem, XPBar, StatChip, useCountUp,
} from '../ui/kit.jsx';
import { GlowOrb } from '../ui/fx.jsx';
import { FORMATS } from '../../data/tournamentFormats.js';
import { CASH_FORMATS } from '../../data/cashFormats.js';
import { getBankroll } from '../../lib/achievements.js';
import { Sounds } from '../../lib/sounds.js';

function sfx(name) {
  try { const f = Sounds && Sounds[name]; if (typeof f === 'function') f.call(Sounds); } catch (e) {}
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (e) { return fallback; }
}
function readInt(key) {
  try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { return 0; }
}

const rise = (i) => ({
  animation: `ic-slide-up ${DUR.slow}ms ${EASE.out} both`,
  animationDelay: `${50 + i * 65}ms`,
});

export default function LobbyV2({
  playerName,
  onPlay, onTraining, onStats, onGTO, onLeaks, onHistory, onCoach,
  onLeaderboard, onSettings, onSwitchProfile,
  onRealAnalysis, // optional extra (wired by AppV2, safe to omit)
}) {
  const [showPlay, setShowPlay] = useState(false);

  // ─── Persistent player state (same keys as V1) ───
  const profile = readJSON('pokertrain_current_profile', null);
  const avatar = (profile && profile.avatar) || '♛';
  let bankroll = 10000;
  try { bankroll = getBankroll().balance || 0; } catch (e) {}
  const rolledBankroll = useCountUp(bankroll, 900);

  const totalXP = readInt('pokertrain_total_xp');
  const level = Math.floor(totalXP / 1000) + 1;
  const xpPct = Math.max(0, Math.min(100, Math.round((totalXP % 1000) / 10)));

  const sessCount = (readJSON('wsop_sessions', []) || []).length;
  const skill = sessCount >= 30 ? 'ADVANCED' : sessCount >= 10 ? 'INTERMEDIATE' : 'BEGINNER';
  const skillColor = sessCount >= 30 ? C.green : sessCount >= 10 ? C.orange : C.red;

  // Daily plan / reward (same keys as V1 lobby)
  const today = new Date().toDateString();
  const [claimed, setClaimed] = useState(() => {
    try { return localStorage.getItem('pokertrain_last_visit') === today; } catch (e) { return true; }
  });
  const claimReward = () => {
    try { localStorage.setItem('pokertrain_last_visit', today); } catch (e) {}
    setClaimed(true);
    sfx('win');
  };
  const streak = readInt('pokertrain_win_streak');
  const bestStreak = readInt('pokertrain_best_streak');

  const launch = (fn) => () => { sfx('click'); if (typeof fn === 'function') fn(); };
  const pick = (key) => { setShowPlay(false); sfx('click'); if (onPlay) onPlay(key); };

  // ─── Feature tiles ───
  const TILES = [
    { icon: '🎯', name: 'TRAINING', desc: '30+ drills & leak lab', tint: C.cyan, bg: 'rgba(74,200,255,0.12)', fn: onTraining },
    { icon: '📊', name: 'STATS', desc: 'Sessions & winrate', tint: C.blue, bg: 'rgba(74,141,255,0.12)', fn: onStats },
    { icon: '📐', name: 'GTO LAB', desc: 'Solver explorer', tint: C.green, bg: 'rgba(52,209,123,0.12)', fn: onGTO },
    { icon: '🔬', name: 'LEAK FINDER', desc: 'Find & plug leaks', tint: C.orange, bg: 'rgba(255,171,61,0.12)', fn: onLeaks },
    { icon: '🤖', name: 'AI COACH', desc: 'Personal debrief', tint: C.purple, bg: 'rgba(168,106,255,0.12)', fn: onCoach },
    { icon: '🕐', name: 'HISTORY', desc: 'Past games replay', tint: C.gold, bg: 'rgba(232,193,90,0.12)', fn: onHistory },
    { icon: '🏆', name: 'LEADERBOARD', desc: 'Club rankings', tint: C.goldHi, bg: 'rgba(255,233,168,0.10)', fn: onLeaderboard },
    { icon: '⚙️', name: 'SETTINGS', desc: 'Sound · themes · legal', tint: C.textDim, bg: 'rgba(139,155,176,0.10)', fn: onSettings },
  ];

  return (
    <Screen scroll pad>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <GlowOrb color={C.gold} size={380} style={{ position: 'absolute', top: -150, right: -120 }} />
        <GlowOrb color={C.cyan} size={300} style={{ position: 'absolute', top: '38%', left: -140 }} />
        <GlowOrb color={C.green} size={260} style={{ position: 'absolute', bottom: -100, right: -80 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, paddingTop: SP.lg, paddingBottom: SP.xxl }}>

        {/* ═══ Player card ═══ */}
        <div style={rise(0)}>
          <Panel glow tint="gold" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
                background: GRAD.panel, border: `1.5px solid ${C.goldDeep}`,
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 16px rgba(232,193,90,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
                  <div style={{ ...F.h3, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {playerName || 'Hero'}
                  </div>
                  <Badge color={skillColor}>{skill}</Badge>
                </div>
                <div style={{ marginTop: 6 }}>
                  <XPBar level={level} pct={xpPct} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  ...F.num, fontSize: 18, fontWeight: 800, color: C.gold,
                  textShadow: '0 0 14px rgba(232,193,90,0.35)',
                }}>
                  ${Math.round(rolledBankroll).toLocaleString()}
                </div>
                <div style={{ ...F.micro, color: C.textFaint }}>BANKROLL</div>
              </div>
              <button
                onClick={launch(onSwitchProfile)}
                aria-label="Switch profile"
                className="ic-press"
                style={{
                  width: 44, height: 44, flexShrink: 0, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}`,
                  borderRadius: R.sm, color: C.textDim, fontSize: 17,
                }}
              >⇄</button>
            </div>
          </Panel>
        </div>

        {/* ═══ HERO: PLAY ═══ */}
        <div
          className="ic-press ic-shimmer-hover"
          onClick={() => { setShowPlay(true); sfx('click'); }}
          style={{
            cursor: 'pointer', marginTop: SP.md, borderRadius: R.lg,
            position: 'relative', overflow: 'hidden',
            background: GRAD.gold, boxShadow: SH.goldGlow,
            padding: '24px 20px', minHeight: 116, boxSizing: 'border-box',
            ...rise(1),
          }}
        >
          <div style={{
            position: 'absolute', right: -18, top: -26, fontSize: 150, lineHeight: 1,
            color: 'rgba(0,0,0,0.14)', pointerEvents: 'none', userSelect: 'none',
          }}>♠</div>
          <div style={{ position: 'relative' }}>
            <div style={{
              fontFamily: F.display, fontSize: 36, letterSpacing: 5,
              color: '#241a06', textShadow: '0 1px 0 rgba(255,255,255,0.25)',
            }}>PLAY</div>
            <div style={{ ...F.micro, color: 'rgba(36,26,6,0.75)', letterSpacing: 2.5, marginTop: 4 }}>
              TOURNAMENTS · CASH · HARDCORE AI
            </div>
          </div>
          <div style={{
            position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.22)', color: '#ffe9a8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
          }}>›</div>
        </div>

        {/* ═══ Daily plan row ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: SP.sm, marginTop: SP.md, ...rise(2) }}>
          <div
            className={claimed ? undefined : 'ic-press'}
            onClick={claimed ? undefined : claimReward}
            style={{ cursor: claimed ? 'default' : 'pointer' }}
          >
            <Panel
              glow={!claimed}
              tint="gold"
              style={{ padding: 12, height: '100%', boxSizing: 'border-box', animation: claimed ? 'none' : 'ic-pulse-gold 2.2s infinite' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
                <span style={{ fontSize: 22 }}>🎁</span>
                <div>
                  <div style={{ ...F.small, fontWeight: 800, color: claimed ? C.textFaint : C.gold, letterSpacing: 1 }}>DAILY REWARD</div>
                  <div style={{ ...F.micro, color: C.textFaint, marginTop: 2, textTransform: 'none', letterSpacing: 0.3 }}>
                    {claimed ? 'Come back tomorrow' : 'Tap to claim!'}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
          <StatChip label={`STREAK · BEST ${bestStreak}`} value={streak} color={C.orange} icon="🔥" />
        </div>

        {/* ═══ Feature grid ═══ */}
        <div style={{ marginTop: SP.xl, ...rise(3) }}>
          <SectionTitle>CLUB FLOOR</SectionTitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginTop: SP.sm }}>
          {TILES.map((t, i) => (
            <div key={t.name} className="ic-press" onClick={launch(t.fn)} style={{ cursor: 'pointer', ...rise(4 + i) }}>
              <Panel style={{ padding: 14, height: '100%', boxSizing: 'border-box' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: R.sm, marginBottom: SP.sm,
                  background: t.bg, border: `1px solid ${C.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, boxShadow: `0 0 16px ${t.bg}`,
                }}>{t.icon}</div>
                <div style={{ ...F.small, fontWeight: 800, color: C.text, letterSpacing: 0.8 }}>{t.name}</div>
                <div style={{ ...F.micro, color: C.textFaint, marginTop: 3, textTransform: 'none', letterSpacing: 0.3 }}>{t.desc}</div>
              </Panel>
            </div>
          ))}
        </div>

        {/* ═══ Real hands import ═══ */}
        {typeof onRealAnalysis === 'function' && (
          <div style={{ marginTop: SP.md, ...rise(12) }}>
            <ListItem
              icon="📤"
              iconBg="rgba(74,200,255,0.12)"
              title="UPLOAD REAL GAMES"
              desc="Analyze your GGPoker / PokerStars hands"
              right={<span style={{ color: C.cyan, fontSize: 16 }}>›</span>}
              onClick={launch(onRealAnalysis)}
            />
          </div>
        )}

        <div style={{ textAlign: 'center', ...F.micro, color: C.textFaint, marginTop: SP.xxl, opacity: 0.55 }}>
          ♛ ICECROWN ENGINE 2.0 · {sessCount} SESSIONS PLAYED
        </div>
      </div>

      {/* ═══ Format picker ═══ */}
      <Modal open={showPlay} onClose={() => setShowPlay(false)} title="CHOOSE YOUR GAME">
        <SectionTitle>TOURNAMENTS</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: `${SP.sm}px 0 ${SP.lg}px` }}>
          {Object.entries(FORMATS).map(([key, f]) => (
            <ListItem
              key={key}
              icon={f.isHardcore ? '☠' : f.shotClock ? '⏱' : '🏆'}
              iconBg={f.isHardcore ? 'rgba(255,93,93,0.14)' : 'rgba(232,193,90,0.12)'}
              title={f.name}
              desc={`${f.speed || 'Regular'} · ${f.players} players · ${(f.startingChips || 0).toLocaleString()} chips`}
              badge={f.isHardcore ? 'AI PRO' : f.shotClock ? 'SHOT CLOCK' : undefined}
              right={
                <span style={{ ...F.num, fontWeight: 800, fontSize: 14, color: f.isHardcore ? C.red : C.gold }}>
                  ${(f.buyIn || 0).toLocaleString()}
                </span>
              }
              onClick={() => pick(key)}
            />
          ))}
        </div>
        <SectionTitle>CASH GAMES</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: SP.sm }}>
          {Object.entries(CASH_FORMATS).map(([key, f]) => (
            <ListItem
              key={key}
              icon={f.skin ? '🃏' : '💰'}
              iconBg={f.skin ? 'rgba(255,93,93,0.12)' : 'rgba(52,209,123,0.12)'}
              title={f.name}
              desc={`${f.playersPerTable || 6}-max cash · auto-rebuy`}
              right={
                <span style={{ ...F.num, fontWeight: 800, fontSize: 14, color: C.green }}>
                  {(f.buyIn || 0).toLocaleString()}
                </span>
              }
              onClick={() => pick(key)}
            />
          ))}
        </div>
      </Modal>
    </Screen>
  );
}
