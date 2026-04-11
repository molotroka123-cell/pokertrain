# POKERTRAIN — Implementation Checklist

## STATUS KEY: ✅ Done | ⚠️ Partial | ❌ Not Done

---

## PHASE 1: CRITICAL BUGS

- [x] BUG-1: Draw detection (detectDraws + classifyMadeHand)
- [x] BUG-2: WTSD fix (exclude postflop folds from denominator)
- [x] BUG-3: AF dedup per street (deduplicate by unique hands)
- [x] BUG-4: Dashboard VPIP/PFR dedup (matches export)
- [x] BUG-5: Stage analysis filtered by tournament format
- [x] BUG-6: isAggressor/didCbetFlop/didBetTurn verified in GameEngine

## PHASE 2: NEW GAME MODES

- [x] FEAT-1: Cash game mode (NL2-NL25, fixed blinds in FORMATS)
- [x] FEAT-2: Fish-heavy field distribution (micro/low/mid/high)
- [ ] FEAT-3: Live poker tells trainer (text hints during play)

## PHASE 3: AI IMPROVEMENTS

- [x] AI-1: handInfo struct (madeHand, drawType, drawOuts, kicker, blockers)
- [x] AI-2: Multiway c-bet adjustment
- [x] AI-3: River bluff frequency TAG=28% LAG=35%
- [x] AI-4: Barrel range narrowing (medium → pot control)
- [x] AI-5: Donk bet on low connected boards
- [x] AI-6: Probe bet 45%
- [x] AI-7: 4-bet/5-bet logic
- [x] AI-8: Persist exploit between sessions (loadHistoricalProfile)
- [x] AI-9: Position-specific exploitation
- [x] AI-10: Blocker awareness for bluffs
- [x] AI-11: Check-raise trap follow-through
- [x] AI-12: OOP sizing 15% bigger

## PHASE 4: RECORDING & ANALYSIS

- [x] FEAT-4: villainAction + streetActions chain
- [ ] FEAT-5: PersonalizedDrill.jsx from real mistakes
- [x] FEAT-6: Chip graph (⚠️ no EV line yet)
- [x] FEAT-7: Cross-session progress sparklines
- [x] FEAT-8: Bankroll manager (getBankroll/updateBankroll)
- [x] FEAT-9: Warmup mode button
- [x] FEAT-10: Post-hand tips + GTO overlay
- [x] FEAT-11: Tilt tracker (⚠️ basic — no vpipLast10/sizingDeviation)
- [x] FEAT-12: Hand history import (JSON + PokerStars HH)
- [x] FEAT-13: GTO Wizard export (.txt)

## PHASE 5: INTEGRATIONS

- [ ] FEAT-14: GTO Wizard study workflow
- [ ] FEAT-15: WASM Postflop solver upgrade

## PHASE 6: POLISH

- [x] FEAT-16: Opponent notes system
- [x] FEAT-17: Session planner (goal input)
- [x] FEAT-18: Bot chat messages
- [ ] FEAT-19: PWA offline (Service Worker)
- [ ] FEAT-20: Claude API deep analysis button
- [ ] FEAT-21: Personal trainer (pot odds + range reading coach, toggleable)

## OTHER FEATURES DONE

- [x] Sound integration (Web Audio)
- [x] Vibration on ALL-IN
- [x] Showdown delay 4s
- [x] Dark premium lobby
- [x] ICM bubble banner
- [x] AI exploit report in debrief
- [x] Range visualizer (13x13)
- [x] Achievement badges (12)
- [x] Leaderboard + ROI
- [x] Session comparison
- [x] Drill launcher from debrief
- [x] Chip win animation
- [x] Error heatmap (13x13)
- [x] Skill rating
- [x] BB ante support
- [x] Speed multiplier infrastructure
- [x] Error boundary (no more black screens)
- [x] Leak comparison vs NL50 reg
- [x] 3-bet/4-bet/5-bet quick buttons
- [x] Download Last/All sessions + Import

---

## NEXT TO DO (in order)

1. BUG-3: AF dedup
2. AI-9: Position-specific exploit
3. AI-11: Check-raise follow-through
4. AI-12: OOP sizing +15%
5. FEAT-1: Cash game mode
6. FEAT-3: Live tells
7. FEAT-5: Personalized drills
8. FEAT-6: EV line on graph
9. FEAT-14: GTO Wizard workflow
10. FEAT-19: PWA offline
11. FEAT-20: Claude API analysis
