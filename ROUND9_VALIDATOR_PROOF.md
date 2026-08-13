# ROUND 9 — доказательство валидации

База: `5336070`. Пул не расширялся: те же 15 партий и 60 исходных FEN/`answerSan`, по
4 задачи на партию. `themeThreshold`, `Threads 1`, `Hash 256`, `scripts/engine-node.ts` и
workflow деплоя не менялись. Мотивы получены диагностическим прогоном Stockfish 18 и
механическим разбором материала/числа фигур.

## Два побайтово одинаковых прогона

Дважды подряд выполнено `npm run verify:engine`; оба запуска завершились с кодом 0,
`cmp -s` вернул 0. Оба использовали Stockfish 18, `Threads 1`, `Hash 256 MB`, depth 16.

```text
0fb600041ec45207dc71d8a760d598c1a25ed27ac1dd0636d9242212eb828e2c  round9-verify1.txt
0fb600041ec45207dc71d8a760d598c1a25ed27ac1dd0636d9242212eb828e2c  round9-verify2.txt
✓ Проверка движком пройдена
```

## Распределение

| Мотив | Ур. 1 | Ур. 2 | Ур. 3 | Всего |
|---|---:|---:|---:|---:|
| mate | 0 | 0 | 1 | 1 |
| material | 3 | 16 | 12 | 31 |
| sacrifice | 0 | 4 | 8 | 12 |
| quiet | 1 | 4 | 9 | 14 |
| endgame | 0 | 0 | 2 | 2 |
| promotion | 0 | 0 | 0 | 0 |
| **Всего** | **4** | **24** | **32** | **60** |

## Все 60 задач

| ID | Партия | Ур. | Мотив | Отрыв | Вердикт |
|---|---|---:|---|---:|---|
| alekhine-yates-1922#0 | Алехин — Йейтс, Лондон 1922 | 2 | sacrifice | 1.45 | ✓ |
| alekhine-yates-1922#1 | Алехин — Йейтс, Лондон 1922 | 2 | sacrifice | 3.77 | ✓ |
| alekhine-yates-1922#2 | Алехин — Йейтс, Лондон 1922 | 2 | quiet | 5.60 | ✓ |
| alekhine-yates-1922#3 | Алехин — Йейтс, Лондон 1922 | 2 | quiet | 0.89 | ✓ |
| botvinnik-capablanca-1938#0 | Ботвинник — Капабланка, Амстердам 1938 | 3 | material | 4.19 | ✓ |
| botvinnik-capablanca-1938#1 | Ботвинник — Капабланка, Амстердам 1938 | 3 | sacrifice | 1.94 | ✓ |
| botvinnik-capablanca-1938#2 | Ботвинник — Капабланка, Амстердам 1938 | 3 | material | 5.15 | ✓ |
| botvinnik-capablanca-1938#3 | Ботвинник — Капабланка, Амстердам 1938 | 3 | quiet | 3.14 | ✓ |
| byrne-fischer-1956#0 | Бёрн — Фишер, Нью-Йорк 1956 | 3 | material | 2.60 | ✓ |
| byrne-fischer-1956#1 | Бёрн — Фишер, Нью-Йорк 1956 | 3 | sacrifice | 1.93 | ✓ |
| byrne-fischer-1956#2 | Бёрн — Фишер, Нью-Йорк 1956 | 3 | quiet | 1.90 | ✓ |
| byrne-fischer-1956#3 | Бёрн — Фишер, Нью-Йорк 1956 | 3 | material | 3.81 | ✓ |
| capablanca-tartakower-1924#0 | Капабланка — Тартаковер, Нью-Йорк 1924 | 3 | quiet | 2.89 | ✓ |
| capablanca-tartakower-1924#1 | Капабланка — Тартаковер, Нью-Йорк 1924 | 3 | endgame | 3.27 | ✓ |
| capablanca-tartakower-1924#2 | Капабланка — Тартаковер, Нью-Йорк 1924 | 3 | endgame | 8.70 | ✓ |
| capablanca-tartakower-1924#3 | Капабланка — Тартаковер, Нью-Йорк 1924 | 3 | material | 8.63 | ✓ |
| fischer-spassky-1972#0 | Фишер — Спасский, Рейкьявик 1972 | 2 | material | 4.86 | ✓ |
| fischer-spassky-1972#1 | Фишер — Спасский, Рейкьявик 1972 | 2 | material | 4.12 | ✓ |
| fischer-spassky-1972#2 | Фишер — Спасский, Рейкьявик 1972 | 2 | quiet | 1.98 | ✓ |
| fischer-spassky-1972#3 | Фишер — Спасский, Рейкьявик 1972 | 2 | quiet | 1.85 | ✓ |
| karpov-kasparov-1984#0 | Карпов — Каспаров, Москва 1984 | 3 | quiet | 0.81 | ✓ |
| karpov-kasparov-1984#1 | Карпов — Каспаров, Москва 1984 | 3 | material | 1.15 | ✓ |
| karpov-kasparov-1984#2 | Карпов — Каспаров, Москва 1984 | 3 | quiet | 0.93 | ✓ |
| karpov-kasparov-1984#3 | Карпов — Каспаров, Москва 1984 | 3 | material | 5.32 | ✓ |
| karpov-kasparov-1985#0 | Карпов — Каспаров, Москва 1985 | 3 | quiet | 1.94 | ✓ |
| karpov-kasparov-1985#1 | Карпов — Каспаров, Москва 1985 | 3 | material | 2.33 | ✓ |
| karpov-kasparov-1985#2 | Карпов — Каспаров, Москва 1985 | 3 | sacrifice | 2.95 | ✓ |
| karpov-kasparov-1985#3 | Карпов — Каспаров, Москва 1985 | 3 | sacrifice | 2.81 | ✓ |
| kasparov-topalov-1999#0 | Каспаров — Топалов, Вейк-ан-Зее 1999 | 2 | material | 5.98 | ✓ |
| kasparov-topalov-1999#1 | Каспаров — Топалов, Вейк-ан-Зее 1999 | 2 | sacrifice | 3.19 | ✓ |
| kasparov-topalov-1999#2 | Каспаров — Топалов, Вейк-ан-Зее 1999 | 2 | sacrifice | 3.93 | ✓ |
| kasparov-topalov-1999#3 | Каспаров — Топалов, Вейк-ан-Зее 1999 | 2 | material | 4.51 | ✓ |
| lasker-bauer-1889#0 | Ласкер — Бауэр, Амстердам 1889 | 2 | material | 4.34 | ✓ |
| lasker-bauer-1889#1 | Ласкер — Бауэр, Амстердам 1889 | 2 | material | 7.68 | ✓ |
| lasker-bauer-1889#2 | Ласкер — Бауэр, Амстердам 1889 | 2 | material | 2.06 | ✓ |
| lasker-bauer-1889#3 | Ласкер — Бауэр, Амстердам 1889 | 2 | material | 3.92 | ✓ |
| lasker-capablanca-1914#0 | Ласкер — Капабланка, Санкт-Петербург 1914 | 3 | material | 4.20 | ✓ |
| lasker-capablanca-1914#1 | Ласкер — Капабланка, Санкт-Петербург 1914 | 3 | material | 2.65 | ✓ |
| lasker-capablanca-1914#2 | Ласкер — Капабланка, Санкт-Петербург 1914 | 3 | quiet | 0.86 | ✓ |
| lasker-capablanca-1914#3 | Ласкер — Капабланка, Санкт-Петербург 1914 | 3 | sacrifice | 1.25 | ✓ |
| morphy-opera-1858#0 | Морфи — герцог и граф, Париж 1858 | 1 | quiet | 2.98 | ✓ |
| morphy-opera-1858#1 | Морфи — герцог и граф, Париж 1858 | 1 | material | 2.86 | ✓ |
| morphy-opera-1858#2 | Морфи — герцог и граф, Париж 1858 | 1 | material | 4.97 | ✓ |
| morphy-opera-1858#3 | Морфи — герцог и граф, Париж 1858 | 1 | material | 3.31 | ✓ |
| rotlewi-rubinstein-1907#0 | Ротлеви — Рубинштейн, Лодзь 1907 | 3 | material | 3.83 | ✓ |
| rotlewi-rubinstein-1907#1 | Ротлеви — Рубинштейн, Лодзь 1907 | 3 | quiet | 2.25 | ✓ |
| rotlewi-rubinstein-1907#2 | Ротлеви — Рубинштейн, Лодзь 1907 | 3 | sacrifice | 8.39 | ✓ |
| rotlewi-rubinstein-1907#3 | Ротлеви — Рубинштейн, Лодзь 1907 | 3 | mate | 1004.19 | ✓ |
| spassky-bronstein-1960#0 | Спасский — Бронштейн, Ленинград 1960 | 2 | material | 4.37 | ✓ |
| spassky-bronstein-1960#1 | Спасский — Бронштейн, Ленинград 1960 | 2 | material | 4.78 | ✓ |
| spassky-bronstein-1960#2 | Спасский — Бронштейн, Ленинград 1960 | 2 | material | 2.51 | ✓ |
| spassky-bronstein-1960#3 | Спасский — Бронштейн, Ленинград 1960 | 2 | material | 2.06 | ✓ |
| steinitz-bardeleben-1895#0 | Стейниц — фон Барделебен, Гастингс 1895 | 3 | sacrifice | 1.65 | ✓ |
| steinitz-bardeleben-1895#1 | Стейниц — фон Барделебен, Гастингс 1895 | 3 | quiet | 3.03 | ✓ |
| steinitz-bardeleben-1895#2 | Стейниц — фон Барделебен, Гастингс 1895 | 3 | material | 1.75 | ✓ |
| steinitz-bardeleben-1895#3 | Стейниц — фон Барделебен, Гастингс 1895 | 3 | sacrifice | 3.70 | ✓ |
| winter-capablanca-1919#0 | Уинтер — Капабланка, Гастингс 1919 | 2 | material | 2.18 | ✓ |
| winter-capablanca-1919#1 | Уинтер — Капабланка, Гастингс 1919 | 2 | material | 1.48 | ✓ |
| winter-capablanca-1919#2 | Уинтер — Капабланка, Гастингс 1919 | 2 | material | 2.76 | ✓ |
| winter-capablanca-1919#3 | Уинтер — Капабланка, Гастингс 1919 | 2 | material | 2.91 | ✓ |

## Четыре отрицательные проверки

1. У `alekhine-yates-1922#0` (`Bxe7`) временно поставлен `quiet`:

```text
Error: Контент alekhine-yates-1922: упражнение 1: motif quiet противоречит ходу Bxe7: ход является взятием, шахом или превращением
```

2. У нематовой `alekhine-yates-1922#2` (`Rg8`) временно поставлен `mate`:

```text
✗ упражнение 3: motif mate, но оценка лучшего хода не матовая
Проверка движком: ошибок 1
```

3. У `alekhine-yates-1922#0` временно поставлен несуществующий `fork`:

```text
Error: Контент alekhine-yates-1922: упражнение 1: motif fork не входит в перечисление
```

4. Два независимых запуска `npx tsx scripts/verify-daily.ts 2026-08-13`:

```text
karpov-kasparov-1984#1, morphy-opera-1858#3, botvinnik-capablanca-1938#2, capablanca-tartakower-1924#3, botvinnik-capablanca-1938#1
karpov-kasparov-1984#1, morphy-opera-1858#3, botvinnik-capablanca-1938#2, capablanca-tartakower-1924#3, botvinnik-capablanca-1938#1
```

Все временные подмены восстановлены до финальных зелёных прогонов.

## Сборка, совместимость и мобильная проверка

`npm run validate:content` и `npm run build` завершились с кодом 0 (`✓ built`, `files generated`).
Стор старого формата без `puzzles`, `daily`, `marathonRecord` и без `MistakeTask.origin`
загружен в браузере: главная и «Работа над ошибками» открылись, `origin` получил `lesson`.

Production-бандл проверен при 375×812: `document.documentElement.scrollWidth === 375`,
горизонтального скролла нет; меню режимов, доска, «Показать ответ» и кнопка продолжения
помещаются. Фильтр уровня 1 честно показывает `4 из 4`.
