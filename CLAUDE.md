# CLAUDE.md — AI Assistant Guide for pokertrain

## Project Overview

**WSOP Poker Trainer** — a browser-based tournament poker training simulator. Emulates real WSOP/EPT/WPT tournament formats with adaptive AI opponents, decision recording, drill modes, and AI-powered post-session debrief.

## Tech Stack

- **Frontend**: React 18.3 (functional components, hooks only — no class components)
- **Build**: Vite 6 — dev server on port 3000
- **Backend**: Vercel Serverless Functions (Edge Runtime) — single endpoint at `api/claude.ts`
- **Language**: JavaScript (.js/.jsx) throughout; the only TypeScript file is `api/claude.ts`
- **Styling**: Inline CSS-in-JS (style objects) — no CSS framework, no .css files
- **State**: React `useState` — no state management library
- **Persistence**: `localStorage` via `src/lib/storage.js`
- **Deployment**: Vercel (config in `vercel.json`)
- **PWA**: Manifest in `public/manifest.json`

## Commands

```bash
npm run dev       # Start Vite dev server (port 3000)
npm run build     # Production build → dist/
npm run preview   # Serve production build locally
```

There are **no tests**, **no linter**, and **no formatter** configured.

## Repository Structure

```
src/
├── App.jsx                  # Root component — screen router (Lobby, Tournament, Drills, Stats, Coach)
├── main.jsx                 # React DOM entry point
├── tournament/              # Tournament UI + orchestration
│   ├── TournamentDirector.js    # Core: manages tables, seating, blinds, payouts, progression
│   ├── TableManager.js          # Multi-table management
│   ├── GameEngine → see engine/ # (hands dealt/played via engine)
│   ├── Controls.jsx             # Player action buttons (fold/call/raise)
│   ├── Table.jsx                # Single table rendering
│   ├── TournamentDashboard.jsx  # Multi-table overview
│   ├── OpponentHUD.jsx          # Per-opponent stats overlay
│   ├── HandLog.jsx              # In-game hand history
│   └── PayoutStructure.js       # ICM-based payout tables
├── engine/                  # Core simulation & AI (no React)
│   ├── GameEngine.js            # Hand lifecycle: deal → streets → showdown
│   ├── ai.js                    # Base AI: position/pot-odds/stack-depth decisions
│   ├── adaptiveAI.js            # Opponent modeling (VPIP, PFR, c-bet, fold-to-3bet)
│   ├── claudeAI.js              # Claude Haiku bot for HARDCORE mode (API via /api/claude)
│   ├── evaluator.js             # 7-card hand strength evaluation
│   ├── equity.js                # Pot odds, M-ratio, SPR calculations
│   ├── evEngine.js              # Board texture classification, EV estimation
│   ├── WeightedRange.js         # Hand range representation
│   ├── ranges.js                # Opening/3-bet ranges by position
│   ├── icm.js                   # Independent Chip Model calculations
│   ├── deck.js                  # Card dealing with crypto RNG
│   └── pushFoldCharts.js        # Short-stack push/fold charts
├── data/                    # Static configuration
│   ├── tournamentFormats.js     # WSOP Main, Daily, EPT, WPT, HARDCORE configs
│   ├── aiProfiles.js            # AI personalities (TAG, LAG, Nit, Maniac, etc.)
│   ├── solverDB.js              # GTO solver reference data
│   └── postflopSpots.js         # Preflop decision matrices
├── drills/                  # Training modules
│   ├── DrillMenu.jsx
│   ├── DrillShell.jsx           # Shared drill UI wrapper
│   ├── RFIDrill.jsx             # Range/Frequency/Intensity
│   ├── ThreeBetDrill.jsx        # 3-bet scenarios
│   ├── BBDefenseDrill.jsx       # Big blind defense
│   ├── PushFoldDrill.jsx        # Push/fold scenarios
│   ├── PostflopDrill.jsx        # Flop/Turn/River play
│   ├── SizingDrill.jsx          # Bet sizing optimization
│   └── PotOddsDrill.jsx        # Pot odds training
├── recorder/                # Decision tracking & analysis
│   ├── ActionRecorder.js        # Records every decision with full context + EV
│   └── autoDebrief.js           # AI-powered debrief generation
├── stats/
│   ├── Dashboard.jsx            # Session statistics view
│   └── DebriefScreen.jsx        # Post-tournament analysis + hand replay
├── replay/
│   └── HandReplay.jsx           # Hand history replay
├── coach/
│   └── Coach.jsx                # AI coaching module
├── components/
│   └── Card.jsx                 # Animated playing card component
├── lib/                     # Utilities
│   ├── storage.js               # localStorage helpers
│   ├── sounds.js                # Audio management
│   ├── themes.js                # UI theme system
│   ├── learningPath.js          # Progression tracking
│   └── mentalGame.js            # Mental game coaching
└── workers/
    └── simWorker.js             # Web Worker for heavy simulations

api/
└── claude.ts                # Vercel Edge Function — proxies Claude Haiku API calls

public/
└── manifest.json            # PWA manifest

index.html                   # Entry HTML with inline gold/felt theme CSS
vite.config.js               # Vite config (React plugin, port 3000)
vercel.json                  # Vercel deployment config
```

## Architecture & Key Concepts

### Game State Flow

```
IDLE → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → HAND_OVER → (next hand)
```

- `GameEngine.js` manages the hand lifecycle, pot/side-pot calculations, and betting rounds.
- `TournamentDirector.js` orchestrates the tournament: table assignments, blind levels, eliminations, payouts.
- Player positions: `UTG, UTG+1, MP, HJ, CO, BTN, SB, BB`.

### AI System (3 tiers)

1. **Base AI** (`ai.js`) — Position-aware decisions from hand strength, pot odds, stack depth, board texture.
2. **Adaptive AI** (`adaptiveAI.js`) — Tracks per-opponent stats (VPIP, PFR, c-bet%, fold-to-3bet) and exploits tendencies.
3. **Claude Boss Bot** (`claudeAI.js`) — Claude Haiku integration for HARDCORE mode; budget-capped (~30 API calls/game) with automatic failover to local AI.

### Decision Recording & EV Analysis

`ActionRecorder.js` records every hero decision with full context:
- Stack-aware EV calculation: `evOfCall = equity * (pot + toCall) - (1 - equity) * toCall`
- Commit ratio tracking: `toCall / myChips`
- Mistake detection with stack-relative thresholds (ignores marginal <2% stack EV spots)
- SPR-aware passivity checks (lower SPR = lower equity threshold to raise)
- ICM-adjusted bubble error detection with 1.5x chip value multiplier

### Tournament Formats

| Format | Players | Buy-in | Starting Chips |
|--------|---------|--------|----------------|
| WSOP Main Event | 500 | $10,000 | 60,000 |
| WSOP Daily Deepstack | 200 | $1,500 | 25,000 |
| EPT Main Event | 500 | €5,300 | 30,000 |
| WPT $500 | 300 | $500 | 15,000 |
| HARDCORE 6-Max | 6 | — | 20,000 (Claude AI bots) |

## Conventions

### Code Style

- **Functional components only** — no class components
- **Hooks**: `useState`, `useRef`, `useEffect`, `useCallback` — no external state library
- **Inline styles**: All styling via JS objects passed to `style={}` — no CSS files or framework
- **No TypeScript** in frontend — plain `.js`/`.jsx` (only `api/claude.ts` is TS)
- **Crypto RNG** for card dealing (`cryptoRandomFloat` in `deck.js`)
- **Modular engine**: Game logic in `src/engine/` is pure JS with no React dependencies

### File Naming

- React components: `PascalCase.jsx` (e.g., `DrillMenu.jsx`, `HandReplay.jsx`)
- Logic modules: `camelCase.js` (e.g., `adaptiveAI.js`, `evEngine.js`)
- Data/config: `camelCase.js` (e.g., `tournamentFormats.js`, `aiProfiles.js`)

### API Integration

- The Claude API proxy is at `api/claude.ts` (Vercel Edge Function)
- API key is stored as a Vercel secret — never in client code
- Client calls go to `/api/claude` which Vercel rewrites to the Edge Function
- Budget control: ~30 Claude calls per HARDCORE game with failover to local AI

### Persistence

- All client state persists in `localStorage` via `src/lib/storage.js`
- Session data stored under key `wsop_sessions` (max 50 sessions retained)
- No database, no server-side persistence

## Common Tasks

### Adding a new drill

1. Create `src/drills/YourDrill.jsx` — use `DrillShell.jsx` as the wrapper
2. Add it to `DrillMenu.jsx` route list
3. Follow existing drill patterns (see `PotOddsDrill.jsx` for a clean example)

### Adding a new tournament format

1. Add the format config to `src/data/tournamentFormats.js`
2. Define blind levels, starting chips, player count, and payout structure
3. The `TournamentDirector.js` picks it up automatically

### Modifying AI behavior

- Base decision logic: `src/engine/ai.js`
- Opponent modeling: `src/engine/adaptiveAI.js`
- AI personality profiles: `src/data/aiProfiles.js`
- Claude bot: `src/engine/claudeAI.js`

### Modifying mistake detection / EV analysis

- All logic in `src/recorder/ActionRecorder.js`
- Equity: Monte Carlo via `calculateEquity()` (3000 iter postflop, 2000 preflop) accounting for opponent count
- EV formula: `evOfCall = equity * (pot + toCall) - (1 - equity) * toCall`
- Mistake thresholds use stack-relative fractions (>2% of stack or >3bb)
- SPR thresholds for passivity: <3 SPR → 0.55, <8 SPR → 0.62, else 0.70
- GTO checks both opening ranges AND defense/3-bet ranges (via `isIn3BetRange`)
- Draw detection: flush draw, OESD, gutshot, combo, backdoor flush with estimated outs

### Decision record fields

Each `recordDecision` call produces a record with:
- `equity` — Monte Carlo equity vs N opponents
- `numOpponents` — active opponents in the hand
- `evOfCall`, `commitRatio` — stack-aware EV math
- `draws` — `{ drawType, hasFlushDraw, hasStraightDraw, hasGutshot, outs }`
- `effectiveStack`, `effectiveStackBB` — min(hero, smallest opponent)
- `betSizePotFraction` — opponent's bet as fraction of pot
- `facingAction` — `{ action, position, amount, name }` of last opponent action before hero
- `gtoAction`, `gtoMatch`, `mistakeType`, `mistakeSeverity`, `evLost`

### Debrief system

- `autoDebrief.js` generates post-session analysis
- `positionStats` — profit/winrate by position (BTN, CO, etc.)
- `sessionStats` — VPIP, PFR, AF, WTSD%, c-bet%, fold-to-cbet
- Pattern detection uses deduped records (first preflop record per hand)
- All debrief text is in Russian
