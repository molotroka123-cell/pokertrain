// ShotClock.jsx — Shot clock with haptic feedback for turbo mode
import React, { useEffect, useRef, useState } from 'react';
import { haptics } from '../lib/haptics.js';

export default function ShotClock({
  active,
  seconds = 15,
  timeBankSec = 30,
  onTimeout,
  onWarning,
  actionKey,
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [bank, setBank] = useState(timeBankSec);
  const [usingBank, setUsingBank] = useState(false);
  const warnedRef = useRef(false);
  const timedOutRef = useRef(false);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    warnedRef.current = false;
    timedOutRef.current = false;
    setRemaining(seconds);
    setUsingBank(false);
    startRef.current = Date.now();
  }, [active, actionKey, seconds]);

  useEffect(() => {
    if (!active || timedOutRef.current) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const shotLeft = Math.max(0, seconds - elapsed);
      if (shotLeft > 0) {
        setRemaining(shotLeft);
        setUsingBank(false);
        if (shotLeft <= 5 && !warnedRef.current) {
          warnedRef.current = true;
          haptics.warning();
          onWarning && onWarning();
        }
        return;
      }
      // Shot clock exhausted — eat into bank
      const bankUsed = elapsed - seconds;
      const bankLeft = Math.max(0, bank - bankUsed);
      setRemaining(bankLeft);
      setUsingBank(true);
      if (bankLeft <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        haptics.timeout();
        onTimeout && onTimeout();
      }
    }, 100);
    return () => clearInterval(id);
  }, [active, seconds, bank, onTimeout, onWarning]);

  useEffect(() => {
    if (!active && !timedOutRef.current) {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const bankUsed = Math.max(0, elapsed - seconds);
      setBank(b => Math.max(0, Math.min(timeBankSec, b - bankUsed + 3)));
    }
  }, [active, seconds, timeBankSec]);

  if (!active) return null;

  const pct = usingBank
    ? (remaining / timeBankSec) * 100
    : (remaining / seconds) * 100;

  const color = remaining <= 3
    ? '#ff3030'
    : remaining <= 5
    ? '#ff8c00'
    : usingBank
    ? '#8b5cf6'
    : '#27ae60';

  return (
    <div style={{
      position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 58px)',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 90, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 14px', borderRadius: '20px',
        background: 'rgba(5,8,12,0.85)', border: `1.5px solid ${color}`,
        boxShadow: `0 0 16px ${color}55`,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: color,
          animation: remaining <= 5 ? 'pulse 0.5s infinite' : 'none',
        }} />
        <div style={{
          fontSize: '18px', fontWeight: 900, color,
          fontVariantNumeric: 'tabular-nums', minWidth: '38px', textAlign: 'center',
        }}>
          {remaining.toFixed(1)}
        </div>
        {usingBank && (
          <div style={{ fontSize: '9px', color: '#8b5cf6', fontWeight: 700, letterSpacing: '1px' }}>
            BANK
          </div>
        )}
      </div>
      <div style={{
        width: '120px', height: '3px', borderRadius: '2px',
        background: '#1a2230', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
}
