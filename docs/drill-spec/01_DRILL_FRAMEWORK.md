# DRILL FRAMEWORK — архитектура и интеграция

Общая архитектура для всех 3 drill-ов. Интегрируется с твоим существующим `HandReplay.jsx`.

## Обзор

Каждый drill = interactive hand replay где:

1. Показывается ситуация (позиция, stacks, action до тебя)
1. Рука dealt, улицы появляются последовательно
1. На каждом decision point — user выбирает action
1. После выбора — feedback: correct/wrong + explanation + правильный range/action
1. В конце сессии — accuracy score + weak spots

## Структура файлов в твоём проекте

```
src/
├── drills/
│   ├── engine/
│   │   ├── DrillEngine.js          ← main state machine
│   │   ├── DecisionEvaluator.js    ← compares user action to GTO
│   │   └── SessionStats.js         ← accuracy tracking
│   ├── data/
│   │   ├── broadway_chase.json     ← drill 1 scenarios
│   │   ├── sb_play.json            ← drill 2 scenarios
│   │   └── multiway_cbet.json      ← drill 3 scenarios
│   ├── components/
│   │   ├── DrillSession.jsx        ← wrapper (handles navigation)
│   │   ├── HandReplayDrill.jsx     ← extends your HandReplay
│   │   ├── DecisionPrompt.jsx      ← buttons + sliders
│   │   ├── FeedbackPanel.jsx       ← shows correct answer + explanation
│   │   └── DrillResults.jsx        ← final summary
│   └── DrillHome.jsx               ← picker
├── components/
│   └── RangeGrid.jsx               ← shared (from RANGE_GRID_COMPONENT.md)
```

## 1. DrillEngine.js — главный state machine

```javascript
/**
 * Drill state machine
 * States: 'loading' | 'presenting' | 'awaiting_decision' | 'showing_feedback' | 'complete'
 */

export class DrillEngine {
  constructor(scenarios) {
    this.scenarios = scenarios;  // array of drill scenarios
    this.currentIdx = 0;
    this.state = 'loading';
    this.currentStreet = 'preflop';  // 'preflop' | 'flop' | 'turn' | 'river'
    this.userAnswers = [];  // per-scenario user answers
    this.listeners = new Set();
  }

  get currentScenario() {
    return this.scenarios[this.currentIdx];
  }

  get currentDecision() {
    // Find the next decision point in current scenario at current street
    const decisions = this.currentScenario.decisions;
    return decisions.find(d =>
      d.street === this.currentStreet &&
      !this.userAnswers[this.currentIdx]?.[d.id]
    );
  }

  /**
   * User submits action at decision point
   * action: { type: 'fold' | 'call' | 'raise' | 'check' | 'bet', sizing?: number }
   */
  submitAction(decisionId, action) {
    const scenario = this.currentScenario;
    const decision = scenario.decisions.find(d => d.id === decisionId);

    if (!decision) return;

    // Evaluate against GTO
    const evaluation = this.evaluate(action, decision);

    // Store answer
    if (!this.userAnswers[this.currentIdx]) {
      this.userAnswers[this.currentIdx] = {};
    }
    this.userAnswers[this.currentIdx][decisionId] = {
      action,
      evaluation,
      timestamp: Date.now(),
    };

    this.state = 'showing_feedback';
    this.notify();
  }

  /**
   * Compare user action to scenario's GTO solution
   */
  evaluate(action, decision) {
    const gtoActions = decision.gto;  // {raise: 0.7, call: 0.3, fold: 0}
    const actionType = action.type;
    const gtoFreq = gtoActions[actionType] || 0;

    // Primary action (highest frequency)
    const primary = Object.entries(gtoActions).reduce((a, b) => a[1] > b[1] ? a : b);

    // Rate the action:
    // - perfect: user picked primary action OR action with frequency > 0.3
    // - acceptable: action with frequency > 0.15 (mixed strategy)
    // - mistake: action with frequency < 0.15

    let rating;
    if (gtoFreq >= 0.4 || actionType === primary[0]) rating = 'perfect';
    else if (gtoFreq >= 0.15) rating = 'acceptable';
    else rating = 'mistake';

    // For sizing: check if size within ±20% of GTO optimal
    if (action.sizing && decision.gtoSizing) {
      const sizingError = Math.abs(action.sizing - decision.gtoSizing) / decision.gtoSizing;
      if (sizingError > 0.3) rating = 'mistake';
      else if (sizingError > 0.15 && rating === 'perfect') rating = 'acceptable';
    }

    return {
      rating,  // 'perfect' | 'acceptable' | 'mistake'
      gtoFrequency: gtoFreq,
      gtoPrimary: primary[0],
      explanation: decision.explanation?.[actionType] || decision.explanation?.default,
    };
  }

  advanceStreet() {
    const streets = ['preflop', 'flop', 'turn', 'river'];
    const idx = streets.indexOf(this.currentStreet);
    if (idx < streets.length - 1) {
      this.currentStreet = streets[idx + 1];
    }
    this.state = 'presenting';
    this.notify();
  }

  nextScenario() {
    if (this.currentIdx < this.scenarios.length - 1) {
      this.currentIdx++;
      this.currentStreet = 'preflop';
      this.state = 'presenting';
    } else {
      this.state = 'complete';
    }
    this.notify();
  }

  getStats() {
    const answers = this.userAnswers.flat();
    const total = answers.reduce((sum, a) => sum + Object.keys(a || {}).length, 0);
    const ratings = { perfect: 0, acceptable: 0, mistake: 0 };

    this.userAnswers.forEach(scenAnswers => {
      Object.values(scenAnswers || {}).forEach(a => {
        ratings[a.evaluation.rating]++;
      });
    });

    return {
      total,
      ...ratings,
      accuracy: total > 0 ? (ratings.perfect + ratings.acceptable * 0.5) / total : 0,
    };
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }
}
```

## 2. Scenario data format

Каждый scenario в JSON:

```json
{
  "id": "bc_01",
  "leak": "broadway_chase",
  "title": "ATo BTN vs UTG 4-bet",
  "stack_bb": 50,
  "format": "cash",
  "hero": {
    "position": "BTN",
    "cards": "AcTh",
    "stack": 100
  },
  "villains": [
    { "position": "UTG", "stack": 100 },
    { "position": "SB", "stack": 100 },
    { "position": "BB", "stack": 100 }
  ],
  "board": {
    "flop": ["5s", "4h", "9c"],
    "turn": "2d",
    "river": "7s"
  },
  "actions_before_hero": [
    { "position": "UTG", "action": "raise", "amount": 3 }
  ],
  "decisions": [
    {
      "id": "pf_1",
      "street": "preflop",
      "pot": 4.5,
      "toCall": 3,
      "description": "UTG open 3x. What's your play with ATo on BTN?",
      "gto": { "fold": 0.6, "call": 0.35, "3bet": 0.05 },
      "gtoPrimary": "fold",
      "explanation": {
        "fold": "Correct. ATo vs UTG open is marginal in GTO. Fold most common.",
        "call": "Mixed strategy play - acceptable with position.",
        "3bet": "Not recommended. UTG range is tight, 3-bet for value means JJ+/AQs+.",
        "default": "ATo BTN vs UTG is a common leak spot. Default to fold."
      }
    },
    {
      "id": "pf_2",
      "street": "preflop",
      "pot": 16,
      "toCall": 15,
      "description": "UTG 4-bet pot! You called preflop, now 4-bet all-in for $45 more. Stack $60. Call?",
      "gto": { "fold": 0.95, "call": 0.05 },
      "gtoPrimary": "fold",
      "explanation": {
        "fold": "Correct! UTG 4-bet range = JJ+/AK. ATo has ~25% equity vs this range. Need 35%+ to call. This is your broadway chase leak - FOLD.",
        "call": "MISTAKE. This is your #1 leak. Dominated cold-call is how ATo becomes -$58.",
        "default": "Classic broadway chase spot. Fold is correct."
      }
    }
  ]
}
```

## 3. DecisionPrompt.jsx — user input

```jsx
import React, { useState } from 'react';

export default function DecisionPrompt({ decision, onSubmit, stackBB, potBB }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [sizing, setSizing] = useState(null);

  const actions = ['fold', 'check', 'call', 'raise', '3bet', 'shove'];
  const availableActions = getAvailableActions(decision);

  function handleSubmit() {
    if (!selectedAction) return;
    onSubmit({ type: selectedAction, sizing });
  }

  return (
    <div style={{ padding: 16, background: '#1a1a1a', color: 'white', borderRadius: 8 }}>
      <div style={{ marginBottom: 12, fontSize: 15 }}>{decision.description}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {availableActions.map(action => (
          <button
            key={action}
            onClick={() => setSelectedAction(action)}
            style={{
              padding: '10px 16px',
              background: selectedAction === action ? '#FFD600' : '#333',
              color: selectedAction === action ? '#000' : 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 14,
              textTransform: 'uppercase',
            }}
          >
            {action}
          </button>
        ))}
      </div>

      {(selectedAction === 'raise' || selectedAction === '3bet' || selectedAction === 'bet') && (
        <div style={{ marginTop: 12 }}>
          <label>Sizing (BB): {sizing || '—'}</label>
          <input
            type="range"
            min={decision.toCall * 2}
            max={stackBB}
            value={sizing || decision.toCall * 3}
            onChange={e => setSizing(Number(e.target.value))}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedAction}
        style={{
          marginTop: 12,
          padding: '12px 24px',
          background: '#00C853',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: selectedAction ? 'pointer' : 'not-allowed',
          opacity: selectedAction ? 1 : 0.5,
          fontSize: 15,
          fontWeight: 'bold',
          width: '100%',
        }}
      >
        Submit Decision
      </button>
    </div>
  );
}

function getAvailableActions(decision) {
  if (decision.toCall > 0) {
    return ['fold', 'call', 'raise'];
  }
  return ['check', 'bet'];
}
```

## 4. FeedbackPanel.jsx — показ результата

```jsx
import React from 'react';
import RangeGrid from '../../components/RangeGrid';

export default function FeedbackPanel({ evaluation, decision, userAction, onNext }) {
  const { rating, gtoFrequency, gtoPrimary, explanation } = evaluation;

  const ratingColors = {
    perfect: '#00C853',
    acceptable: '#FFA726',
    mistake: '#E53935',
  };

  const ratingLabels = {
    perfect: '✓ Perfect',
    acceptable: '~ Acceptable',
    mistake: '✗ Mistake',
  };

  return (
    <div style={{ padding: 16, background: '#1a1a1a', color: 'white', borderRadius: 8 }}>
      <div style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: ratingColors[rating],
        marginBottom: 8,
      }}>
        {ratingLabels[rating]}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div>You chose: <b>{userAction.type.toUpperCase()}</b></div>
        <div>GTO says: <b>{gtoPrimary.toUpperCase()}</b> ({Math.round(gtoFrequency * 100)}% of time)</div>
      </div>

      <div style={{
        padding: 12,
        background: '#2a2a2a',
        borderLeft: `4px solid ${ratingColors[rating]}`,
        marginBottom: 12,
        fontSize: 14,
        lineHeight: 1.4,
      }}>
        {explanation}
      </div>

      {decision.gtoRange && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>GTO Range for this spot:</div>
          <RangeGrid range={decision.gtoRange} selected={decision.heroHand} size="small" />
        </div>
      )}

      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: '#2962FF',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 15,
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Next Decision →
      </button>
    </div>
  );
}
```

## 5. Интеграция с существующим HandReplay.jsx

Твой `HandReplay.jsx` (137 строк) уже умеет показывать hand progression. Расширяем его:

```jsx
// src/drills/components/HandReplayDrill.jsx
import React, { useState, useEffect } from 'react';
import HandReplay from '../../components/HandReplay';  // твой existing
import DecisionPrompt from './DecisionPrompt';
import FeedbackPanel from './FeedbackPanel';

export default function HandReplayDrill({ scenario, engine }) {
  const [currentStreet, setCurrentStreet] = useState('preflop');
  const [awaitingDecision, setAwaitingDecision] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setCurrentStreet(engine.currentStreet);
      setAwaitingDecision(engine.currentDecision);
    });
    return unsubscribe;
  }, [engine]);

  function handleSubmit(action) {
    engine.submitAction(awaitingDecision.id, action);
    // engine now in 'showing_feedback' state
    const answer = engine.userAnswers[engine.currentIdx][awaitingDecision.id];
    setFeedback(answer.evaluation);
  }

  function handleNext() {
    setFeedback(null);
    if (!engine.currentDecision) {
      engine.advanceStreet();
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
      {/* Uses your existing HandReplay component to show cards and board */}
      <HandReplay
        hand={{
          hero: scenario.hero,
          villains: scenario.villains,
          board: {
            flop: currentStreet !== 'preflop' ? scenario.board.flop : null,
            turn: ['turn', 'river'].includes(currentStreet) ? scenario.board.turn : null,
            river: currentStreet === 'river' ? scenario.board.river : null,
          },
          actions: scenario.actions_before_hero,
        }}
      />

      {awaitingDecision && !feedback && (
        <DecisionPrompt
          decision={awaitingDecision}
          onSubmit={handleSubmit}
          stackBB={scenario.stack_bb}
          potBB={awaitingDecision.pot}
        />
      )}

      {feedback && (
        <FeedbackPanel
          evaluation={feedback}
          decision={awaitingDecision}
          userAction={engine.userAnswers[engine.currentIdx][awaitingDecision.id].action}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
```

## 6. DrillResults.jsx — финальный экран

```jsx
export default function DrillResults({ stats, leak, onRetry, onHome }) {
  const score = Math.round(stats.accuracy * 100);

  return (
    <div style={{ padding: 24, textAlign: 'center', color: 'white' }}>
      <h2>Drill Complete!</h2>

      <div style={{ fontSize: 48, fontWeight: 'bold', margin: '20px 0' }}>
        {score}%
      </div>

      <div style={{ fontSize: 16, marginBottom: 20 }}>
        <div style={{ color: '#00C853' }}>✓ Perfect: {stats.perfect}</div>
        <div style={{ color: '#FFA726' }}>~ Acceptable: {stats.acceptable}</div>
        <div style={{ color: '#E53935' }}>✗ Mistakes: {stats.mistake}</div>
      </div>

      {score >= 80 && <div style={{ color: '#00C853' }}>Excellent! {leak} leak closing.</div>}
      {score >= 60 && score < 80 && <div style={{ color: '#FFA726' }}>Good progress. Drill again tomorrow.</div>}
      {score < 60 && <div style={{ color: '#E53935' }}>{leak} leak still active. Review explanations carefully.</div>}

      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={onRetry}>Retry</button>
        <button onClick={onHome}>Home</button>
      </div>
    </div>
  );
}
```

## 7. localStorage — отслеживание progress-а

```javascript
// src/drills/engine/SessionStats.js

const STORAGE_KEY = 'pokertrain_drill_stats';

export function saveSession(leak, stats) {
  const history = loadHistory();
  history.push({
    leak,
    timestamp: Date.now(),
    stats,
  });
  // Keep only last 100 sessions
  if (history.length > 100) history.splice(0, history.length - 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getLeakProgress(leak) {
  const history = loadHistory().filter(s => s.leak === leak);
  if (history.length < 2) return null;

  const recent = history.slice(-5);
  const older = history.slice(-10, -5);

  const avgRecent = recent.reduce((s, x) => s + x.stats.accuracy, 0) / recent.length;
  const avgOlder = older.length
    ? older.reduce((s, x) => s + x.stats.accuracy, 0) / older.length
    : avgRecent;

  return {
    currentAccuracy: avgRecent,
    trend: avgRecent - avgOlder,  // positive = improving
    totalSessions: history.length,
  };
}
```

## Application flow

```
DrillHome.jsx
  ├─ pick drill (broadway_chase, sb_play, multiway_cbet)
  └─ → DrillSession.jsx
       ├─ load scenarios from JSON
       ├─ instantiate DrillEngine
       └─ → HandReplayDrill (per scenario)
            ├─ HandReplay (visual — using your existing component)
            ├─ DecisionPrompt (user input)
            ├─ FeedbackPanel (correct answer + RangeGrid)
            └─ advance or next scenario
       └─ → DrillResults (session complete)
            └─ saveSession() to localStorage
```

## Animation specs (GTOW-like feel)

1. **Card deal animation**: 400ms fade-in each card
1. **Board transition**: 300ms slide from left when new street
1. **Button press**: 100ms scale(0.95) then back
1. **Correct answer reveal**: 600ms expand from center
1. **Range grid fade-in**: 500ms staggered per row (50ms delay per row)
1. **Streak indicator**: pulse animation on 3+ correct in row

Используй Framer Motion или CSS transitions. Твой проект vanilla JS + React — Framer Motion will add ~40KB but much smoother. CSS transitions work fine.

## Integration checklist

- [ ] Copy RangeGrid.jsx to `src/components/`
- [ ] Create `src/drills/` folder structure
- [ ] Add DrillEngine, SessionStats classes
- [ ] Create DrillHome page with 3 drill picker cards
- [ ] Import JSON scenarios
- [ ] Add route: `/drills/:leak` to your router
- [ ] Test on mobile (your users play on phone)
- [ ] Link from main Coach.jsx UI
