// ProfileSelectV2.jsx — IceCrown Engine 2.0 profile picker.
// V2 re-implementation of the V1 ProfileSelect (App.jsx): same localStorage
// contract ('pokertrain_profiles' / 'pokertrain_current_profile' handled by the
// caller), same window.__playerPrefix isolation, new Midnight Casino skin.
import React, { useState } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js';
import { Btn, Panel, Modal, Screen } from '../ui/kit.jsx';
import { GlowOrb } from '../ui/fx.jsx';
import { Sounds } from '../../lib/sounds.js';

const AVATARS = ['🦁', '🦈', '🐺', '🦅', '🐉', '👑', '🃏', '🎩', '🥷', '🤖', '😎', '🔥', '❄️', '⚡', '🎯', '♠️'];

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('pokertrain_profiles') || '[]'); } catch (e) { return []; }
}

function sfx(name) {
  try { const f = Sounds && Sounds[name]; if (typeof f === 'function') f.call(Sounds); } catch (e) {}
}

const rise = (i) => ({
  animation: `ic-slide-up ${DUR.slow}ms ${EASE.out} both`,
  animationDelay: `${80 + i * 70}ms`,
});

export default function ProfileSelectV2({ onSelect }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [toDelete, setToDelete] = useState(null);

  const persist = (list) => {
    setProfiles(list);
    try { localStorage.setItem('pokertrain_profiles', JSON.stringify(list)); } catch (e) {}
  };

  const createProfile = () => {
    const n = name.trim();
    if (!n) return;
    const p = { id: 'p_' + Date.now(), name: n, avatar, createdAt: Date.now() };
    persist([...profiles, p]);
    setName('');
    setCreating(false);
    sfx('click');
  };

  const selectProfile = (p) => {
    // Same isolation contract as V1: prefix every player's storage namespace.
    try { window.__playerPrefix = p.id + '_'; } catch (e) {}
    sfx('click');
    if (onSelect) onSelect(p);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    persist(profiles.filter((x) => x.id !== toDelete.id));
    setToDelete(null);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', minHeight: 46,
    padding: '12px 14px', outline: 'none',
    background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.lineHi}`,
    borderRadius: R.sm, color: C.text, fontSize: 15, fontFamily: F.family,
  };

  return (
    <Screen scroll pad>
      {/* Ambient depth */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <GlowOrb color={C.gold} size={360} style={{ position: 'absolute', top: -140, left: -110 }} />
        <GlowOrb color={C.cyan} size={300} style={{ position: 'absolute', bottom: -110, right: -100 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, paddingBottom: SP.xxl }}>
        {/* ─── Crest ─── */}
        <div style={{ textAlign: 'center', marginTop: 52, marginBottom: 30, ...rise(0) }}>
          <div style={{
            fontSize: 56, lineHeight: 1,
            filter: 'drop-shadow(0 0 26px rgba(232,193,90,0.5))',
            animation: `ic-float 5s ${EASE.smooth} infinite`,
          }}>♛</div>
          <div style={{
            fontFamily: F.display, fontSize: 36, letterSpacing: 7, marginTop: 4,
            backgroundImage: GRAD.goldText, WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: C.gold,
          }}>ICECROWN</div>
          <div style={{ ...F.micro, color: C.textDim, letterSpacing: 4.5, marginTop: 8 }}>
            POKER CLUB · ENGINE 2.0
          </div>
        </div>

        {/* ─── Existing profiles ─── */}
        {profiles.length > 0 && (
          <div style={{ ...F.micro, color: C.textFaint, marginBottom: SP.sm, ...rise(1) }}>CHOOSE YOUR PLAYER</div>
        )}
        {profiles.map((p, i) => (
          <div
            key={p.id}
            className="ic-press"
            onClick={() => selectProfile(p)}
            style={{ cursor: 'pointer', marginBottom: SP.sm, ...rise(2 + i) }}
          >
            <Panel style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SP.md }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                  background: GRAD.panel, border: `1.5px solid ${C.goldDeep}`,
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.45), 0 0 14px rgba(232,193,90,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>{p.avatar || '♠'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...F.h3, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ ...F.small, color: C.textFaint, marginTop: 2 }}>
                    {p.createdAt ? 'Member since ' + new Date(p.createdAt).toLocaleDateString() : 'Club member'}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setToDelete(p); }}
                  aria-label={`Delete ${p.name}`}
                  style={{
                    width: 44, height: 44, flexShrink: 0, cursor: 'pointer',
                    background: 'transparent', border: 'none', borderRadius: R.sm,
                    color: C.textFaint, fontSize: 15,
                  }}
                >✕</button>
                <div style={{ color: C.gold, fontSize: 18, flexShrink: 0 }}>›</div>
              </div>
            </Panel>
          </div>
        ))}

        {profiles.length === 0 && !creating && (
          <div style={{ textAlign: 'center', color: C.textFaint, ...F.body, margin: `${SP.lg}px 0`, ...rise(1) }}>
            Create your first profile to start training
          </div>
        )}

        {/* ─── Create flow ─── */}
        <div style={{ marginTop: SP.lg, ...rise(2 + profiles.length) }}>
          {!creating ? (
            <Btn variant="gold" size="lg" full onClick={() => { setCreating(true); sfx('click'); }}>
              ＋ NEW PLAYER
            </Btn>
          ) : (
            <Panel glow tint="gold" style={{ padding: SP.lg }}>
              <div style={{ ...F.micro, color: C.gold, marginBottom: SP.sm }}>NEW PLAYER</div>
              <input
                value={name}
                autoFocus
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createProfile(); }}
                placeholder="Player name"
                style={inputStyle}
              />
              <div style={{ ...F.micro, color: C.textFaint, margin: `${SP.lg}px 0 ${SP.sm}px` }}>PICK AN AVATAR</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className="ic-press"
                    style={{
                      minHeight: 44, cursor: 'pointer', fontSize: 20,
                      borderRadius: R.sm,
                      background: a === avatar ? 'rgba(232,193,90,0.14)' : 'rgba(255,255,255,0.03)',
                      border: a === avatar ? `1.5px solid ${C.gold}` : `1px solid ${C.line}`,
                      boxShadow: a === avatar ? SH.goldGlow : 'none',
                      transition: `all ${DUR.fast}ms ${EASE.out}`,
                    }}
                  >{a}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.lg }}>
                <Btn variant="ghost" onClick={() => { setCreating(false); setName(''); }}>CANCEL</Btn>
                <Btn variant="gold" full disabled={!name.trim()} onClick={createProfile}>CREATE PLAYER</Btn>
              </div>
            </Panel>
          )}
        </div>

        <div style={{ textAlign: 'center', ...F.micro, color: C.textFaint, marginTop: SP.xxl, opacity: 0.6 }}>
          EVERY PLAYER KEEPS SEPARATE STATS · BANKROLL · XP
        </div>
      </div>

      {/* ─── Delete confirm ─── */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="DELETE PROFILE">
        <div style={{ ...F.body, color: C.textDim, marginBottom: SP.xl }}>
          Remove <span style={{ color: C.text, fontWeight: 700 }}>{toDelete ? toDelete.name : ''}</span> from
          the club? The profile disappears from this list. This cannot be undone.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          <Btn variant="danger" full onClick={confirmDelete}>DELETE PROFILE</Btn>
          <Btn variant="ghost" full onClick={() => setToDelete(null)}>KEEP PLAYER</Btn>
        </div>
      </Modal>
    </Screen>
  );
}
