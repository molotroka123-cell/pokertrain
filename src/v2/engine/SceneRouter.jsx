// SceneRouter.jsx — IceCrown Engine 2.0 stack-based scene router.
// Context router with push/pop slide transitions, per-scene crash isolation,
// unknown-scene fallback and browser/hardware back (popstate) support.
//
// API:
//   <SceneProvider initial="lobby"><SceneMount scenes={{ key: Component }} /></SceneProvider>
//   useScene() → { go(key, props), back(), replace(key, props), reset(key, props),
//                  current, props, canBack }
import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js';

const SceneCtx = createContext(null);

export function useScene() {
  const ctx = useContext(SceneCtx);
  if (!ctx) throw new Error('useScene() must be called inside <SceneProvider>');
  return ctx;
}

// ─── Router-owned keyframes (GlobalStyles has slide-in-right / slide-out-left;
//     the reverse "pop" direction is scene-router specific, so we own it here) ───
const CSS_ID = 'ic-scene-router-css';
function injectRouterCss() {
  try {
    if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return;
    const el = document.createElement('style');
    el.id = CSS_ID;
    el.textContent = `
@keyframes ic-scene-out-right {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(64px); }
}
@keyframes ic-scene-in-right {
  from { opacity: 0; transform: translateX(52px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ic-scene-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}`;
    document.head.appendChild(el);
  } catch (e) { /* non-fatal */ }
}

const frameId = (idx, key) => idx + ':' + key;

// ─── Provider ───
export function SceneProvider({ initial = 'lobby', children }) {
  const [stack, setStack] = useState(() => [{ key: initial, props: {} }]);
  // trans: { out: {key, props}, outId, dir: 'push'|'pop'|'replace' } | null
  const [trans, setTrans] = useState(null);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const timerRef = useRef(null);
  const popGuard = useRef(0); // popstate events we triggered ourselves
  const initialRef = useRef(initial);

  useEffect(() => {
    injectRouterCss();
    try { window.history.replaceState({ icScene: initialRef.current }, ''); } catch (e) {}
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const beginTrans = useCallback((out, outIdx, dir) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTrans({ out, outId: frameId(outIdx, out.key), dir });
    timerRef.current = setTimeout(() => setTrans(null), DUR.scene + 50);
  }, []);

  const go = useCallback((key, props = {}) => {
    const s = stackRef.current;
    const top = s[s.length - 1];
    setStack([...s, { key, props }]);
    beginTrans(top, s.length - 1, 'push');
    try { window.history.pushState({ icScene: key }, ''); } catch (e) {}
  }, [beginTrans]);

  // Pops the scene stack only (history is handled by the caller / popstate).
  const doBack = useCallback(() => {
    const s = stackRef.current;
    if (s.length <= 1) return false;
    const top = s[s.length - 1];
    setStack(s.slice(0, -1));
    beginTrans(top, s.length - 1, 'pop');
    return true;
  }, [beginTrans]);

  const back = useCallback(() => {
    if (stackRef.current.length <= 1) return;
    // Keep browser history roughly in sync; guard swallows our own popstate.
    try { popGuard.current += 1; window.history.back(); } catch (e) { popGuard.current = Math.max(0, popGuard.current - 1); }
    doBack();
  }, [doBack]);

  const replace = useCallback((key, props = {}) => {
    const s = stackRef.current;
    const top = s[s.length - 1];
    setStack([...s.slice(0, -1), { key, props }]);
    beginTrans(top, s.length - 1, 'replace');
    try { window.history.replaceState({ icScene: key }, ''); } catch (e) {}
  }, [beginTrans]);

  const reset = useCallback((key, props = {}) => {
    const s = stackRef.current;
    const top = s[s.length - 1];
    setStack([{ key, props }]);
    beginTrans(top, s.length - 1, 'replace');
    try { window.history.replaceState({ icScene: key }, ''); } catch (e) {}
  }, [beginTrans]);

  // Hardware / browser back button
  useEffect(() => {
    const onPop = () => {
      try {
        if (popGuard.current > 0) { popGuard.current -= 1; return; }
        doBack();
      } catch (e) { /* never crash on navigation */ }
    };
    try { window.addEventListener('popstate', onPop); } catch (e) {}
    return () => { try { window.removeEventListener('popstate', onPop); } catch (e) {} };
  }, [doBack]);

  const top = stack[stack.length - 1];
  const value = useMemo(() => ({
    go, back, replace, reset,
    current: top.key,
    props: top.props || {},
    canBack: stack.length > 1,
    initial: initialRef.current,
    // internal (used by SceneMount)
    __stack: stack,
    __trans: trans,
  }), [go, back, replace, reset, top, stack, trans]);

  return <SceneCtx.Provider value={value}>{children}</SceneCtx.Provider>;
}

// ─── Crash isolation per scene ───
class SceneBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error('[SceneRouter] scene "' + this.props.sceneKey + '" crashed:', err, info); } catch (e) {}
  }
  render() {
    if (this.state.err) {
      return (
        <ScenePanic
          icon="⚠"
          title="SCENE ERROR"
          message={String(this.state.err && this.state.err.message ? this.state.err.message : this.state.err)}
          actionLabel="Back to Lobby"
          onAction={() => { this.setState({ err: null }); if (this.props.onHome) this.props.onHome(); }}
        />
      );
    }
    return this.props.children;
  }
}

// Shared fallback panel (crash + unknown scene). Pure tokens, no kit dependency,
// so the router keeps working even if the UI kit itself is what crashed.
function ScenePanic({ icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: GRAD.sceneBg, fontFamily: F.family, padding: SP.xl,
    }}>
      <div style={{
        maxWidth: 380, width: '100%', textAlign: 'center',
        background: GRAD.panel, border: `1px solid ${C.lineHi}`,
        borderRadius: R.lg, boxShadow: SH.panel, padding: SP.xxl,
        animation: `ic-scene-fade ${DUR.base}ms ${EASE.out} both`,
      }}>
        <div style={{ fontSize: 40, marginBottom: SP.md }}>{icon}</div>
        <div style={{ ...F.h2, color: C.text, marginBottom: SP.sm, letterSpacing: 1.5 }}>{title}</div>
        <div style={{ ...F.body, color: C.textDim, marginBottom: SP.xl, wordBreak: 'break-word' }}>{message}</div>
        <button
          onClick={onAction}
          style={{
            minHeight: 46, padding: '0 26px', border: 'none', cursor: 'pointer',
            borderRadius: R.pill, background: GRAD.gold, color: '#241a06',
            fontFamily: F.family, fontSize: 13, fontWeight: 800, letterSpacing: 1,
            boxShadow: SH.goldGlow,
          }}
        >{actionLabel}</button>
      </div>
    </div>
  );
}

// ─── Mount ───
export function SceneMount({ scenes }) {
  const ctx = useScene();
  const { __stack: stack, __trans: trans, current, props, reset, initial } = ctx;

  const topIdx = stack.length - 1;
  const topId = frameId(topIdx, current);
  const goHome = () => reset(initial);

  const frames = [];
  // Incoming / resting top scene
  frames.push({
    id: topId,
    key: current,
    props,
    z: trans && trans.dir === 'pop' ? 1 : 2,
    ghost: false,
    anim: !trans ? 'none'
      : trans.dir === 'push' ? `ic-scene-in-right ${DUR.scene}ms ${EASE.out} both`
      : trans.dir === 'replace' ? `ic-scene-fade ${DUR.scene}ms ${EASE.out} both`
      : 'none', // pop: the revealed scene sits still underneath
  });
  // Outgoing scene during a transition (same frame id it had while on top → no remount)
  if (trans && trans.out && trans.outId !== topId) {
    frames.push({
      id: trans.outId,
      key: trans.out.key,
      props: trans.out.props || {},
      z: trans.dir === 'pop' ? 3 : 1,
      ghost: true,
      anim: trans.dir === 'pop' ? `ic-scene-out-right ${DUR.scene}ms ${EASE.out} both` : 'none',
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: C.bg, color: C.text, fontFamily: F.family,
    }}>
      {frames.map((f) => {
        const Comp = scenes ? scenes[f.key] : null;
        return (
          <div
            key={f.id}
            style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              background: C.bg,
              zIndex: f.z,
              animation: f.anim,
              pointerEvents: f.ghost ? 'none' : 'auto',
              willChange: f.anim !== 'none' ? 'transform, opacity' : 'auto',
            }}
          >
            <SceneBoundary sceneKey={f.key} onHome={goHome}>
              {Comp
                ? <Comp {...(f.props || {})} />
                : <ScenePanic
                    icon="🃏"
                    title="UNKNOWN SCENE"
                    message={`No scene is registered for key "${f.key}".`}
                    actionLabel={`Back to ${initial}`}
                    onAction={goHome}
                  />}
            </SceneBoundary>
          </div>
        );
      })}
    </div>
  );
}
