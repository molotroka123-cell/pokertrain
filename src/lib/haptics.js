// haptics.js — Phone vibration helpers for shot clock + events

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function safeVibrate(pattern) {
  if (!canVibrate) return false;
  try { return navigator.vibrate(pattern); } catch { return false; }
}

export const haptics = {
  tick: () => safeVibrate(8),
  warning: () => safeVibrate([40, 60, 40]),
  timeout: () => safeVibrate([150, 80, 150, 80, 300]),
  action: () => safeVibrate(20),
  win: () => safeVibrate([60, 40, 60, 40, 120]),
  bust: () => safeVibrate([200, 100, 400]),
  cancel: () => safeVibrate(0),
  supported: canVibrate,
};
