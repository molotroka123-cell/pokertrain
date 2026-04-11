# AI Improvement Log

## Protocol
- Every 5 user sessions: review bot patterns, propose improvements
- Track: date, observation, change, result
- 31 improvement items planned across 5 tiers

## Session 1-8 Analysis (400+ hands)
**Date:** 2026-04-11
**Observations:**
- Bots bet same size regardless of hand (50-67% pot always)
- No fast adaptation — takes 10+ hands to exploit folds
- No fish patterns (min-raise river, limp-reraise, donk overbet)
- No merge/block bets on river
- Bot timing uniform (400-1000ms) — no tells
- All bots same "strength" — no reg vs fish contrast

**Planned Changes (31 items):**
See plan file for full list. Priority order:
1. Sizing tells → hand-dependent
2. Fast adaptation → 2-3 hands
3. Fish patterns → STATION/LIMPER quirks
4. Merge/block bets → river thin value
5. Bot timing → strength-based delays
6. RegAI class → one strong bot per table

## Changes Log
| Date | Item | Change | Files | Status |
|------|------|--------|-------|--------|
| 2026-04-11 | Plan created | 31 items across 5 tiers | plan.md | done |
