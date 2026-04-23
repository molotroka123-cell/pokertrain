# DRILL 02: SB Play — структурный лик

**Lik ID:** `sb_play`
**Stake depths:** 20 BB / 40 BB / 100 BB (all three)
**Priority:** #2 (-1.81 bb/hand — главное positional slump)
**Scenarios count:** 15 spots
**Expected drill time:** 20 минут
**Target accuracy:** 80%+ over 5 sessions

## Что тренирует

**SB =** самая слабая позиция в 6-max. OOP postflop, squeeze между BTN и BB, тяжёлые decisions preflop. Из positional анализа у тебя **−1.81 bb/hand в SB** (-82% worse than BTN).

Три ключевых SB sub-leak-а:

1. **SB open — iso vs limpers** (твоя сегодняшняя ошибка: 2x вместо 5x)
1. **SB 3-bet vs opens** (3-bet or fold doctrine)
1. **SB defend vs 3-bet / squeeze** (когда call vs fold)

## Core GTO principles

### SB open (no action in front)

**Rule:** SB почти никогда не limps. **3-bet or fold.**

Причины:

- BB has range advantage postflop (closer pot odds to defend)
- SB OOP — нельзя реализовать equity легко
- Limp invites BB squeeze

**GTO SB open range vs BB (no prior action):** ~35% рук, sizing **3x**

### SB iso vs limpers

**Sizing formula (your rule #19):**

- 0 limpers: 2.5-3x
- 1 limper: **4x**
- 2 limpers: **5x**
- 3 limpers: **6x**

**Range vs 1 limper:** чуть tighter чем SB open — top 25-30% рук (premiums + strong broadway + pocket pairs 55+)

### SB 3-bet vs open

**Stack depth key:**

- **100 BB+:** linear 3-bet с premiums + some bluff combos
- **40-60 BB:** tighter 3-bet (JJ+, AK, AQs)
- **<25 BB:** shove or fold, no 3-bet-not-allin

### SB defend vs open

**Правило:** SB defend **wider чем fold**, но **narrower чем BB**.

vs BTN 2.5x:

- **3-bet:** JJ+, AKs, AK, AQs, KQs + ~10% bluffs
- **Call:** TT-55, AJs-ATs, KJs-KTs, QJs, JTs, suited connectors
- **Fold:** everything else

## Scenarios — 15 spots

Полный JSON находится в `src/drills/leak/data/sb_play.json`.

Ключевые споты:

- **sb_01** SB open 100BB vs BB
- **sb_02** SB open 20BB push/fold
- **sb_03** SB 3-bet vs BTN premium (KK)
- **sb_04** SB 3-bet bluff vs CO (A5s)
- **sb_05** SB call vs BTN open (KTs)
- **sb_06** SB iso vs 1 limper 100BB (AQo, 4.5x)
- **sb_07** SB iso vs 2 limpers (KJo, 5.5x) — **real hand 22/04**
- **sb_08** SB defend vs BB 3-bet (AJs)
- **sb_09** SB open 15BB shove (K9s)
- **sb_10** SB 3-bet vs BTN 40BB (JJ)
- **sb_11** SB 3BP OOP flop (AK low)
- **sb_12** SB 3BP paired board (QQ)
- **sb_13** SB fold vs BTN 4-bet (TT)
- **sb_14** SB call BTN deep (98s)
- **sb_15** SB iso vs 3 limpers (66 — set mining exception)

## GTO точность

- **SB open ranges:** 92-95% (publicly charted)
- **SB 3-bet ranges:** 88-92%
- **SB iso sizing:** exact (rule-based)
- **Short stack shove ranges:** 98% (Nash)
- **Postflop SB play:** 75-85% (simplified from solver)

## Weak spot tracking

После drill-а localStorage saves:

```javascript
{
  leak: 'sb_play',
  subleaks: {
    'open': 0.85,
    'iso_sizing': 0.65,
    '3bet': 0.80,
    'defend': 0.75,
    'postflop_oop': 0.70
  }
}
```

## Real-life connection

Drill 02 scenario `sb_07` = **your actual hand from 22/04** (KJo SB 2 limpers iso 4x → limp-raise all-in → −$66). Passing this scenario in drill = proving you won't repeat the mistake.
