export type EngineEvaluation = { centipawns: number; bestMove: string; depth: number }

type Pending = {
  resolve: (value: EngineEvaluation) => void
  bestMove: string
  centipawns: number
  depth: number
}

class StockfishEngine {
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private pending: Pending | null = null
  private queue: Promise<unknown> = Promise.resolve()

  private start() {
    if (this.ready) return this.ready
    this.ready = new Promise((resolve, reject) => {
      const worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-18-lite-single.js`)
      this.worker = worker
      const timeout = window.setTimeout(() => reject(new Error('Движок не запустился')), 12_000)
      worker.onerror = () => reject(new Error('Не удалось загрузить Stockfish'))
      worker.onmessage = (event) => {
        const line = String(event.data)
        if (line === 'uciok') { worker.postMessage('isready'); return }
        if (line === 'readyok') { window.clearTimeout(timeout); resolve(); return }
        this.consume(line)
      }
      worker.postMessage('uci')
    })
    return this.ready
  }

  private consume(line: string) {
    if (!this.pending) return
    const info = line.match(/info depth (\d+).* score (cp|mate) (-?\d+).* pv ([a-h][1-8][a-h][1-8][qrbn]?)/)
    if (info) {
      this.pending.depth = Number(info[1])
      const raw = Number(info[3])
      this.pending.centipawns = info[2] === 'mate' ? Math.sign(raw) * 100_000 : raw
      this.pending.bestMove = info[4]
    }
    const best = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/)
    if (best) {
      const result = { centipawns: this.pending.centipawns, depth: this.pending.depth, bestMove: best[1] }
      const resolve = this.pending.resolve
      this.pending = null
      resolve(result)
    }
  }

  private run(fen: string, moveTime: number, skill = 20) {
    const task = async () => {
      await this.start()
      return new Promise<EngineEvaluation>((resolve, reject) => {
        if (!this.worker) { reject(new Error('Движок недоступен')); return }
        this.pending = { resolve, bestMove: '', centipawns: 0, depth: 0 }
        this.worker.postMessage('ucinewgame')
        this.worker.postMessage(`setoption name Skill Level value ${skill}`)
        this.worker.postMessage(`position fen ${fen}`)
        this.worker.postMessage(`go movetime ${moveTime}`)
      })
    }
    const result = this.queue.then(task, task)
    this.queue = result.catch(() => undefined)
    return result
  }

  evaluate(fen: string, moveTime = 1_200) { return this.run(fen, moveTime) }

  bestMove(fen: string, level: 1200 | 1500 | 1800) {
    return this.run(fen, 650, level === 1200 ? 2 : level === 1500 ? 6 : 10)
  }
}

export const engine = new StockfishEngine()

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' }
}

export function humanEvaluation(centipawns: number) {
  const value = Math.abs(centipawns) / 100
  if (value < 0.5) return 'позиция примерно равна'
  if (value < 1.8) return `перевес примерно в пешку (${value.toFixed(1)})`
  if (value < 4.5) return `серьёзный перевес (${value.toFixed(1)} пешки)`
  return `перевес примерно как лишняя ладья (${value.toFixed(1)})`
}
