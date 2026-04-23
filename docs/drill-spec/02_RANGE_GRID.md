# RangeGrid — визуальный компонент диапазонов 13×13

Reusable компонент для отображения покерных диапазонов. Используется во всех drill-ах. GTOW-style color coding.

## Файл: `src/components/RangeGrid.jsx`

```jsx
import React from 'react';

/**
 * 13x13 range grid like GTO Wizard
 *
 * Props:
 *   range: object with hand -> action frequencies
 *     Example: { 'AA': { raise: 1.0 }, 'AKo': { raise: 0.7, call: 0.3 } }
 *   onHandClick?: (hand) => void  — optional click handler
 *   selected?: string  — highlighted hand (for drill context)
 *   size?: 'small' | 'medium' | 'large' (default: medium)
 *   showLegend?: boolean (default: true)
 */

// 13 ranks from A (top) to 2 (bottom)
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Action colors (GTO Wizard-inspired)
const ACTION_COLORS = {
  raise: '#E53935',       // red
  call: '#43A047',        // green
  fold: '#F5F5F5',        // light gray (almost white)
  '3bet': '#8E24AA',      // purple
  shove: '#FB8C00',       // orange
  limp: '#FBC02D',        // yellow
  check: '#78909C',       // blue-gray
};

const ACTION_LABELS = {
  raise: 'Raise',
  call: 'Call',
  fold: 'Fold',
  '3bet': '3-Bet',
  shove: 'All-in',
  limp: 'Limp',
  check: 'Check',
};

function handName(row, col) {
  // row, col are indices 0-12 in RANKS array
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return r1 + r2;           // pairs: AA, KK, etc.
  if (row < col) return r1 + r2 + 's';       // suited: AKs (row=A=0, col=K=1)
  return r2 + r1 + 'o';                      // offsuit: AKo (row=K=1, col=A=0)
}

/**
 * Render a single cell with action frequencies as stacked backgrounds
 */
function Cell({ hand, frequencies, onClick, isSelected, size }) {
  const actions = Object.entries(frequencies || {}).filter(([_, freq]) => freq > 0);

  // If no actions, treat as fold
  if (actions.length === 0) {
    actions.push(['fold', 1.0]);
  }

  // Create a CSS gradient with stacked action colors
  // (weighted by frequency)
  let gradient;
  if (actions.length === 1) {
    const [act] = actions[0];
    gradient = ACTION_COLORS[act] || ACTION_COLORS.fold;
  } else {
    // Stacked bars: split the cell horizontally by frequency
    let offset = 0;
    const stops = [];
    actions.forEach(([act, freq]) => {
      const color = ACTION_COLORS[act] || '#CCC';
      const start = offset * 100;
      const end = (offset + freq) * 100;
      stops.push(`${color} ${start}%`);
      stops.push(`${color} ${end}%`);
      offset += freq;
    });
    gradient = `linear-gradient(to right, ${stops.join(', ')})`;
  }

  const fontSizeMap = {
    small: '8px',
    medium: '11px',
    large: '14px',
  };

  const isPair = hand.length === 2;
  const isSuited = hand.endsWith('s');

  // Text color: white for dark backgrounds, black for light
  const dominantAction = actions.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const textColor = dominantAction === 'fold' ? '#333' : 'white';

  return (
    <div
      onClick={onClick ? () => onClick(hand) : undefined}
      style={{
        background: gradient,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSizeMap[size] || fontSizeMap.medium,
        fontWeight: isPair ? 'bold' : 'normal',
        fontStyle: isSuited ? 'italic' : 'normal',
        cursor: onClick ? 'pointer' : 'default',
        border: isSelected ? '2px solid #FFD600' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isSelected ? '0 0 8px rgba(255, 214, 0, 0.6)' : 'none',
        transition: 'transform 0.1s',
        userSelect: 'none',
        aspectRatio: '1',
      }}
      onMouseEnter={onClick ? (e) => e.currentTarget.style.transform = 'scale(1.15)' : undefined}
      onMouseLeave={onClick ? (e) => e.currentTarget.style.transform = 'scale(1)' : undefined}
    >
      {hand}
    </div>
  );
}

/**
 * Legend showing which colors mean which actions
 */
function Legend({ actionsPresent }) {
  const entries = Array.from(actionsPresent).map(action => (
    <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        background: ACTION_COLORS[action] || '#CCC',
      }} />
      <span>{ACTION_LABELS[action] || action}</span>
    </div>
  ));

  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
      {entries}
    </div>
  );
}

/**
 * Main component
 */
export default function RangeGrid({
  range = {},
  onHandClick,
  selected,
  size = 'medium',
  showLegend = true,
  title
}) {
  const actionsPresent = new Set();
  Object.values(range).forEach(freqs => {
    Object.keys(freqs || {}).forEach(a => {
      if (freqs[a] > 0) actionsPresent.add(a);
    });
  });

  return (
    <div style={{ display: 'inline-block' }}>
      {title && (
        <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>
          {title}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(13, 1fr)`,
        gap: 1,
        background: '#333',
        padding: 2,
        width: size === 'small' ? 260 : size === 'large' ? 520 : 390,
      }}>
        {RANKS.map((_, row) =>
          RANKS.map((_, col) => {
            const hand = handName(row, col);
            return (
              <Cell
                key={hand}
                hand={hand}
                frequencies={range[hand]}
                onClick={onHandClick}
                isSelected={selected === hand}
                size={size}
              />
            );
          })
        )}
      </div>
      {showLegend && actionsPresent.size > 0 && <Legend actionsPresent={actionsPresent} />}
    </div>
  );
}
```

## Usage

```jsx
import RangeGrid from './components/RangeGrid';

// Simple render
<RangeGrid
  range={{
    'AA': { raise: 1.0 },
    'AKs': { raise: 1.0 },
    'AKo': { raise: 0.7, call: 0.3 },
    'KQs': { raise: 0.5, call: 0.5 },
  }}
  title="UTG Open Range"
/>

// With selected hand highlight (during drill)
<RangeGrid
  range={currentDrillRange}
  selected="ATo"  // highlights AT offsuit in yellow border
  size="medium"
/>

// Clickable (for range selector drill format)
<RangeGrid
  range={studentSelection}
  onHandClick={(hand) => toggleHand(hand)}
  size="large"
/>
```

## Format спецификация

**Range object structure:**

```typescript
type Range = {
  [hand: string]: {
    raise?: number;   // 0..1, frequency of raising
    call?: number;    // 0..1, frequency of calling
    fold?: number;    // 0..1, frequency of folding (usually omitted)
    '3bet'?: number;
    shove?: number;
    limp?: number;
    check?: number;
  }
}

// Hand format:
// Pairs: "AA", "KK", "22"
// Suited: "AKs", "T9s"
// Offsuit: "AKo", "T9o"
```

**Frequencies должны суммироваться до 1.0** для каждого hand.

**Missing hands = 100% fold** по умолчанию.

## Примеры ranges для тестирования

См. `drills/data/ranges.json` в каждом drill-е.

## Animation для drill experience

Когда user делает выбор, highlight правильных hands:

```jsx
// In a drill component
const [userAnswer, setUserAnswer] = useState(null);
const [showAnswer, setShowAnswer] = useState(false);

function onSelectHand(hand) {
  setUserAnswer(hand);
  setShowAnswer(true);
}

// After user clicks, show correct range with animation
useEffect(() => {
  if (showAnswer) {
    // Fade in the GTO range over 500ms
    // (handle via CSS transition on RangeGrid container)
  }
}, [showAnswer]);
```
