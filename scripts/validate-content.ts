import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Chess } from 'chess.js'
import type { Game } from '../src/content/types'

const directory = resolve('src/content/games')
const files = readdirSync(directory).filter((name) => name.endsWith('.json')).sort()
if (!files.length) throw new Error('В src/content/games нет партий')

for (const file of files) validate(JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as Game)

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
  for (const [index, moment] of game.moments.entries()) {
    if (moment.ply <= previousPly) fail(`моменты должны идти по возрастанию ply (индекс ${index})`)
    previousPly = moment.ply
    const position = positionBefore(moment.ply)
    assertLegal(new Chess(position.fen()), moment.answerSan, `момент ${index + 1}, ответ`)
    for (const alt of moment.altAcceptable ?? []) assertLegal(new Chess(position.fen()), alt, `момент ${index + 1}, альтернатива`)
    for (const refutation of moment.refutations ?? []) {
      const branch = new Chess(position.fen())
      assertLegal(branch, refutation.san, `момент ${index + 1}, ошибка`)
      for (const san of refutation.line.trim().split(/\s+/).filter(Boolean)) assertLegal(branch, san, `момент ${index + 1}, опровержение ${refutation.san}`)
    }
    if (moment.kind === 'find' && moment.hints.length < 2) fail(`момент ${index + 1}: нужно минимум две подсказки`)
    if (moment.kind === 'find' && (moment.refutations?.length ?? 0) < 2) fail(`момент ${index + 1}: нужно минимум два опровержения`)
  }
  for (const [index, drill] of game.drills.entries()) {
    let position: Chess
    try { position = new Chess(drill.fen) } catch { fail(`упражнение ${index + 1}: неверный FEN`) }
    if (position.turn() !== drill.side) fail(`упражнение ${index + 1}: side не совпадает с FEN`)
    assertLegal(position, drill.answerSan, `упражнение ${index + 1}, ответ`)
  }
  console.log(`✓ ${game.title}: ${history.length} полуходов, ${game.moments.length} моментов, ${game.drills.length} упражнений`)
}
