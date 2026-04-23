# PokerTrain — Drill Expansion Spec

**Версия:** 1.0
**Дата:** 24 апреля 2026
**Цель:** Расширить существующее приложение полноценными drill-ами (а-ля GTO Wizard) с точечным фокусом на 12 ликов игрока.

-----

## Что это за документы

Этот spec состоит из 6 файлов:

|Файл              |Что внутри                                   |
|------------------|---------------------------------------------|
|`README.md` (этот)|Общая архитектура + как использовать         |
|`ranges.json`     |Все preflop ranges по позициям и stack depths|
|`drills.json`     |Definitions для всех дриллов (лики + вопросы)|
|`RangeGrid.jsx`   |Visual 13×13 grid компонент                  |
|`DrillSession.jsx`|Drill runner (session logic)                 |
|`ANIMATIONS.md`   |Animation spec для feel-like-GTOW            |

-----

## Точность ranges — честный disclaimer

**Источники:**

- MTT opening ranges — Modern Poker Theory (Acevedo), public charts
- Push/Fold — Nash Equilibrium tables (ICMIZER published)
- BB defend — Upswing Poker public ranges
- 3-bet ranges — consensus из Jonathan Little, Run It Once

**Точность:**

- Preflop opens: **95-98%** (публичные charts стабильны)
- Push/Fold Nash: **98%+** (математически точны)
- BB defend: **85-90%** (зависит от opener size)
- 3-bet: **90%** (GTO mixed strategies упрощены до binary)
- Postflop principles: **70-80%** (правила, не exact freq)

**Важно:** НЕ GTO Wizard clone. Это **leak-focused trainer** с public ranges. Для твоего уровня (NL5 MTT → NL10 cash) разница с GTOW ~1-2% EV — несущественно.

-----

## Архитектура приложения

```
pokertrain/
├── src/
│   ├── data/
│   │   ├── ranges.json          ← NEW: все preflop ranges
│   │   ├── drills.json          ← NEW: definitions дриллов
│   │   └── boards.json          ← NEW: board textures для postflop
│   │
│   ├── components/
│   │   ├── drill/
│   │   │   ├── RangeGrid.jsx    ← NEW: 13x13 визуализация
│   │   │   ├── DrillSession.jsx ← NEW: session runner
│   │   │   ├── QuizCard.jsx     ← NEW: одиночный вопрос
│   │   │   ├── HandAnimator.jsx ← NEW: анимация карт
│   │   │   └── AccuracyMeter.jsx← NEW: progress UI
│   │   │
│   │   ├── Coach.jsx            ← EXISTING
│   │   ├── HandReplay.jsx       ← EXISTING: интегрировать с drill
│   │   └── ...
│   │
│   ├── engine/
│   │   ├── rangeEstimator.js    ← EXISTING: расширить
│   │   ├── drillEngine.js       ← NEW: scoring + progression
│   │   └── leakDetector.js      ← NEW: find hand in HH matching leak
│   │
│   └── utils/
│       └── rangeToGrid.js       ← NEW: конвертер range string → grid
```

-----

## Core concept — Leak-focused drills

**Отличие от GTO Wizard:** не абстрактные spots, а **твои 12 ликов** по приоритету.

### Priority list ликов

1. **Broadway chase (high priority cash)** — KJ/AT/AJ/AK call big bets dominated
1. **SB play** — structural leak по позициям
1. **Multi-way cbet discipline (leak #12)** — 3+ players постфлоп
1. **Iso sizing vs limpers** — сегодняшний лик (2x vs 4-5x)
1. **Short stack push/fold** — <15 BB ошибки
1. **BB defend** — tight vs GTO
1. **3BP OOP cbetting** — range advantage confusion
1. **Bubble over-fold** — ICM errors
1. **Set on wet board** — fold-error на draw-completing streets
1. **Paired board navigation** — trips slowplay, overpair defense
1. **River sizing (value/bluff)** — exploit E3 integration
1. **Deep stack cash play** — implied odds, 4-bet/5-bet lines

### Drill types

- **`range_select`** — визуально выделить клетки в 13×13 grid (raise/call/fold)
- **`quick_quiz`** — ситуация + 3-4 кнопки (как Trainer в GTOW)
- **`hand_replay`** — интерактивное разыгрывание real раздачи из твоих HH
- **`leak_scenario`** — constructed spot targeting конкретный leak

-----

## Session flow (как в GTOW)

```
1. Start screen:
   - Выбор leak (или "Random leak today")
   - Выбор stack depth (Short / Mid / Deep)
   - Выбор формата (Range / Quiz / Replay)
   - Количество questions (10 / 20 / 50)

2. Per question:
   - Fade-in анимация ситуации (карты, стеки, позиция)
   - Таймер (optional, 15s для quiz)
   - Выбор игрока
   - Immediate feedback (✓ correct / ✗ + explanation)
   - Показ correct range/action с color coding

3. End screen:
   - Accuracy % по leak-у
   - Сравнение с предыдущей session
   - Рекомендация next leak для drill
   - Streak counter (consecutive days)
```

-----

## Как импортировать в existing app

### Step 1: добавить JSON data

```javascript
// src/data/ranges.json — читаемый через fetch или import
import rangesData from './data/ranges.json';
import drillsData from './data/drills.json';
```

### Step 2: добавить components в routing

```javascript
// в App.jsx (или router)
import DrillSession from './components/drill/DrillSession';

// новый route
<Route path="/drill/:leakId" element={<DrillSession />} />
```

### Step 3: добавить кнопку в Coach.jsx

```javascript
// в existing Coach.jsx добавить
<button onClick={() => navigate('/drill/broadway-chase')}>
  Drill Broadway Chase
</button>
```

-----

## Integration с existing rangeEstimator.js

Твой `rangeEstimator.js` сейчас (168 строк) **уже умеет оценивать ranges**. Новая логика дополняет:

```javascript
// существующий rangeEstimator.js
export function estimateRange(position, action, stackBB) { ... }

// NEW: useExact ranges from JSON for drills
import ranges from '../data/ranges.json';

export function getExactRange(position, scenario, stackBB) {
  const depthKey = stackBB <= 15 ? 'push_fold'
                 : stackBB <= 40 ? 'short_mid'
                 : 'deep';
  return ranges[depthKey][position][scenario];
}

// Для дриллов — использовать getExactRange (точные)
// Для live-session оценки — existing estimateRange (приблизительные)
```

-----

## Леechek workflow

**Еженедельно:**

1. Загружаешь свои hand histories (GG) в app
1. `leakDetector.js` находит раздачи по каждому leak-у
1. App создаёт **personalized drill session**: "За эту неделю у тебя было 8 broadway-chase spots. Давай разберём их заново."
1. Играешь через drill → видишь **что сделал vs что было правильно**
1. Accuracy трекается per leak over time

**Это киллер-feature которого нет в GTOW.** GTOW показывает abstract spots; твой trainer — **твои реальные ошибки**.

-----

## Минимальная версия (MVP) — 1 неделя работы

**Приоритет:**

1. ✅ `ranges.json` (всё preflop data) — **сегодня** готово
1. ✅ `drills.json` (definitions) — **сегодня** готово
1. `RangeGrid.jsx` — 1-2 дня
1. `QuizCard.jsx` + `DrillSession.jsx` — 2-3 дня
1. Integration в existing app — 1 день

**Later:**

- `HandAnimator.jsx` + `ANIMATIONS.md` — полировка
- `leakDetector.js` — personalization на real HH

-----

## Следующие шаги

1. **Прочитай все 6 файлов** в этом spec
1. **Начни с `ranges.json`** — там все данные
1. **Копируй `RangeGrid.jsx`** в свой `src/components/drill/`
1. Протестируй на одном drill (broadway-chase)
1. Если работает — копируй остальное
1. Integrate с existing Coach.jsx

Если что-то не понятно по архитектуре — спроси, дам конкретные code snippets.
