# Drills Improvement Plan — 17 Items

## Current Problems (all 9 drills)
1. Binary feedback only (correct/wrong, no GTO frequencies)
2. No difficulty progression (flat throughout)
3. No timer (infinite time, unrealistic)
4. No spaced repetition (errors not revisited)
5. No connection to real sessions
6. No mixed strategy support

## 12 Improvements to Existing Drills

### 1. GTO Frequencies Instead of Binary
- Show: "GTO: call 65%, raise 25%, fold 10%"
- Score based on frequency: chose call → +90 points (65% weight)
- File: DrillShell.jsx — replace correct/wrong with frequency display

### 2. Difficulty Progression (5 Levels)
- Beginner: premium hands only (AA-JJ, AKs)
- Easy: standard opens (top 20%)
- Medium: borderline hands (suited connectors, small pairs)
- Hard: mixed strategy spots (A5s type hands)
- Expert: 3-bet/4-bet, ICM, multiway
- Unlock next level at 80%+ accuracy

### 3. Timer (15 seconds)
- Countdown bar in DrillShell
- Timeout = auto-fold, -50 points
- Fast correct = bonus points

### 4. Spaced Repetition
- Track missed hands in localStorage
- Return missed hand after 3, 10, 30 correct answers
- Key: `drill_spaced_${drillId}` in localStorage

### 5. Equity Display After Answer
- Show equity vs villain range after each decision
- "QJs vs UTG 3-bet range: 38% equity. Pot odds: 32%. This is +EV call."
- Use calculateEquity from engine/equity.js

### 6. Streak System
- Track consecutive correct answers
- 10 streak = unlock next category
- 20 streak = "on fire" badge
- Break = reset counter

### 7. Categories Within Each Drill
- RFI: separate tabs for UTG/MP/HJ/CO/BTN/SB
- PotOdds: separate by draw type (flush/straight/gutshot)
- Postflop: separate by street (flop/turn/river)

### 8. Multi-Step Drills
- Full hand: preflop → flop → turn → river
- Each street = separate decision
- Score = average across all streets

### 9. Boss Spots (1 per 20 hands)
- Hard edge cases: AKs vs UTG 4-bet, KQo vs 3-bet squeeze
- Worth 3x normal points
- Separate leaderboard

### 10. Skill Rating (0-3000)
- ELO-style: win points for correct, lose for wrong
- Harder spots = more points
- Display on stats screen

### 11. Personalized from Sessions
- Filter drills by hero's actual leaks
- "You fold to c-bet 50% — here are 20 spots where you should call"
- Pull from wsop_sessions localStorage

### 12. Text Explanations per Spot
- Each spot has 30-sec text breakdown
- "AKo vs CO 3-bet: 4-bet because you block AA/KK, have good equity..."
- Can skip explanations

## 5 New Drills

### 13. Range vs Range Drill
- Show opponent's range on 13x13 grid
- Player builds their response range by clicking cells
- Score by comparing to GTO response range

### 14. Bet Sizing Detective
- See board + opponent's bet size + action line
- Guess opponent's hand from 4 options
- Teaches sizing tells reading

### 15. ICM Drill
- Final table scenario: 6 players with different stacks
- Push/fold with ICM pressure
- Use icm.js for calculations

### 16. Multiway Drill
- 3-4 players in pot
- Tighten ranges, no bluffing multiway
- Practice positional awareness

### 17. River Decision Drill
- Only river spots
- Value bet or check, hero call or fold
- Focus on thin value + bluff-catching

## 8 Additional Improvements (items 18-25)

### 18. Adaptive Difficulty (Real-Time)
- 5 correct in a row → next hand harder (narrower range, trickier spot)
- 2 wrong in a row → next hand easier (standard spot)
- Dynamic within session, independent of fixed difficulty level
- Track `currentDifficulty` 0.0-1.0, adjust ±0.1 per answer

### 19. Solver-Backed Answers
- Connect drills to existing cfrWorker.js (src/workers/simWorker.js)
- Instead of hardcoded correct/wrong → solve each spot in real-time
- Show solver strategy: "fold 12%, call 53%, raise 35%"
- Already have solver infrastructure — wire it to DrillShell

### 20. Drill Replay
- After completing drill session → review all spots with answers
- Show: your answer vs correct, equity, EV difference
- Stored in localStorage: `drill_replay_${date}`
- "Pattern view": see all errors grouped by type

### 21. Daily Challenge
- 10 fixed spots per day (deterministic seed from date)
- Personal leaderboard by day
- Track in localStorage: `daily_challenge_${YYYY-MM-DD}`
- Compare with previous days to see improvement

### 22. Drill Bookmarks
- "Save" button on any drill spot
- Saved to localStorage: `drill_bookmarks`
- Separate "Review Bookmarks" mode to replay saved spots
- Build personal library of hard hands

### 23. Voice Mode (Web Speech API)
- Use browser's SpeechRecognition API
- Recognize: "call", "fold", "raise", "check", "all in"
- Trains speed for live poker (must say decisions aloud)
- Toggle: voice on/off in drill settings

### 24. Drill Stats Global (Cumulative)
- Per-drill lifetime stats: total attempts, accuracy %, trend
- "BB Defense: 1247 attempts, 73% accuracy, +12% this month"
- Stored in localStorage: `drill_stats_global`
- Display on Stats screen under "Training Progress"

### 25. Time Pressure Modes
- Casual: no timer (learning mode)
- Standard: 15 seconds (training)
- Hyperturbo: 5 seconds (reflex training)
- Selector at start of each drill session

## 2 Additional New Drills (items 26-27)

### 26. Hand Reading Drill
- Show full hand history (opponent's actions only, no cards)
- Player guesses opponent's range: select 5 most likely hands
- Score by overlap with actual possible holdings
- Trains reading, not math

### 27. Mistake Prevention Drill
- Pull hero's worst 10 hands from all sessions
- Replay each hand to the decision point
- Pause at mistake moment → choose again
- Goal: play correctly on 3rd attempt
- Uses wsop_sessions localStorage data

## TOTAL: 27 drill improvements
- 12 core improvements (1-12)
- 7 new drills (13-17, 26-27)
- 8 advanced features (18-25)

## Implementation Order
1. Timer + Streak (quick, applies to all drills)
2. GTO frequencies (DrillShell change)
3. Difficulty progression (per-drill config)
4. Spaced repetition (localStorage tracking)
5. Equity display (integrate equity.js)
6. New drills (13-17)

## Files to Modify
- src/drills/DrillShell.jsx — timer, streak, frequencies
- src/drills/RFIDrill.jsx — categories, difficulty levels
- src/drills/PotOddsDrill.jsx — equity display
- src/drills/PostflopDrill.jsx — multi-step
- src/drills/PushFoldDrill.jsx — ICM integration
- NEW: src/drills/RangeVsRangeDrill.jsx
- NEW: src/drills/SizingDetectiveDrill.jsx
- NEW: src/drills/RiverDrill.jsx
