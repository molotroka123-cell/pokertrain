# ICECROWN ENGINE 2.0 — Техническое задание (V2 Rewrite)

**Кодовое имя:** IceCrown Engine 2.0
**Цель:** Скачок уровня GTA5 → GTA6. Полностью новая архитектура рендеринга, навигации и UX поверх проверенного игрового ядра (engine/ остаётся — он чистый).

---

## Аудит V1 (что нашли)

| Проблема | Факт |
|---|---|
| Монолит | `App.jsx` = 2257 строк, роутинг на 20 if-ах, Game-компонент внутри |
| Мёртвый код | `learningPath.js`, `mentalGame.js`, `playerProfiles.js`, `solver.js`+`cfrWorker.js` (не подключён), `simWorker.js`, `rangeEstimator.js`, `HandLog.jsx`, `OpponentHUD.jsx` — 0 импортов |
| Дубли | `hhParser.js` и `handHistoryParser.js` — два парсера HH |
| UI разнобой | 18 дриллов, 3 поколения стилей, инлайн-стили без токенов |
| Нет код-сплита | 745KB один чанк |
| Таблица | Статичная, без анимаций фишек/пота, 9 фикс. позиций |

## Архитектура V2

```
src/v2/
├── AppV2.jsx                  ← новый корень (Agent D)
├── engine/
│   └── SceneRouter.jsx        ← стековый роутер сцен с анимациями (Agent D)
├── ui/
│   ├── tokens.js              ← ДИЗАЙН-ТОКЕНЫ — единый контракт (написан, НЕ МЕНЯТЬ)
│   ├── kit.jsx                ← компонент-кит (Agent A)
│   ├── fx.jsx                 ← эффекты: конфетти, частицы, каунтеры (Agent A)
│   └── GlobalStyles.jsx       ← keyframes-инжектор (Agent A)
├── table/
│   ├── TableViewV2.jsx        ← кинематографичный стол (Agent B)
│   ├── CardV2.jsx             ← карты с 3D-flip (Agent B)
│   ├── ChipStack.jsx          ← фишки с анимацией полёта (Agent B)
│   └── seatLayout.js          ← эллиптическая рассадка 2-9 мест (Agent B)
├── drills/
│   ├── DrillHubV2.jsx         ← единый хаб всех тренировок (Agent C)
│   ├── catalog.js             ← каталог 30+ дриллов по тирам (Agent C)
│   └── SessionShellV2.jsx     ← обёртка сессии: XP, комбо, тайм-атака (Agent C)
└── scenes/
    ├── LobbyV2.jsx            ← новое лобби (Agent D)
    └── ProfileSelectV2.jsx    ← выбор профиля (Agent D)
```

Легаси-экраны (stats, coach, gto, tournament...) монтируются как сцены через lazy-обёртки. Игровое ядро `src/engine/` не трогаем.

## КОНТРАКТЫ (обязательны для всех агентов)

### 1. tokens.js (готов — импортировать, не менять)
Экспорты: `C` (цвета), `GRAD` (градиенты), `SH` (тени), `R` (радиусы), `SP` (отступы), `F` (шрифты), `EASE`, `DUR`, `Z`.

### 2. kit.jsx — обязательные экспорты (Agent A реализует ровно это API)
```jsx
<Btn variant="primary|gold|danger|ghost|glass" size="sm|md|lg" full disabled onClick>{}</Btn>
<Panel glow tint="gold|cyan|red|green" style>{}</Panel>
<TopBar title subtitle onBack right={node} />
<StatChip label value color icon />
<ProgressRing pct size stroke color label />        // SVG кольцо
<Modal open onClose title>{}</Modal>
<Screen scroll pad>{}</Screen>                       // обёртка сцены max-width 520
<SectionTitle>{}</SectionTitle>
<Badge color>{}</Badge>
<ListItem icon iconBg title desc right onClick isNew badge />
<XPBar level pct />
useCountUp(target, dur) → number                     // хук анимированного счётчика
```

### 3. TableViewV2 props (Agent B реализует ровно это)
```jsx
<TableViewV2
  seats={[{ id, name, stack, bet, cards:[..]|null, folded, isHero, isTurn,
            isDealer, position:'BTN', eliminated, lastAction:'raise'|null, avatar }]}
  board={['Ah','Kd','7c']} pot={1200} stage="FLOP"
  blinds={{sb:100,bb:200,ante:25}} message="Hero wins 2,400"
  showdown={false} heroSeatIdx={0} maxSeats={9}
/>
```
Сам считает рассадку (герой всегда снизу по центру), анимирует: полёт фишек к поту, пульс активного места, flip карт, подсветку победителя.

### 4. SceneRouter API (Agent D)
```jsx
<SceneProvider initial="profiles"><SceneMount scenes={{key: Component}} /></SceneProvider>
useScene() → { go(key, props), back(), replace(key, props), current, props }
```
Переходы: slide-in для push, fade для replace, 280ms, EASE.out.

### 5. Каталог дриллов (Agent C) — тиры
- **CORE** (обучение): RFI, 3-Bet, BB Defense, Push/Fold, Pot Odds
- **LEAK LAB** (12 leak-дриллов из `src/drills/leak/`)
- **ADVANCED**: Multiway, 3BP Lines, River, Sizing, A-high Cbet, Draw Completion
- **TOOLS**: Custom Builder, Hand History Import, Progress

## Правила для агентов
1. Только React 18 + inline styles + токены. **НИКАКИХ новых npm-зависимостей.**
2. Импорт токенов: `import { C, GRAD, SH, R, SP, F, EASE, DUR, Z } from '../ui/tokens.js'`
3. Анимации — CSS transitions/keyframes (keyframes регистрирует GlobalStyles.jsx: `ic-` префикс).
4. Мобайл-фёрст: колонка ≤520px, тач-таргеты ≥44px.
5. Каждый агент пишет ТОЛЬКО свои файлы из списка выше.
6. Не запускать build (интеграция и сборка — на координаторе).
7. Хаптика/звук: `import { Sounds } from '../../lib/sounds.js'` (già есть), вызывать безопасно (try/catch внутри уже есть).

## Дизайн-язык V2 "Midnight Casino"
- Глубина: слоистые радиальные градиенты, стеклянные панели (backdrop-blur), внутренние тени
- Золото как металл: градиентное (`GRAD.gold`), не плоский #d4af37
- Движение: всё живое — счётчики тикают, кольца заполняются, карты летят, фишки скользят
- Типографика: display-заголовки с letter-spacing, tabular-nums для чисел

## Definition of Done
- `npm run build` чистый
- main.jsx монтирует AppV2
- Все экраны V1 доступны из V2-лобби
- Мёртвый код удалён
- Код-сплит: vendor/engine/scenes чанки
