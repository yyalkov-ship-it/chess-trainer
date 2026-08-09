import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { Chess } from 'chess.js'
import type { Game } from '../src/content/types'

type Pv = { rank: number; cp: number; moves: string[] }

class NodeStockfish {
  private child: ChildProcessWithoutNullStreams
  private lines: string[] = []
  private wake: (() => void) | null = null

  constructor() {
    this.child = spawn(process.execPath, [resolve('node_modules/stockfish/bin/stockfish-18-lite-single.js')])
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      this.lines.push(line)
      this.wake?.()
    })
  }

  private send(command: string) { this.child.stdin.write(`${command}\n`) }
  private async waitFor(match: (line: string) => boolean, timeoutMs = 120_000) {
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
    this.send('uci'); await this.waitFor((line) => line === 'uciok')
    this.send('setoption name Threads value 1')
    this.send('setoption name Hash value 32')
    this.send('isready'); await this.waitFor((line) => line === 'readyok')
  }

  async analyse(fen: string, multiPv = 1, depth = 20): Promise<Pv[]> {
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
      results.set(rank, { rank, cp: found[2] === 'mate' ? Math.sign(raw) * 100_000 : raw, moves: found[4].trim().split(/\s+/) })
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

const files = readdirSync(resolve('src/content/games')).filter((name) => name.endsWith('.json')).sort()
const games = files.map((file) => JSON.parse(readFileSync(resolve('src/content/games', file), 'utf8')) as Game)
const studyFens = new Set<string>()
for (const game of games) {
  const parsed = new Chess(); parsed.loadPgn(game.pgn)
  const history = parsed.history()
  for (let ply = 0; ply <= history.length; ply += 1) studyFens.add(at(history, ply).fen())
}

const engine = new NodeStockfish()
let failures = 0
const fail = (message: string) => { failures += 1; console.error(`  ✗ ${message}`) }

try {
  await engine.ready()
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
      const correctEval = -(await engine.analyse(correct.fen()))[0].cp
      for (const refutation of moment.refutations ?? []) {
        const wrong = new Chess(before.fen()); wrong.move(refutation.san)
        const analysis = await engine.analyse(wrong.fen())
        const loss = (correctEval + analysis[0].cp) / 100
        const reply = sanFromUci(wrong.fen(), analysis[0].moves[0])
        const lineFirst = refutation.line.trim().split(/\s+/)[0]
        console.log(`  ply ${moment.ply} ${refutation.san}: потеря ${loss.toFixed(2)}, ответ ${reply}`)
        if (loss < 1.5) fail(`ply ${moment.ply} ${refutation.san}: потеря ${loss.toFixed(2)} < 1.50`)
        if (clean(lineFirst) !== clean(reply)) fail(`ply ${moment.ply} ${refutation.san}: line ${lineFirst}, движок ${reply}`)
      }
    }
    for (const [index, drill] of game.drills.entries()) {
      const analysis = await engine.analyse(drill.fen, 2)
      const first = sanFromUci(drill.fen, analysis[0].moves[0])
      const gap = (analysis[0].cp - analysis[1].cp) / 100
      console.log(`  упражнение ${index + 1}: ${first}, отрыв ${gap.toFixed(2)}`)
      if (clean(first) !== clean(drill.answerSan)) fail(`упражнение ${index + 1}: ответ ${drill.answerSan}, движок ${first}`)
      if (gap < 1.5) fail(`упражнение ${index + 1}: отрыв ${gap.toFixed(2)} < 1.50`)
      if (studyFens.has(drill.fen)) fail(`упражнение ${index + 1}: FEN взят из учебной партии`)
    }
  }
} finally { engine.close() }

if (failures) {
  console.error(`\nПроверка движком: ошибок ${failures}`)
  process.exitCode = 1
} else console.log('\n✓ Проверка движком пройдена')
