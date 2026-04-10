// sounds.js — Sound effects (using Web Audio API, no external files needed)

let audioCtx = null;
let _enabled = true;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (iOS Safari requires user gesture)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!_enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* Audio not available */ }
}

function playNoise(duration, volume = 0.08) {
  if (!_enabled) return;
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) { /* Audio not available */ }
}

export const Sounds = {
  deal: () => { playTone(800, 0.08, 'sine', 0.1); setTimeout(() => playTone(900, 0.06, 'sine', 0.08), 80); },
  check: () => playTone(400, 0.1, 'triangle', 0.08),
  call: () => { playTone(600, 0.1, 'sine', 0.1); playNoise(0.05, 0.06); },
  raise: () => { playTone(700, 0.12, 'square', 0.06); setTimeout(() => playTone(900, 0.08, 'square', 0.05), 100); },
  fold: () => playNoise(0.08, 0.04),
  chips: () => { playNoise(0.06, 0.08); setTimeout(() => playNoise(0.04, 0.06), 60); },
  win: () => { playTone(523, 0.15); setTimeout(() => playTone(659, 0.15), 150); setTimeout(() => playTone(784, 0.2), 300); },
  allIn: () => { playTone(440, 0.2, 'sawtooth', 0.08); setTimeout(() => playTone(880, 0.3, 'sawtooth', 0.06), 200); },
  timer: () => playTone(1000, 0.05, 'square', 0.04),
  get enabled() { return _enabled; },
  toggle() { _enabled = !_enabled; return _enabled; },
};
