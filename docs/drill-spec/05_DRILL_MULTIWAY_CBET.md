# DRILL 03: Multi-way cbet discipline — лик #12

**Lik ID:** `multiway_cbet`
**Stake depths:** cash 100BB, MTT 50BB
**Priority:** #3 (постоянный EV leak при multi-way pot-ах)
**Scenarios count:** 10 spots
**Expected drill time:** 12-15 минут
**Target accuracy:** 80%+ over 3 sessions

## Что тренирует

**Multi-way cbet discipline =** правильное решение "bet или check" когда в pot-е 3+ игроков.

**Проблема:** большинство игроков играют multi-way как heads-up, делают cbets с **marginal hands** на board-ах где range-равновесие сильно сдвинуто **против them**.

### Правила (собственное правило #34):

**В multi-way pot-ах (3+ players):**

- **Cbet:** ТОЛЬКО с TP+ value ИЛИ nuts drawing hand (OESD+FD combo)
- **Check:** с any marginal made hand, weak draws, air
- **Sizing:** smaller (33-40% pot), не large
- **Rule:** **each additional player reduces your cbet range by 30-40%**

### История лика

|Дата               |Hand                              |Потеря                   |
|-------------------|----------------------------------|-------------------------|
|19/04 Grand Micro  |AJo 4-way cbet                    |−15K chips               |
|21/04 Speedy Bounty|AJs SB multi-way overbet vs 22 set|−30,909 chips (61% stack)|
|22/04 cash-2 #16   |AJs HJ 3-way cbet miss            |−$17                     |

## Core GTO principles

### Math

- **Heads-up:** equity ~33% чтобы cbet bluff-value mix был profitable
- **3-way pot:** equity ~25% required
- **4-way pot:** equity ~20% required

**НО** pure bluff в multi-way почти никогда не работает:

- 3 villain-а = 3 шанса иметь hand
- Вероятность "кто-то" hit flop = 70-80% при 3-way pot
- Fold equity low — кто-то обязательно продолжит

### Что меняется от heads-up

|Ситуация                |Heads-up  |Multi-way (3+)|
|------------------------|----------|--------------|
|Range cbet на dry A-high|80%       |**40%**       |
|Cbet с mid pair         |60%       |**15%**       |
|Cbet с gutshot          |45%       |**15%**       |
|Cbet с A-high no pair   |40%       |**5%**        |
|Cbet с NUTS             |90% bigger|100% bigger   |

### Sizing

**Multi-way cbet size: 33% pot MAX**. Причина:

- Capped ranges у villains (они бы 3-bet с premiums)
- Small bets get more folds from weak ranges
- Не надо "protection" когда играешь only TP+

## Scenarios — 10 spots

Полный JSON находится в `src/drills/leak/data/multiway_cbet.json`.

Ключевые споты:

- **mw_01** AJo 4-way cbet miss on low board
- **mw_02** AJs 3-way TP value cbet
- **mw_03** KQs 3-way miss low board
- **mw_04** 88 5-way on Q-high
- **mw_05** AK 3-way BB defend whiff
- **mw_06** TT overpair 4-way low board
- **mw_07** QJs OESD + backdoor FD
- **mw_08** AKo TPTK 4-way value
- **mw_09** KK overpair on danger J-T-9
- **mw_10** A2s nut FD 3-way semi-bluff

## Adaptive difficulty

Engine detects consecutive mistakes и вставляет **reinforcement hands**:

```javascript
if (consecutiveMistakes >= 2) {
  // Insert reinforcement scenario (easier version)
  // Show highlighted explanation of rule #34
}
```

## Real-time display overlay

Показывать rule reminder только после первой ошибки в session:

```jsx
<div className="rule-reminder">
  <b>Rule #34:</b> multi-way 3+ players = cbet ТОЛЬКО TP+ или nuts drawing hand.
</div>
```

## GTO точность

- **Multi-way cbet decisions:** 80% (simplified from real solver)
- **Sizing recommendations:** exact (33% standard, 40% TPTK)
- **Check frequency:** approximated (rounded 0.05)

## Успех

**Before drill:** multi-way cbet rate ~70% (too high, leak active)
**After 5 sessions:** target multi-way cbet rate 35-45% (aligned with GTO)
