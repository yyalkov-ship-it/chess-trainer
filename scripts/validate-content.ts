import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Chess } from 'chess.js'
import type { Game } from '../src/content/types'

const directory = resolve('src/content/games')
const files = readdirSync(directory).filter((name) => name.endsWith('.json')).sort()
if (!files.length) throw new Error('В src/content/games нет партий')
const games = files.map((file) => JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as Game)
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
const studyPositions = new Set<string>()
const sourcePositions = new Set<string>()
for (const sourceFile of readdirSync(resolve('src/content/sources')).filter((name) => name.endsWith('.pgn'))) {
  const source = readFileSync(resolve('src/content/sources', sourceFile), 'utf8')
  for (const chunk of source.split(/\n(?=\[Event )/).filter((item) => item.trim())) {
    const sourceGame = new Chess(); sourceGame.loadPgn(chunk); const sourceReplay = new Chess()
    sourcePositions.add(positionKey(sourceReplay.fen()))
    for (const san of sourceGame.history()) { sourceReplay.move(san); sourcePositions.add(positionKey(sourceReplay.fen())) }
  }
}
for (const game of games) {
  const chess = new Chess()
  chess.loadPgn(game.pgn)
  const history = chess.history()
  const replay = new Chess()
  studyPositions.add(positionKey(replay.fen()))
  for (const san of history) { replay.move(san); studyPositions.add(positionKey(replay.fen())) }
}
for (const game of games) validate(game)

function validate(game: Game) {
  const fail = (message: string): never => { throw new Error(`Контент ${game.id}: ${message}`) }
  const loadPgn = () => {
    const chess = new Chess()
    try { chess.loadPgn(game.pgn) } catch (error) { fail(`нелегальный PGN: ${String(error)}`) }
    return chess
  }
  const main = loadPgn()
  const history = main.history()
  if (!history.length) fail('PGN не содержит ходов')
  if (game.heroColor !== 'w' && game.heroColor !== 'b') fail('heroColor должен быть w или b')
  const positionBefore = (ply: number) => {
    if (!Number.isInteger(ply) || ply < 0 || ply >= history.length) fail(`ply ${ply} вне партии из ${history.length} полуходов`)
    const chess = new Chess()
    for (const san of history.slice(0, ply)) chess.move(san)
    return chess
  }
  const assertLegal = (chess: Chess, san: string, label: string) => {
    try { chess.move(san) } catch { fail(`${label}: ход ${san} нелегален в позиции ${chess.fen()}`) }
  }

  let previousPly = -1
  let momentsWithArrows = 0
  const isSquare = (value: string) => /^[a-h][1-8]$/.test(value)
  for (const [index, moment] of game.moments.entries()) {
    if (moment.ply <= previousPly) fail(`моменты должны идти по возрастанию ply (индекс ${index})`)
    previousPly = moment.ply
    const position = positionBefore(moment.ply)
    const answerPosition = new Chess(position.fen())
    assertLegal(answerPosition, moment.answerSan, `момент ${index + 1}, ответ`)
    const actual = history[moment.ply]
    if (moment.answerSan !== actual) fail(`момент ${index + 1}: answerSan ${moment.answerSan}, а в партии ${actual} (включая суффикс шаха/мата)`)
    if (moment.kind === 'find' && position.turn() !== game.heroColor) fail(`момент ${index + 1}: ходит не герой (${position.turn()} вместо ${game.heroColor})`)
    for (const alt of moment.altAcceptable ?? []) assertLegal(new Chess(position.fen()), alt, `момент ${index + 1}, альтернатива`)
    for (const refutation of moment.refutations ?? []) {
      const branch = new Chess(position.fen())
      assertLegal(branch, refutation.san, `момент ${index + 1}, ошибка`)
      for (const san of refutation.line.trim().split(/\s+/).filter(Boolean)) assertLegal(branch, san, `момент ${index + 1}, опровержение ${refutation.san}`)
    }
    if (moment.kind === 'find' && moment.hints.length < 2) fail(`момент ${index + 1}: нужно минимум две подсказки`)
    if (moment.kind === 'find' && (moment.refutations?.length ?? 0) < 2) fail(`момент ${index + 1}: нужно минимум два опровержения`)
    if ((moment.arrows?.length ?? 0) > 0) momentsWithArrows += 1
    for (const arrow of moment.arrows ?? []) {
      if (!isSquare(arrow.from) || !isSquare(arrow.to)) fail(`момент ${index + 1}: неверное поле стрелки ${arrow.from}-${arrow.to}`)
    }
    for (const square of moment.highlight ?? []) if (!isSquare(square)) fail(`момент ${index + 1}: неверное поле подсветки ${square}`)
  }
  if (momentsWithArrows < 6) fail(`стрелки есть только в ${momentsWithArrows} моментах, нужно минимум 6`)
  for (const [index, drill] of game.drills.entries()) {
    let position: Chess
    try { position = new Chess(drill.fen) } catch { fail(`упражнение ${index + 1}: неверный FEN`) }
    if (position.turn() !== drill.side) fail(`упражнение ${index + 1}: side не совпадает с FEN`)
    if (studyPositions.has(positionKey(drill.fen))) fail(`упражнение ${index + 1}: FEN встречается в учебной партии`)
    if (!sourcePositions.has(positionKey(drill.fen))) fail(`упражнение ${index + 1}: FEN не получен из PGN в src/content/sources`)
    assertLegal(position, drill.answerSan, `упражнение ${index + 1}, ответ`)
  }
  console.log(`✓ ${game.title}: ${history.length} полуходов, ${game.moments.length} моментов, ${game.drills.length} упражнений`)
}
