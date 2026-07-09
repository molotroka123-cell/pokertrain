# V2 Audit — Dead Code, Bundle Strategy, Debt

Principal-engineer audit pass for the IceCrown Engine 2.0 rewrite.
Date: 2026-07-09. Scope: dead code removal, Vite build performance, index.html polish.
Explicitly out of scope: `src/v2/**`, `src/App.jsx`, `src/main.jsx` (owned by Agents A–D).

---

## 1. Deleted files (verified dead)

Verification method: `grep -rE` across all of `src/` for every import style
(`from './x'`, `from '../lib/x.js'`, bare name, `new Worker(new URL(...))`).
Self-references, comments, and mentions in docs/*.md do not count as live imports.

| File | Inbound imports | Proof |
|---|---|---|
| `src/lib/learningPath.js` | 0 | Only hits: its own header comment + CLAUDE.md docs |
| `src/lib/mentalGame.js` | 0 | Only hits: its own header comment + CLAUDE.md docs |
| `src/lib/playerProfiles.js` | 0 | Only hit: its own header comment |
| `src/engine/rangeEstimator.js` | 0 | Only hits: comment inside `solver.js` (line 9, a TODO note, not an import) + `docs/drill-spec/00_README.md` |
| `src/workers/simWorker.js` | 0 | Only hits: its own header + `src/data/DRILLS_IMPROVEMENT_PLAN.md` (markdown, not code). No `new Worker(...simWorker...)` anywhere |
| `src/tournament/HandLog.jsx` | 0 | The `HandLog` used at `App.jsx:2041` is a **local function defined at `App.jsx:1077`**, not an import of this file |
| `src/tournament/OpponentHUD.jsx` | 0 | Only hits: its own header + its own `export default` |

Chain-rule pass: the deleted files collectively imported only `react` and
`src/engine/ranges.js`. `ranges.js` has 8+ live importers (`ai.js`,
`GameEngine.js`, `ActionRecorder.js`, `RFIDrill.jsx`, ...) — nothing was orphaned,
so no second-round deletions.

## 2. Kept-but-suspicious files

| File | Why kept |
|---|---|
| `src/engine/solver.js` | **LIVE despite the V1 audit claim.** Dynamically imported by `src/coach/Coach.jsx:150` (`import('../engine/solver.js')` → `solveCFR`) and `src/recorder/ActionRecorder.js:603` (→ `solve`). Deleting it would break the Coach screen and mistake analysis at runtime (dynamic imports don't fail the build, so this is exactly the kind of deletion a build check would NOT catch). |
| `src/workers/cfrWorker.js` | Kept because `solver.js` is kept — instantiated at `solver.js:21` via `new Worker(new URL('../workers/cfrWorker.js', import.meta.url))`. |
| `src/engine/solverCache.js` | Kept because `solver.js` is kept — statically imported at `solver.js:13`. |

The V2_TZ audit table listed `solver.js` + `cfrWorker.js` as "не подключён / 0 импортов".
That is incorrect for the current tree; the connection is via lazy `import()`, which
plain "grep for `from`" misses. If V2 later drops the CFR coach path, all three files
(`solver.js`, `solverCache.js`, `cfrWorker.js`, ~440 lines) can be deleted together.

## 3. Duplicate hand-history parsers (documented, NOT merged)

Two independent HH parsers exist:

- `src/lib/hhParser.js` (391 lines) — GGPoker/PokerStars format; exports
  `parseHandHistory`, `analyzeRealHands`, `saveOpponentProfiles`, `loadOpponentProfiles`,
  `saveRealSession`, `loadRealSessions`. Imported by legacy screens
  `src/stats/RealAnalysis.jsx` and `src/stats/GameHistory.jsx`.
- `src/lib/handHistoryParser.js` (272 lines) — tournament .txt histories; exports
  `parseFile`. Imported by `src/drills/leak/HandHistoryScreen.jsx`.

Both are live from different screens, their APIs and storage side-effects differ,
so merging now is high-risk for zero user-visible gain. **Decision: keep both.**
Future consolidation belongs to whoever rewrites the stats screens for V2
(target: one parser module with format adapters).

## 4. Bundle strategy (vite.config.js)

Problem: V1 shipped a single ~745 KB chunk. Change: `build.rollupOptions.output.manualChunks`
(function form) + `chunkSizeWarningLimit: 900`.

| Chunk | Contents | Rationale |
|---|---|---|
| `vendor` | `node_modules/react/`, `node_modules/react-dom/` | Changes only on dependency bumps → long-lived browser cache; app-code deploys no longer invalidate it |
| `engine` | `src/engine/**` | Pure-JS game core, no React deps, most stable code in the repo; also pins the dynamically-imported `solver.js` into one predictable chunk |
| `drilldata` | `src/drills/leak/data/**` | 12 static JSON scenario packs — pure data, changes independently of code |
| default | everything else (App, screens, drills UI) | The churn-heavy remainder |

Actual build output (2026-07-09, `vite build`, 126 modules, clean):

| Asset | Size | Gzip |
|---|---|---|
| `vendor` | 142.93 kB | 45.78 kB |
| `index` (default) | 458.19 kB | 121.85 kB |
| `engine` | 76.00 kB | 23.78 kB |
| `drilldata` | 70.29 kB | 16.88 kB |
| `cfrWorker` (worker entry) | 4.43 kB | — |

No chunk exceeds the 900 kB warning limit. Next win: the `index` chunk shrinks
further once V2 scene-level `React.lazy` splitting lands (Agent D's SceneRouter).

Note on build scope: `src/v2/**` files present at build time were not yet imported
from `main.jsx`/`App.jsx`, so they are outside the module graph and neither compiled
nor bundled. Any compile errors in them will only surface once AppV2 is wired in —
that integration build is the coordinator's step, not this audit's.

## 5. index.html changes

- Google Fonts: preconnect to `fonts.googleapis.com` / `fonts.gstatic.com` +
  stylesheet for `Manrope:wght@400;500;700;800` and `Marcellus`, `display=swap`.
- `body` font-family now starts with `'Manrope'`; system stack preserved as fallback.
- `meta theme-color` and `body` background: `#050b18`/`#0a0d12` → `#05070d`.
- Branded boot loader inside `#root`: centered gold "ICECROWN" (Marcellus,
  `bootPulse` keyframe). React replaces it on mount via `root.render()` — no JS
  cleanup needed.
- All pre-existing V1 keyframes (`activeGlow`, `chipSlide`, `cardDeal`, ...),
  slider/scrollbar/button styles left intact — legacy screens still use them inside V2.

## 6. Future debt (prioritized)

1. **`App.jsx` monolith (2257 lines)** — still the root; routing via ~20 ifs, a full
   Game component and a local `HandLog` defined inline. Status: `src/main.jsx` still
   mounts V1 `App`; V2 (`src/v2/`) currently has ~7 of its planned files
   (tokens, GlobalStyles, CardV2, seatLayout, catalog, DrillHubV2, SessionShellV2) and
   no `AppV2.jsx`/`SceneRouter.jsx` yet. Decomposition happens by attrition: each V1
   screen becomes a lazy V2 scene, then the Game component is extracted, then App.jsx dies.
2. **Scene-level code-splitting** — wrap legacy screens in `React.lazy` when mounted as
   V2 scenes; this is what actually breaks up the 700 KB default chunk.
3. **CFR solver path decision** — either productize `solver.js`/`cfrWorker.js`
   (the file itself contains a WASM-migration TODO list) or remove the Coach CFR
   feature and delete all three files.
4. **HH parser consolidation** — see section 3.
5. **18 drills / 3 style generations** — migrate drills onto `v2/ui/tokens.js` + kit
   as they move into DrillHubV2; delete per-drill bespoke styling.
6. **Stale docs** — CLAUDE.md still lists `learningPath.js`, `mentalGame.js`,
   `simWorker.js`, `HandLog.jsx`, `OpponentHUD.jsx`; update after V2 integration lands.
7. **No tests/linter** — the solver.js near-miss (dynamic import invisible to grep and
   to the build) is the argument for at least an unused-export/knip pass in CI.
