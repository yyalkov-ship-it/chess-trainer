# ROUND13 Proof

## 1. Три переписанные подписи

| Урок | № | Старый текст | Новый текст | Поле ответа |
| --- | ---: | --- | --- | --- |
| alekhine-yates-1922 | 2 | Ход чёрных. Белые слишком рано сыграли e4. Как использовать положение слона g5? | Ход чёрных. Белые слишком рано сыграли e4. Как использовать перегрузку центра? | g5 |
| byrne-fischer-1956 | 1 | Ход белых. Как белым восстановить пешечную структуру после размена на c3? | Ход белых. Чёрный конь ворвался в лагерь белых. Как убрать лишнюю помеху? | c3 |
| capablanca-tartakower-1924 | 4 | Ход белых. Чёрная ладья дала шах с h3. Как белым сохранить выигрыш? | Ход белых. Чёрная ладья дала шах и осталась без прикрытия. Как белым снять угрозу? | h3 |

## 2. Механическая проверка

```text
prompts=60, unique=60
destination-field violations=0
banned-substring violations=0
template violations=0
answerSan word violations=0
side prompt violations=0
changed prompts=3: alekhine-yates-1922#2, byrne-fischer-1956#1, capablanca-tartakower-1924#4
unchanged prompts=57
protected exercise field changes=0
```

Вывод: ни в одной подписи нет поля назначения своего ответа; запрещённых подстрок нет; шаблона `сейчас N-й ход: найди продолжение` нет; `answerSan` отдельным словом нет; остальные 57 подписей совпадают с `9a37798`.

Поля `fen`, `answerSan`, `motif`, `side`, `explanation`, `sourcePly`, `sourceLine` во всех упражнениях идентичны `9a37798`. `src/App.tsx` и `scripts/verify-with-engine.ts` не имеют дифа. `themeThreshold` остаётся `{ attack: 1.5, positional: 0.8, endgame: 0.6 }`, допуск остаётся `candidate.gap <= 0.5`. Новых исключений по `game.id`, `moment.ply` или `motif` не добавлено.

`ENGINE_DEPTH=20` не запускал: `fen` и `answerSan` не менялись.

## 3. Негативная проверка валидатора

Красный TDD-прогон после добавления правила, до переписывания подписей:

```text
> chess-trainer@0.1.0 validate:content
> tsx scripts/check-board-safety.ts && tsx scripts/validate-content.ts

✓ Board safety check passed
Error: Контент alekhine-yates-1922: упражнение 2: prompt содержит поле назначения ответа «g5» отдельным токеном
```

Отдельная негативная проверка после финальных правок: временно заменил подпись `alekhine-yates-1922`, упражнение 2, на `Ход чёрных. Белые слишком рано сыграли e4. Как использовать перегрузку центра на g5?`, затем вернул обратно.

```text
> chess-trainer@0.1.0 validate:content
> tsx scripts/check-board-safety.ts && tsx scripts/validate-content.ts

✓ Board safety check passed
Error: Контент alekhine-yates-1922: упражнение 2: prompt содержит поле назначения ответа «g5» отдельным токеном
```

## 4. Диф по scripts/validate-content.ts

```diff
diff --git a/scripts/validate-content.ts b/scripts/validate-content.ts
index abf79a9..dd91cbe 100644
--- a/scripts/validate-content.ts
+++ b/scripts/validate-content.ts
@@ -29,6 +29,7 @@ if (new Set(puzzleIds).size !== puzzleIds.length) throw new Error('Пул зад
 const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
 const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
 const sanWordRegExp = (san: string) => new RegExp(`(?<![\\p{L}\\p{N}_+#=\\-])${escapeRegExp(san)}(?![\\p{L}\\p{N}_+#=\\-])`, 'u')
+const squareTokenRegExp = (square: string) => new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(square)}(?![\\p{L}\\p{N}_])`, 'iu')
 const sourceGames = new Map<string, { headers: Record<string, string>; moves: string[] }[]>()
 for (const sourceFile of readdirSync(resolve('src/content/sources')).filter((name) => name.endsWith('.pgn'))) {
   const source = readFileSync(resolve('src/content/sources', sourceFile), 'utf8')
@@ -156,7 +157,8 @@ function validate(game: Game) {
     if (bannedPromptSubstring) fail(`упражнение ${index + 1}: prompt содержит запрещённую подстроку «${bannedPromptSubstring}»`)
     if (templatePrompt.test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит шаблон «сейчас N-й ход: найди продолжение»`)
     if (sanWordRegExp(drill.answerSan).test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит answerSan «${drill.answerSan}» отдельным словом`)
-    const afterAnswer = new Chess(drill.fen); afterAnswer.move(drill.answerSan)
+    const afterAnswer = new Chess(drill.fen); const answerMove = afterAnswer.move(drill.answerSan)
+    if (squareTokenRegExp(answerMove.to).test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит поле назначения ответа «${answerMove.to}» отдельным токеном`)
     const solverPieces = afterAnswer.board().flat().filter((piece) => piece?.color === drill.side).length
     const hasImmediateMaterialThreat = afterAnswer.moves().some((san) => {
       const reply = new Chess(afterAnswer.fen()); reply.move(san)
```

## 5. Вывод гейтов

### npm run validate:content

```text
> chess-trainer@0.1.0 validate:content
> tsx scripts/check-board-safety.ts && tsx scripts/validate-content.ts

✓ Board safety check passed
✓ Алехин — Йейтс, Лондон 1922: 79 полуходов, 8 моментов, 4 упражнений
✓ Ботвинник — Капабланка, Амстердам 1938: 81 полуходов, 9 моментов, 4 упражнений
✓ Бёрн — Фишер, Нью-Йорк 1956: 82 полуходов, 10 моментов, 4 упражнений
✓ Капабланка — Тартаковер, Нью-Йорк 1924: 119 полуходов, 9 моментов, 4 упражнений
✓ Фишер — Спасский, Рейкьявик 1972: 81 полуходов, 8 моментов, 4 упражнений
✓ Карпов — Каспаров, Москва 1984: 139 полуходов, 8 моментов, 4 упражнений
✓ Карпов — Каспаров, Москва 1985: 80 полуходов, 8 моментов, 4 упражнений
✓ Каспаров — Топалов, Вейк-ан-Зее 1999: 87 полуходов, 13 моментов, 4 упражнений
✓ Ласкер — Бауэр, Амстердам 1889: 75 полуходов, 6 моментов, 4 упражнений
✓ Ласкер — Капабланка, Санкт-Петербург 1914: 83 полуходов, 11 моментов, 4 упражнений
✓ Морфи — герцог и граф, Париж 1858: 33 полуходов, 8 моментов, 4 упражнений
✓ Ротлеви — Рубинштейн, Лодзь 1907: 52 полуходов, 9 моментов, 4 упражнений
✓ Спасский — Бронштейн, Ленинград 1960: 45 полуходов, 8 моментов, 4 упражнений
✓ Стейниц — фон Барделебен, Гастингс 1895: 49 полуходов, 9 моментов, 4 упражнений
✓ Уинтер — Капабланка, Гастингс 1919: 58 полуходов, 12 моментов, 4 упражнений
```

### npm run build

```text
> chess-trainer@0.1.0 build
> tsc -b && vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 76 modules transformed.
rendering chunks...
computing gzip size...
dist/manifest.webmanifest                          0.51 kB
dist/index.html                                    0.83 kB │ gzip:   0.43 kB
dist/assets/index-Ai3vV_5F.css                    24.18 kB │ gzip:   6.47 kB
dist/assets/workbox-window.prod.es5-BBnX5xw4.js    5.75 kB │ gzip:   2.36 kB
dist/assets/index-DY1rm7MQ.js                    443.20 kB │ gzip: 124.76 kB
✓ built in 439ms

PWA v1.3.0
mode      generateSW
precache  12 entries (7608.13 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

### npm run verify:engine

```text
> chess-trainer@0.1.0 verify:engine
> tsx scripts/verify-with-engine.ts

Терминальная позиция: проверка без вызова движка пройдена
Движок: Stockfish 18 by the Stockfish developers (see AUTHORS file)
Stockfish: Threads 1, Hash 256 MB, depth 16

Алехин — Йейтс, Лондон 1922
  упражнение 1 [material]: Bxe7, отрыв 1.45, материал 3
  упражнение 2 [material]: Bxg5, отрыв 3.77, материал 3
  упражнение 3 [quiet]: Rg8, отрыв 5.60, материал 0
  упражнение 4 [quiet]: Nd7, отрыв 0.89, материал 0

Ботвинник — Капабланка, Амстердам 1938
  упражнение 1 [material]: Nxa6, отрыв 4.19, материал 3
  упражнение 2 [quiet]: Re6, отрыв 1.94, материал 0
  упражнение 3 [material]: fxe6, отрыв 5.15, материал 5
  упражнение 4 [quiet]: Kg7, отрыв 3.14, материал 0

Бёрн — Фишер, Нью-Йорк 1956
  упражнение 1 [material]: bxc3, отрыв 2.60, материал 3
  упражнение 2 [material]: Nxc3, отрыв 1.93, материал 3
  упражнение 3 [quiet]: Kg1, отрыв 1.90, материал 0
  упражнение 4 [attack]: Ne2+, отрыв 3.81, материал 0

Капабланка — Тартаковер, Нью-Йорк 1924
  упражнение 1 [quiet]: Kg5, отрыв 2.89, материал 0
  упражнение 2 [endgame]: Ke5, отрыв 3.27, материал 1
  упражнение 3 [endgame]: Kxd8, отрыв 8.70, материал 5
  упражнение 4 [material]: Kxh3, отрыв 8.63, материал 5

Фишер — Спасский, Рейкьявик 1972
  упражнение 1 [material]: exd5, отрыв 4.86, материал 3
  упражнение 2 [material]: fxe6, отрыв 4.12, материал 4
  упражнение 3 [quiet]: Rf7, отрыв 1.98, материал 3
  упражнение 4 [quiet]: Qf4, отрыв 1.51, материал 1

Карпов — Каспаров, Москва 1984
  упражнение 1 [quiet]: Na5, отрыв 0.81, материал 0
  упражнение 2 [material]: Rxc5, отрыв 1.15, материал 3
  упражнение 3 [quiet]: Nc4, отрыв 0.93, материал 0
  упражнение 4 [material]: exd4, отрыв 5.32, материал 5

Карпов — Каспаров, Москва 1985
  упражнение 1 [quiet]: a5, отрыв 1.94, материал 0
  упражнение 2 [attack]: axb4, отрыв 2.33, материал 1
  упражнение 3 [material]: Nf2+, отрыв 2.95, материал 6
  упражнение 4 [material]: Rxf2, отрыв 2.81, материал 3

Каспаров — Топалов, Вейк-ан-Зее 1999
  упражнение 1 [material]: Qxh6, отрыв 5.98, материал 3
  упражнение 2 [attack]: Qxd4+, отрыв 3.19, материал 1
  упражнение 3 [material]: Qxf6, отрыв 3.93, материал 3
  упражнение 4 [attack]: Qa1+, отрыв 4.51, материал 0

Ласкер — Бауэр, Амстердам 1889
  упражнение 1 [attack]: Qg4+, отрыв 4.34, материал 0
  упражнение 2 [material]: Qxh5+, отрыв 7.68, материал 4
  упражнение 3 [attack]: Qg4+, отрыв 2.06, материал 1
  упражнение 4 [attack]: Rh3+, отрыв 3.92, материал 0

Ласкер — Капабланка, Санкт-Петербург 1914
  упражнение 1 [material]: cxd6, отрыв 4.20, материал 3
  упражнение 2 [attack]: axb4, отрыв 2.65, материал 1
  упражнение 3 [quiet]: Kf3, отрыв 0.86, материал 1
  упражнение 4 [attack]: hxg5, отрыв 1.25, материал 1

Морфи — герцог и граф, Париж 1858
  упражнение 1 [quiet]: Rd1, отрыв 2.98, материал 5
  упражнение 2 [material]: Qxd7, отрыв 2.86, материал 3
  упражнение 3 [material]: Nxg5, отрыв 4.97, материал 9
  упражнение 4 [material]: exd4, отрыв 3.31, материал 3

Ротлеви — Рубинштейн, Лодзь 1907
  упражнение 1 [material]: Bxe5, отрыв 3.83, материал 3
  упражнение 2 [quiet]: Kh1, отрыв 2.25, материал 0
  упражнение 3 [material]: Rd2, отрыв 8.39, материал 6
  упражнение 4 [mate]: Bxe4+, отрыв 1004.19, материал 3

Спасский — Бронштейн, Ленинград 1960
  упражнение 1 [material]: fxe3, отрыв 4.37, материал 3
  упражнение 2 [material]: Qxf5, отрыв 4.78, материал 3
  упражнение 3 [material]: Nxe5+, отрыв 2.51, материал 3
  упражнение 4 [attack]: Qe4+, отрыв 2.06, материал 0

Стейниц — фон Барделебен, Гастингс 1895
  упражнение 1 [material]: Bxe7, отрыв 1.65, материал 3
  упражнение 2 [quiet]: Qg4, отрыв 3.03, материал 0
  упражнение 3 [attack]: Rf7+, отрыв 1.75, материал 0
  упражнение 4 [attack]: Rxh7+, отрыв 3.70, материал 1

Уинтер — Капабланка, Гастингс 1919
  упражнение 1 [material]: Qxf6, отрыв 2.18, материал 3
  упражнение 2 [attack]: Rxb5, отрыв 1.48, материал 1
  упражнение 3 [attack]: hxg5, отрыв 2.76, материал 1
  упражнение 4 [attack]: Rxd4, отрыв 2.91, материал 1

✓ Проверка движком пройдена
```

## 6. Что хотел поменять, но не стал из-за запретов

Ничего. Запрещённые поля упражнений, `src/App.tsx`, `scripts/verify-with-engine.ts`, `themeThreshold`, допуск `candidate.gap <= 0.5` и опровержения не требовали изменений и не были изменены.
