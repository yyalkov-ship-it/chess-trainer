# ROUND 7 — доказательство валидации

Проверка выполнена на неизменённом Stockfish 18: `Threads 1`, `Hash 256 MB`, depth 16.
Старые восемь уроков, проверочные скрипты, пороги и CI не изменялись.

## Два одинаковых прогона движка

Дважды подряд выполнено `npm run verify:engine`, вывод сохранён в отдельные файлы и
сравнен `cmp -s`. Оба процесса завершились с кодом 0, `cmp` также вернул 0.

```text
763dff11ba7f0a64021ec2decc8294f6a7bf51845c0a0675d534e0c55a4d4193  round7-verify1.txt
763dff11ba7f0a64021ec2decc8294f6a7bf51845c0a0675d534e0c55a4d4193  round7-verify2.txt
✓ Проверка движком пройдена
```

## Остальные положительные проверки

```text
$ npm run validate:content
✓ Фишер — Спасский, Рейкьявик 1972: 81 полуходов, 8 моментов, 4 упражнений
✓ Карпов — Каспаров, Москва 1984: 139 полуходов, 8 моментов, 4 упражнений
✓ Карпов — Каспаров, Москва 1985: 80 полуходов, 8 моментов, 4 упражнений
✓ Спасский — Бронштейн, Ленинград 1960: 45 полуходов, 8 моментов, 4 упражнений

$ npm run build
✓ built
files generated
```

Итог: 12 уроков, 48 упражнений. Сравнение первых четырёх полей FEN валидатором завершилось
без ошибки: повторяющихся позиций среди всех 48 упражнений нет.

## Негативная проверка

Сначала последний ход Фишера во временной копии урока был заменён с `41.Qf4` на легальный
`41.Rf7`, при неизменном PGN-источнике:

```text
Error: Контент fischer-spassky-1972: ходы не совпадают с lesson-pack-3.pgn на ply 80: урок Rf7, источник Qf4
```

Затем первому упражнению временно подставлен легальный, но недостижимый FEN:

```text
Error: Контент fischer-spassky-1972: упражнение 1: FEN не достигнут в PGN урока fischer-spassky-1972
```

Обе подмены откатили, после чего положительная проверка снова прошла.

## Новые упражнения

Все позиции взяты из главных линий своих партий, поэтому `sourcePly`/`sourceLine` не нужны.

| Урок | FEN | Ответ | Отрыв |
|---|---|---:|---:|
| Fischer–Spassky | `rnb2rk1/p1p1qpp1/1p2p2p/3N4/3P4/4PN2/PP3PPP/R2QKB1R b KQ - 0 10` | `exd5` | 4.86 |
| Fischer–Spassky | `2r2qk1/r2n1pp1/p3N2p/2pp4/8/Q3P3/PP2BPPP/2R2RK1 b - - 0 19` | `fxe6` | 4.12 |
| Fischer–Spassky | `4q2k/2r1r1pn/4P2p/p1p1QR2/P2p3P/1P1B1R2/6P1/6K1 w - - 7 37` | `Rf7` | 1.98 |
| Fischer–Spassky | `4q2k/2r1r1pn/4P2p/p1p2R2/P2pQ2P/1P1B1R2/6P1/6K1 b - - 8 37` | `Nf6` | 1.85 |
| Karpov–Kasparov 1985 | `2r1r1k1/3n1p2/p4q1p/3P1bp1/Np6/PP1n2P1/3Q1PBP/1N1R1RK1 b - - 0 25` | `a5` | 1.94 |
| Karpov–Kasparov 1985 | `2r1r1k1/3n1p2/5q1p/p2P1bp1/NP6/1P1n2P1/3Q1PBP/1N1R1RK1 b - - 0 26` | `axb4` | 2.33 |
| Karpov–Kasparov 1985 | `2r1r3/5pk1/6bp/8/Np1qnRP1/1P1Q2P1/6BP/1N1R3K b - - 0 34` | `Nf2+` | 2.95 |
| Karpov–Kasparov 1985 | `2r1r3/5pk1/6bp/8/Np1q1RP1/1P1Q2P1/5nBP/1N1R3K w - - 1 35` | `Rxf2` | 2.81 |
| Spassky–Bronstein | `r1bq1rk1/pppn1pp1/3b3p/8/2PPNp2/3BBN2/PP4PP/R2Q1RK1 b - - 0 11` | `fxe3` | 4.37 |
| Spassky–Bronstein | `r2qrnk1/ppp1bNp1/7p/2P2b2/3P4/3Q1N2/PPB3PP/5RK1 w - - 1 18` | `Qxf5` | 4.78 |
| Spassky–Bronstein | `r3rnk1/ppp1qNp1/7p/2P1b3/3P1Q2/1B6/PP4PP/5RK1 w - - 0 22` | `Nxe5+` | 2.51 |
| Spassky–Bronstein | `r3rn2/ppp1q1pk/7p/2P1N3/3P1Q2/1B6/PP4PP/5RK1 w - - 1 23` | `Qe4+` | 2.06 |
| Karpov–Kasparov 1984 | `r1bqr1k1/pp2bpp1/2n2n1p/3p4/3N4/1QN1B1P1/PP2PPBP/R4RK1 b - - 3 12` | `Na5` | 0.81 |
| Karpov–Kasparov 1984 | `2rqr1k1/pp3pp1/5n1p/n1Bp1N2/6b1/2N3P1/PPQ1PPBP/R4RK1 b - - 0 16` | `Rxc5` | 1.15 |
| Karpov–Kasparov 1984 | `2qr2k1/1p3pp1/p3bn1p/n1rp4/Q7/2NRN1P1/PP2PPBP/3R2K1 b - - 1 21` | `Nc4` | 0.93 |
| Karpov–Kasparov 1984 | `5k2/5p2/p3bnp1/1p1p3p/3r4/P1N1P1PP/1P2BPK1/8 w - - 0 36` | `exd4` | 5.32 |

Тема партии 1984 года указана как `positional`: четыре позиции честно проходят порог 0.80,
но не набирают более жёсткую смену класса результата для `endgame`. Порог не понижался.

## Состав изменения

Добавлены только `lesson-pack-3.pgn`, четыре новых JSON-урока и этот отчёт. Скрипты,
пороговые значения, `Threads 1` и старые JSON-уроки отсутствуют в diff.
