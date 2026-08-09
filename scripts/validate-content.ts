import { Chess } from 'chess.js'
import game from '../src/content/games/kasparov-topalov-1999.json'
import type { Game } from '../src/content/types'

function fail(message: string): never { throw new Error(`Контент ${game.id}: ${message}`) }
function loadPgn(): Chess {
  const chess = new Chess()
  try { chess.loadPgn(game.pgn) } catch (error) { fail(`нелегальный PGN: ${String(error)}`) }
  return chess
}
function positionBefore(ply: number): Chess {
  const source = loadPgn()
  const history = source.history()
  if (!Number.isInteger(ply) || ply < 0 || ply >= history.length) fail(`ply ${ply} вне партии из ${history.length} полуходов`)
  const chess = new Chess()
  for (const san of history.slice(0, ply)) chess.move(san)
  return chess
}
function assertLegal(chess: Chess, san: string, label: string) {
  try { chess.move(san) } catch { fail(`${label}: ход ${san} нелегален в позиции ${chess.fen()}`) }
}

const typed = game as Game
const main = loadPgn()
if (main.history().length !== 87) fail(`ожидалось 87 полуходов, получено ${main.history().length}`)
let previousPly = -1
for (const [index, moment] of typed.moments.entries()) {
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
}
for (const [index, drill] of typed.drills.entries()) {
  let position: Chess
  try { position = new Chess(drill.fen) } catch { fail(`упражнение ${index + 1}: неверный FEN`) }
  const expectedSide = drill.side === 'w' ? 'w' : 'b'
  if (position.turn() !== expectedSide) fail(`упражнение ${index + 1}: side не совпадает с FEN`)
  assertLegal(position, drill.answerSan, `упражнение ${index + 1}, ответ`)
}
console.log(`✓ ${typed.title}: 87 полуходов, ${typed.moments.length} моментов, ${typed.drills.length} упражнений`)
