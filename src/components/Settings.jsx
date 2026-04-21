// Settings.jsx — Profile + Settings + Achievements
import React, { useState } from 'react';
import { getAchievements, getBankroll } from '../lib/achievements.js';
import { loadSessions } from '../recorder/ActionRecorder.js';
import { getDrillProgress } from '../drills/dailyPlanGenerator.js';

export default function Settings({ onBack, onPrivacy, onTerms, playerName }) {
  const [sound, setSound] = useState(localStorage.getItem('pokertrain_sound') !== 'off');
  const [vibration, setVibration] = useState(localStorage.getItem('pokertrain_vibration') !== 'off');
  const achievements = getAchievements();
  const bankroll = getBankroll();
  const sessions = loadSessions();
  const progress = getDrillProgress();
  const totalXP = parseInt(localStorage.getItem('pokertrain_total_xp') || '0', 10);
  const level = Math.floor(totalXP / 5000) + 1;

  const toggle = (key, val, setter) => { setter(val); localStorage.setItem(key, val ? 'on' : 'off'); };

  return (
    <div style={{ minHeight: '100vh', background: '#050b18', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif", padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ac8ff', letterSpacing: '1px' }}>Settings</div>
        <button onClick={onBack} style={{ padding: '8px 16px', background: 'rgba(10,20,40,0.8)', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '10px', color: '#4ac8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>← Back</button>
      </div>

      {/* Profile card */}
      <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(74,200,255,0.15)', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #0a3060, #4ac8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '2px solid rgba(74,200,255,0.4)' }}>♛</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>{playerName || 'Hero'}</div>
            <div style={{ fontSize: '11px', color: '#4a7a9a' }}>Level {level} · {totalXP.toLocaleString()} XP</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffa020' }}>${bankroll.balance?.toLocaleString()}</div>
            <div style={{ fontSize: '9px', color: '#5a6a7a' }}>Balance</div>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1px', borderRadius: '12px', overflow: 'hidden', background: '#1a2230', marginBottom: '14px' }}>
        {[
          { label: 'Sessions', val: sessions.length },
          { label: 'Drills', val: Object.keys(progress).length },
          { label: 'Peak', val: '$' + (bankroll.peak || 0).toLocaleString() },
          { label: 'Level', val: level },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 4px', textAlign: 'center', background: 'rgba(8,16,28,0.8)' }}>
            <div style={{ fontSize: '8px', color: '#4a6a7a', letterSpacing: '1px', fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#4ac8ff', marginTop: '2px' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>PREFERENCES</div>
      {[
        { label: 'Sound Effects', val: sound, set: (v) => toggle('pokertrain_sound', v, setSound) },
        { label: 'Vibration', val: vibration, set: (v) => toggle('pokertrain_vibration', v, setVibration) },
      ].map(p => (
        <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px', background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(74,200,255,0.08)', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#c0d0e0' }}>{p.label}</span>
          <div onClick={() => p.set(!p.val)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: p.val ? '#4ac8ff' : '#1a2a40', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: p.val ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      ))}

      {/* Achievements */}
      <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px', marginTop: '14px' }}>ACHIEVEMENTS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        {achievements.map(a => (
          <div key={a.id} style={{
            padding: '10px', borderRadius: '10px',
            background: a.unlocked ? 'rgba(74,200,255,0.08)' : 'rgba(8,16,28,0.5)',
            border: `1px solid ${a.unlocked ? 'rgba(74,200,255,0.25)' : 'rgba(74,200,255,0.06)'}`,
            opacity: a.unlocked ? 1 : 0.5,
          }}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{a.icon || '🏆'}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: a.unlocked ? '#4ac8ff' : '#3a5a6a' }}>{a.name}</div>
            <div style={{ fontSize: '9px', color: '#4a6a7a', marginTop: '2px' }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Legal */}
      <div style={{ fontSize: '11px', color: '#4a7a9a', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>LEGAL</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button onClick={onPrivacy} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(74,200,255,0.08)', color: '#6a8a9a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Privacy Policy</button>
        <button onClick={onTerms} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(74,200,255,0.08)', color: '#6a8a9a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Terms of Service</button>
      </div>

      {/* Version */}
      <div style={{ textAlign: 'center', padding: '20px', fontSize: '10px', color: '#2a3a4a' }}>
        IceCrown Poker Club v2.1 · Build {Date.now().toString(36).slice(-6)}
      </div>
    </div>
  );
}
