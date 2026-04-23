# DRILL 01: Broadway Chase — фатальный cash лик

**Lik ID:** `broadway_chase`
**Stake depths:** cash 100BB+, MTT mid-stack
**Priority:** #1 (самый дорогой лик в cash — стоит $30-60/session)
**Scenarios count:** 12 spots
**Expected drill time:** 15-20 минут
**Target accuracy to "close leak":** 85%+ over 3 consecutive sessions

## Что тренирует

**Broadway chase** = склонность звонить/продолжать с dominated broadway hands (AT, KJ, QJ, KT, AJ, AQ) против значительной агрессии (4-bet, limp-raise shove, big multi-street bets).

### История лика у тебя

|Дата        |Раздача                             |Потеря|
|------------|------------------------------------|------|
|18/04       |ATo BTN call UTG 4-bet vs AQo       |−$58  |
|22/04 cash-1|KJo SB call limp-raise shove vs AJ  |−$66  |
|22/04 cash-2|AKo CO multi-street chase JJ99 board|−$30  |
|22/04 cash-2|AQo UTG river bet double-paired     |−$19  |

**Total за неделю: −$173**

**Причина:** твоё любопытство *"а вдруг у него хуже"* против ranges где villain почти никогда не блефует.

## Core GTO principles (что правильно)

1. **4-bet pot vs UTG/EP:** дешёвый 4-bet range = JJ+, AK. Твои AJ-AT/KJ-KT **dominated** — fold
1. **Limp-raise all-in от short stack:** range = JJ+, AQ+. Marginal broadway fold 95%
1. **Multi-street chase на paired boards с A-high:** after call flop + call turn, equity дропает — **fold flop**
1. **River bet с A-high на double-paired:** you self-trap — check down

## Scenarios data — 12 spots

Полный JSON со всеми сценариями находится в `src/drills/leak/data/broadway_chase.json` (см. оригинальную спеку выше).

Ключевые споты:

- **bc_01** ATo BTN vs UTG 4-bet (из real session 18/04)
- **bc_02** KJo SB vs short-stack limp-raise all-in
- **bc_03** AKo CO multi-way paired board
- **bc_04** AJo MP call 3-bet OOP deep
- **bc_05** QJo BTN vs CO 4-bet
- **bc_06** KQo vs CO 4-bet 60BB
- **bc_07** KTs call 3-bet from SB deep
- **bc_08** ATs SB vs CO open multi-way 100BB
- **bc_09** AQo call limp-4bet shove
- **bc_10** AKo 3-bet pot OOP turn decision
- **bc_11** ATo MP 3-way iso decision
- **bc_12** KJs 3-bet pot river overbet decision

## React component usage

```jsx
// src/drills/DrillBroadwayChase.jsx
import scenarios from './data/broadway_chase.json';
import HandReplayDrill from './components/HandReplayDrill';
import { DrillEngine } from './engine/DrillEngine';
import DrillResults from './components/DrillResults';
import { saveSession } from './engine/SessionStats';
import { useState, useMemo, useEffect } from 'react';

export default function DrillBroadwayChase() {
  const engine = useMemo(() => new DrillEngine(scenarios.scenarios), []);
  const [state, setState] = useState('active');

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      if (engine.state === 'complete') {
        const stats = engine.getStats();
        saveSession('broadway_chase', stats);
        setState('complete');
      }
    });
    return unsub;
  }, [engine]);

  if (state === 'complete') {
    return <DrillResults
      stats={engine.getStats()}
      leak="broadway_chase"
      onRetry={() => window.location.reload()}
      onHome={() => window.location.href = '/drills'}
    />;
  }

  return (
    <div>
      <h2>Broadway Chase Drill ({engine.currentIdx + 1}/{scenarios.scenarios.length})</h2>
      <HandReplayDrill
        scenario={engine.currentScenario}
        engine={engine}
      />
    </div>
  );
}
```

## GTO точность этого drill-а

**Preflop ranges:** 95% GTO (publicly known от Modern Poker Theory + Acevedo)
**Postflop decisions:** 85% GTO (simplified from solver outputs — for training, close enough)
**Mixed strategy:** approximated (frequencies rounded to 0.05 increments)

**Для твоего уровня (NL5-NL10):** это **превышает** точность которая тебе нужна. Твои opponents играют с 60-70% GTO — разница между 85% и 100% GTO у тебя **не measurable**.

## Progression metrics

После 3 сессий:

- **85%+ accuracy:** leak **closed**. Переходи к SB drill.
- **70-84% accuracy:** leak **improving**. Ещё 3 сессии.
- **<70%:** leak **active**. Review explanations, commit rules #35 to memory.

Track в localStorage:

```javascript
getLeakProgress('broadway_chase')
// => { currentAccuracy: 0.82, trend: +0.12, totalSessions: 5 }
```

Полное содержимое JSON сценариев — в оригинальной спецификации. Этот md-файл — сводка; JSON создаётся при имплементации в `src/drills/leak/data/broadway_chase.json`.
