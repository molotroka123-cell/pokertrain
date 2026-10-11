# Poker Train — локальный запуск, тесты, симуляция

Только локально: без сторонних покерных сайтов, без реальных ставок, без отправки данных. Результаты тренировки
не обещают выигрыша.

## Запуск приложения
```powershell
cd <папка pokertrain>
npm install            # один раз
npm run dev            # http://localhost:3000
npm run build          # проверка production-сборки (dist/)
```
Состояние (сессии, статистика, настройки) хранится в `localStorage` браузера (`src/lib/storage.js`,
ключи `wsop_sessions`, `pokertrain_*`). Экспорт сессии — кнопка экспорта в приложении (JSON с `handSummaries`).

## Тесты движка (без браузера)
```powershell
npm test               # node --test test/  (28 тестов: сайд-поты, рейк, мин-рейз, оценщик, эквити, ICM, парсер HH, VPIP)
```

## Воспроизводимая симуляция сессии
```powershell
node tools/simulate-session.mjs --hands 300 --seed 11 --stake NL10 --out session.json
```
Один и тот же `--seed` даёт тот же файл побайтно. Файл в формате экспорта приложения; рейк кэша из
`src/data/cashFormats.js` применён (`rake`, `rakeCap`, «no flop, no drop»).

## Тренировочный отчёт (Python, Bossman BotLab)
```powershell
cd <Bossman>\apps\poker-botlab
python -m botlab report --history session.json --big-blind 10 --out out\history_report
python -m botlab report --hands 3000 --seed 11 --rake-pct 0.05 --rake-cap-bb 3 --out out\sim_report
```
В отчёте всегда: размер выборки, 95% доверительные интервалы, статус рейка, ограничения.
Статусы «принят заказчиком» и «оплачено» отчёт ставит как `NOT PROVEN`.

## Известные ограничения (см. также аудит MP21_B_POKER_CALC_AUDIT)
* Эквити считается против случайных рук, а не против диапазонов.
* Короткий all-in рейз всё ещё «переоткрывает» торги (правило re-open не реализовано).
* Десктопный «Screen Parser/Overlay» (`desktop/`) снимает экран и отправляет кадры в облачный API; для чужих
  комнат это совет в реальном времени — используйте только на собственном тренажёре.
