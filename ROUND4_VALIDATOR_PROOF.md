# Проверка защиты от подмены PGN

Для отрицательной проверки в уроке Алехин — Йейтс первые ходы временно были заменены с
`1.d4 Nf6 2.c4 e6 3.Nf3 d5` на легальную перестановку
`1.d4 d5 2.c4 e6 3.Nf3 Nf6`.

Вывод `npm run validate:content`:

```text
Error: Контент alekhine-yates-1922: ходы не совпадают с canonical-games.pgn на ply 1: урок d5, источник Nf6
    at fail (scripts/validate-content.ts:36:52)
    at validate (scripts/validate-content.ts:60:5)

Node.js v25.9.0
```

После проверки исходная последовательность восстановлена.
