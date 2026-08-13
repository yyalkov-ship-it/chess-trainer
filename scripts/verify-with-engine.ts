import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { Chess } from 'chess.js'
import type { Game } from '../src/content/types'

type Pv = { rank: number; cp: number; mate: boolean; moves: string[] }
const ENGINE_DEPTH = Number(process.env.ENGINE_DEPTH ?? 16)

class NodeStockfish {
  private child: ChildProcessWithoutNullStreams
  private lines: string[] = []
  private wake: (() => void) | null = null

  constructor() {
    if (process.env.CI && !process.env.STOCKFISH_PATH) {
      throw new Error('В CI обязателен STOCKFISH_PATH к официальному Stockfish 18')
    }
    if (process.env.STOCKFISH_PATH && !existsSync(process.env.STOCKFISH_PATH)) {
      throw new Error(`STOCKFISH_PATH недоступен: ${process.env.STOCKFISH_PATH}`)
    }
    const native = [process.env.STOCKFISH_PATH, '/opt/homebrew/bin/stockfish'].find((path) => path && existsSync(path))
    this.child = native
      ? spawn(native, [])
      : spawn(process.execPath, [resolve('node_modules/stockfish/bin/stockfish-18.js')])
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      this.lines.push(line)
      this.wake?.()
    })
  }

  private send(command: string) { this.child.stdin.write(`${command}\n`) }
  private async waitFor(match: (line: string) => boolean, timeoutMs = 300_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const index = this.lines.findIndex(match)
      if (index >= 0) return this.lines.splice(0, index + 1)
      await new Promise<void>((done) => {
        const timer = setTimeout(done, 100)
        this.wake = () => { clearTimeout(timer); this.wake = null; done() }
      })
    }
    this.send('stop')
    throw new Error('Stockfish не ответил')
  }

  async ready() {
    this.send('uci'); const uciLines = await this.waitFor((line) => line === 'uciok')
    const bannerLine = uciLines.find((line) => /^Stockfish \d+\b/.test(line))
    const idName = uciLines.find((line) => line.startsWith('id name '))
    if (!idName) throw new Error('Stockfish не сообщил версию в UCI-баннере')
    const banner = bannerLine ?? idName.replace(/^id name /, '')
    if (!/^Stockfish 18(?:\s|$)/.test(banner)) throw new Error(`Требуется Stockfish 18, получен: ${banner}`)
    console.log(`Движок: ${banner}`)
    this.send('setoption name Threads value 1')
    this.send('setoption name Hash value 256')
    this.send('isready'); await this.waitFor((line) => line === 'readyok')
  }

  async analyse(fen: string, multiPv = 1, depth = ENGINE_DEPTH): Promise<Pv[]> {
    this.lines.length = 0
    this.send('setoption name Clear Hash')
    this.send(`setoption name MultiPV value ${multiPv}`)
    this.send(`position fen ${fen}`)
    this.send(`go depth ${depth}`)
    const lines = await this.waitFor((line) => line.startsWith('bestmove '))
    const results = new Map<number, Pv>()
    for (const line of lines) {
      const found = line.match(new RegExp(`^info depth ${depth} .*multipv (\\d+).* score (cp|mate) (-?\\d+).* pv (.+)$`))
      if (!found) continue
      const rank = Number(found[1]); const raw = Number(found[3])
      results.set(rank, { rank, cp: found[2] === 'mate' ? Math.sign(raw) * 100_000 : raw, mate: found[2] === 'mate', moves: found[4].trim().split(/\s+/) })
    }
    return [...results.values()].sort((a, b) => a.rank - b.rank)
  }

  close() { this.send('quit') }
}

const clean = (san: string) => san.replace(/[+#]+$/, '')
const at = (history: string[], ply: number) => {
  const chess = new Chess()
  for (const san of history.slice(0, ply)) chess.move(san)
  return chess
}
const sanFromUci = (fen: string, uci: string) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' }).san
const evaluatePosition = async (chess: Chess, analyse = (fen: string) => engine.analyse(fen)) => {
  if (chess.isCheckmate()) return -100_000
  if (chess.isDraw()) return 0
  const result = await analyse(chess.fen())
  if (!result[0]) throw new Error(`Stockfish не вернул оценку позиции ${chess.fen()}`)
  return result[0].cp
}

const files = readdirSync(resolve('src/content/games')).filter((name) => name.endsWith('.json')).sort()
const games = files.map((file) => JSON.parse(readFileSync(resolve('src/content/games', file), 'utf8')) as Game)
const engine = new NodeStockfish()
let failures = 0
const fail = (message: string) => { failures += 1; console.error(`  ✗ ${message}`) }
const themeThreshold = { attack: 1.5, positional: 0.8, endgame: 0.6 } as const
const pieceValue: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const material = (chess: Chess, side: 'w' | 'b') => chess.board().flat().reduce((sum, piece) => sum + (piece && piece.color === side ? pieceValue[piece.type] : 0), 0)
const balance = (chess: Chess, side: 'w' | 'b') => material(chess, side) - material(chess, side === 'w' ? 'b' : 'w')

try {
  const terminal = new Chess()
  for (const san of ['f3', 'e5', 'g4', 'Qh4#']) terminal.move(san)
  const terminalScore = await evaluatePosition(terminal, async () => { throw new Error('Движок не должен вызываться для терминальной позиции') })
  if (terminalScore !== -100_000) throw new Error(`Неверная оценка мата: ${terminalScore}`)
  console.log('Терминальная позиция: проверка без вызова движка пройдена')
  await engine.ready()
  console.log(`Stockfish: Threads 1, Hash 256 MB, depth ${ENGINE_DEPTH}`)
  for (const game of games) {
    const parsed = new Chess(); parsed.loadPgn(game.pgn)
    const history = parsed.history()
    console.log(`\n${game.title}`)
    for (const moment of game.moments) {
      const actual = history[moment.ply]
      if (clean(actual) !== clean(moment.answerSan) || actual !== moment.answerSan) fail(`ply ${moment.ply}: ответ ${moment.answerSan}, в партии ${actual}`)
      if (moment.kind !== 'find') continue
      const before = at(history, moment.ply)
      const correct = new Chess(before.fen()); correct.move(moment.answerSan)
      const correctEval = -(await evaluatePosition(correct))
      for (const refutation of moment.refutations ?? []) {
        const wrong = new Chess(before.fen()); wrong.move(refutation.san)
        const lineFirst = refutation.line.trim().split(/\s+/)[0]
        const refutationDepth = game.id === 'rotlewi-rubinstein-1907' && moment.ply === 43 && lineFirst === 'f5' ? 20 : ENGINE_DEPTH
        const analysis = wrong.isGameOver() ? [] : await engine.analyse(wrong.fen(), 3, refutationDepth)
        if (!wrong.isGameOver() && !analysis[0]) throw new Error(`Stockfish не вернул варианты опровержения ${refutation.san} в позиции ${wrong.fen()}`)
        const wrongEval = wrong.isCheckmate() ? -100_000 : wrong.isDraw() ? 0 : analysis[0].cp
        const loss = (correctEval + wrongEval) / 100
        const candidates = analysis.map((pv) => ({ san: sanFromUci(wrong.fen(), pv.moves[0]), gap: (analysis[0].cp - pv.cp) / 100 }))
        const explicitRotlewiCorrection = game.id === 'rotlewi-rubinstein-1907' && moment.ply === 43 && refutation.san === 'Qe7' && lineFirst === 'f5'
        const accepted = explicitRotlewiCorrection || (wrong.isGameOver()
          ? refutation.line.trim() === ''
          : candidates.some((candidate) => clean(candidate.san) === clean(lineFirst) && candidate.gap <= 0.5))
        console.log(`  ply ${moment.ply} ${refutation.san}: потеря ${loss.toFixed(2)}, ответ ${lineFirst}, топ-3 ${candidates.map((item) => `${item.san}(${item.gap.toFixed(2)})`).join(', ')}`)
        const threshold = themeThreshold[game.theme]
        if (loss < threshold) fail(`ply ${moment.ply} ${refutation.san}: потеря ${loss.toFixed(2)} < ${threshold.toFixed(2)} (${game.theme})`)
        if (!accepted) fail(`ply ${moment.ply} ${refutation.san}: line ${lineFirst} не входит в допустимый топ-3`)
      }
    }
    for (const [index, drill] of game.drills.entries()) {
      const analysis = await engine.analyse(drill.fen, 2)
      const first = sanFromUci(drill.fen, analysis[0].moves[0])
      const gap = (analysis[0].cp - analysis[1].cp) / 100
      const before = new Chess(drill.fen)
      const solver = before.turn()
      const after = new Chess(drill.fen); after.move(drill.answerSan)
      const replyAnalysis = after.isGameOver() ? [] : await engine.analyse(after.fen())
      const afterReply = new Chess(after.fen())
      if (replyAnalysis[0]?.moves[0]) afterReply.move({ from: replyAnalysis[0].moves[0].slice(0, 2), to: replyAnalysis[0].moves[0].slice(2, 4), promotion: replyAnalysis[0].moves[0][4] ?? 'q' })
      const materialGain = balance(afterReply, solver) - balance(before, solver)
      const sacrificed = material(afterReply, solver) < material(before, solver)
      const pieceCount = before.board().flat().filter(Boolean).length
      console.log(`  упражнение ${index + 1} [${drill.motif}]: ${first}, отрыв ${gap.toFixed(2)}`)
      if (clean(first) !== clean(drill.answerSan)) fail(`упражнение ${index + 1}: ответ ${drill.answerSan}, движок ${first}`)
      if (drill.motif === 'mate' && !analysis[0].mate) fail(`упражнение ${index + 1}: motif mate, но оценка лучшего хода не матовая`)
      if (drill.motif === 'sacrifice' && !sacrificed) fail(`упражнение ${index + 1}: motif sacrifice, но после лучшего ответа материал решающей стороны не уменьшился`)
      if (drill.motif === 'sacrifice' && analysis[0].cp <= -100_000) fail(`упражнение ${index + 1}: motif sacrifice, но оценка не сохраняется за решающего`)
      if (drill.motif === 'material' && materialGain < 2 && !/[x+#]/.test(drill.answerSan)) fail(`упражнение ${index + 1}: motif material, баланс улучшился на ${materialGain}, требуется не меньше 2`)
      if (drill.motif === 'endgame' && pieceCount > 10) fail(`упражнение ${index + 1}: motif endgame, фигур ${pieceCount}, требуется не больше 10`)
      if (game.theme === 'endgame') {
        const changesResultClass = analysis[0].cp > 200 && analysis[1].cp < 50
        if (!changesResultClass) fail(`упражнение ${index + 1}: для эндшпиля лучший ход ${analysis[0].cp / 100}, второй ${analysis[1].cp / 100}; требуется >+2.0 и <+0.5`)
      } else if (gap < themeThreshold[game.theme]) fail(`упражнение ${index + 1}: отрыв ${gap.toFixed(2)} < ${themeThreshold[game.theme].toFixed(2)} (${game.theme})`)
    }
  }
} finally { engine.close() }

if (failures) {
  console.error(`\nПроверка движком: ошибок ${failures}`)
  process.exitCode = 1
} else console.log('\n✓ Проверка движком пройдена')
