# Round 11 Proof

Base for comparison: `69e6bb8`.

## Gate

- `themeThreshold` is unchanged from `69e6bb8`: `{ attack: 1.5, positional: 0.8, endgame: 0.6 }`.
- Refutation tolerance is unchanged: `candidate.gap <= 0.5`.
- `scripts/verify-with-engine.ts` has no `motif !== ...`, `game.id === ...`, or `moment.ply === ...` bypass in the checks.
- The material gate now applies to every `material` drill: `materialGain < 2` always fails.

## Changed Motifs

Metrics are from accepted engine runs at depth 16 and depth 20. `mat` is the maximum material gain in the four-ply best-line window used by the gate.

| Drill | Motif | Engine reason |
|---|---|---|
| `alekhine-yates-1922#0` | `sacrifice` -> `material` | Not a sacrifice under the new sacrifice check; material gain is `3` at both depths, gap `1.45/1.40`. |
| `alekhine-yates-1922#1` | `sacrifice` -> `material` | Not a sacrifice; material gain is `3`, gap `3.77/4.09`. |
| `botvinnik-capablanca-1938#1` | `sacrifice` -> `quiet` | `Re6` is quiet and does not sacrifice material; material gain `0`, gap `1.94/2.04`. |
| `byrne-fischer-1956#1` | `sacrifice` -> `material` | Not a sacrifice; material gain `3`, gap `1.93/1.97`. |
| `byrne-fischer-1956#3` | `material` -> `attack` | Material gain `0`, so `material` fails; forcing check keeps the attack, gap `3.81/4.12`. |
| `karpov-kasparov-1985#1` | `material` -> `attack` | Material gain `1 < 2`; attack gate passes, gap `2.33/2.38`. |
| `karpov-kasparov-1985#2` | `sacrifice` -> `material` | Not a sacrifice; material gain `6`, gap `2.95/2.55`. |
| `karpov-kasparov-1985#3` | `sacrifice` -> `material` | Not a sacrifice; material gain `3`, gap `2.81/2.67`. |
| `kasparov-topalov-1999#1` | `sacrifice` -> `attack` | Material gain `1 < 2`; forcing check attack passes, gap `3.19/3.91`. |
| `kasparov-topalov-1999#2` | `sacrifice` -> `material` | Not a sacrifice; material gain `3`, gap `3.93/4.49`. |
| `kasparov-topalov-1999#3` | `material` -> `attack` | Material gain `0`; forcing check attack passes, gap `4.51/6.89`. |
| `lasker-bauer-1889#0` | `material` -> `attack` | Material gain `0`; forcing check attack passes, gap `4.34/5.07`. |
| `lasker-bauer-1889#2` | `material` -> `attack` | Material gain `1 < 2`; forcing check attack passes, gap `2.06/1.98`. |
| `lasker-bauer-1889#3` | `material` -> `attack` | Material gain `0`; forcing check attack passes, gap `3.92/4.32`. |
| `lasker-capablanca-1914#1` | `material` -> `attack` | Material gain `1 < 2`; attack gate passes, gap `2.65/2.44`. |
| `lasker-capablanca-1914#3` | `sacrifice` -> `attack` | Sacrifice label does not match the stricter check; attack gate passes, gap `1.25/1.30`. |
| `rotlewi-rubinstein-1907#2` | `sacrifice` -> `material` | Not a sacrifice; material gain `6`, gap `8.39/11.01`. |
| `spassky-bronstein-1960#3` | `material` -> `attack` | Material gain `0`; forcing check attack passes, gap `2.06/1.80`. |
| `steinitz-bardeleben-1895#0` | `sacrifice` -> `material` | Not a sacrifice; material gain `3`, gap `1.65/1.54`. |
| `steinitz-bardeleben-1895#2` | `material` -> `attack` | Material gain `0`; forcing check attack passes, gap `1.75/2.69`. |
| `steinitz-bardeleben-1895#3` | `sacrifice` -> `attack` | Sacrifice label does not match the stricter check; attack gate passes, gap `3.70/4.55`. |
| `winter-capablanca-1919#1` | `material` -> `attack` | Default-depth material gain is `1 < 2`, so `material` fails the required run; attack gate passes, gap `1.48/1.61`. |
| `winter-capablanca-1919#2` | `material` -> `attack` | Material gain `1 < 2`; attack gate passes, gap `2.76/3.18`. |
| `winter-capablanca-1919#3` | `material` -> `attack` | Material gain `1 < 2`; attack gate passes, gap `2.91/3.21`. |

## Depth-20 Fixes

### `fischer-spassky-1972#3`

Old drill:

```text
FEN 4q2k/2r1r1pn/4P2p/p1p2R2/P2pQ2P/1P1B1R2/6P1/6K1 b - - 8 37
answer Nf6
depth 20 gap 0.23 < 0.80
```

The drill was replaced with a same-game final position:

```text
FEN 4q2k/2r1r3/4PR1p/p1p5/P1BpQ2P/1P6/6P1/6K1 w - - 3 41
answer Qf4
motif quiet
depth 16 gap 1.51
depth 20 gap 991.61
```

### `kasparov-topalov-1999`, ply 56

The old `Qxf6 -> Qd1+` line is unstable: depth 16 likes `Qd1+`, but depth 20 puts it `0.55` behind `Rd6`, just outside the allowed `0.5`.

I replaced that refutation with a different legal mistake:

```text
ply 56 f4: loss 4.84, answer Rd6, depth 16 top-3 Rd6(0.00), Qd1+(0.31), Qc4(1.66)
ply 56 f4: loss 5.70, answer Rd6, depth 20 top-3 Rd6(0.00), Qd1+(0.39), Qc4(1.19)
```

## Prompts

- Drill prompts were restored from `69e6bb8` first.
- The exact `Найди лучший ход в этой позиции.` duplicate group had 26 rows. All duplicate prompt groups from `69e6bb8` were rewritten to satisfy the round-11 no-duplicates acceptance criterion.
- Unique original prompts were kept as text and only prefixed with the side-to-move phrase required by the task-10 validator.
- Mechanical check result: `prompts=60, unique=60`.
- No drill prompt contains `мотив`, `уровень`, `задачу на`, `выигрыш материала`, `форсированный ход`, `тихий ход`, `эндшпильную задачу`, or `превращение пешки`.

## Task-10 Tail Audit

- Motif menu hides zero-count motifs: `availableMotifs` filters `count > 0` before rendering.
- Marathon wrong answer shows the answer first: `stopped` depends on `showMarathonResult`, and the result screen opens only after the `Показать итог` button.
- Level filter applies to marathon: `startMarathon` uses `filtered`.
- `scripts/validate-content.ts` has no empty `mate` branch.

## Engine Output

Default depth:

```text
> chess-trainer@0.1.0 verify:engine
> tsx scripts/verify-with-engine.ts
Stockfish: Threads 1, Hash 256 MB, depth 16
  упражнение 4 [quiet]: Qf4, отрыв 1.51, материал 1
  ply 56 f4: потеря 4.84, ответ Rd6, топ-3 Rd6(0.00), Qd1+(0.31), Qc4(1.66)
✓ Проверка движком пройдена
```

Depth 20:

```text
> chess-trainer@0.1.0 verify:engine
> tsx scripts/verify-with-engine.ts
Stockfish: Threads 1, Hash 256 MB, depth 20
  упражнение 4 [quiet]: Qf4, отрыв 991.61, материал 1
  ply 56 f4: потеря 5.70, ответ Rd6, топ-3 Rd6(0.00), Qd1+(0.39), Qc4(1.19)
✓ Проверка движком пройдена
```

Other verification:

```text
npm run validate:content
✓ Board safety check passed
... 15 lessons validated

npm run build
✓ built in 448ms
```
