import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { Chess } from 'chess.js'

export type Pv = { rank: number; cp: number; moves: string[] }
export class NodeStockfish {
  private child: ChildProcessWithoutNullStreams
  private lines: string[] = []
  private wake: (() => void) | null = null
  constructor() {
    const native = [process.env.STOCKFISH_PATH, '/opt/homebrew/bin/stockfish', '/usr/games/stockfish'].find((path) => path && existsSync(path))
    this.child = native
      ? spawn(native, [])
      : spawn(process.execPath, [resolve('node_modules/stockfish/bin/stockfish-18.js')])
    createInterface({ input: this.child.stdout }).on('line', (line) => { this.lines.push(line); this.wake?.() })
  }
  private send(command: string) { this.child.stdin.write(`${command}\n`) }
  private async waitFor(match: (line: string) => boolean, timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const index = this.lines.findIndex(match)
      if (index >= 0) return this.lines.splice(0, index + 1)
      await new Promise<void>((done) => { const timer = setTimeout(done, 100); this.wake = () => { clearTimeout(timer); this.wake = null; done() } })
    }
    this.send('stop'); throw new Error('Stockfish не ответил')
  }
  async ready() { this.send('uci'); await this.waitFor((l) => l === 'uciok'); this.send('setoption name Threads value 1'); this.send('setoption name Hash value 256'); this.send('isready'); await this.waitFor((l) => l === 'readyok') }
  async analyse(fen: string, multiPv = 1, depth = 20): Promise<Pv[]> {
    this.lines.length = 0; this.send('setoption name Clear Hash'); this.send(`setoption name MultiPV value ${multiPv}`); this.send(`position fen ${fen}`); this.send(`go depth ${depth}`)
    const lines = await this.waitFor((l) => l.startsWith('bestmove ')); const results = new Map<number, Pv>()
    for (const line of lines) { const f = line.match(new RegExp(`^info depth ${depth} .*multipv (\\d+).* score (cp|mate) (-?\\d+).* pv (.+)$`)); if (!f) continue; const rank=Number(f[1]), raw=Number(f[3]); results.set(rank,{rank,cp:f[2]==='mate'?Math.sign(raw)*100000:raw,moves:f[4].trim().split(/\s+/)}) }
    return [...results.values()].sort((a,b)=>a.rank-b.rank)
  }
  close() { this.send('quit') }
}
export const sanFromUci = (fen: string, uci: string) => new Chess(fen).move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]??'q'}).san
