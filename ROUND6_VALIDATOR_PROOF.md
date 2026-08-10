# Проверка защиты от повтора момента `find`

Для отрицательной проверки в первое упражнение урока Бёрн — Фишер временно был
подставлен FEN позиции момента `kind: "find"` на ply 21, сторона хода `b` и ответ
`Na4`. Позиция легальна и принадлежит PGN того же урока, но повторяет уже решённый
учеником момент.

Вывод `npm run validate:content`:

```text
Error: Контент byrne-fischer-1956: упражнение 1: FEN совпадает с моментом kind find этого же урока
    at fail (/Users/yury/projects/chess-trainer/scripts/validate-content.ts:26:52)
    at validate (/Users/yury/projects/chess-trainer/scripts/validate-content.ts:108:39)

Node.js v25.9.0
```

После проверки упражнение восстановлено. Порог `drills.length >= 4` не менялся.
