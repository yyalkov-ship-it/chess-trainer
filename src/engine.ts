export type EngineEvaluation = { centipawns: number; bestMove: string; depth: number }

type Pending = {
  resolve: (value: EngineEvaluation) => void
  reject: (reason: Error) => void
  bestMove: string
  centipawns: number
  depth: number
  timeout: number
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
      window.clearTimeout(this.pending.timeout)
      const result = { centipawns: this.pending.centipawns, depth: this.pending.depth, bestMove: best[1] }
      const resolve = this.pending.resolve
      this.pending = null
      resolve(result)
    }
  }

  private run(fen: string, moveTime: number, strength?: 1200 | 1500 | 1800) {
    const task = async () => {
      await this.start()
      return new Promise<EngineEvaluation>((resolve, reject) => {
        if (!this.worker) { reject(new Error('Движок недоступен')); return }
        const timeout = window.setTimeout(() => {
          this.worker?.postMessage('stop')
          const pending = this.pending
          this.pending = null
          pending?.reject(new Error('Stockfish превысил время анализа'))
        }, moveTime + 4_000)
        this.pending = { resolve, reject, bestMove: '', centipawns: 0, depth: 0, timeout }
        this.worker.postMessage('ucinewgame')
        if (strength) {
          this.worker.postMessage('setoption name UCI_LimitStrength value true')
          this.worker.postMessage(`setoption name UCI_Elo value ${strength}`)
          this.worker.postMessage(`setoption name Skill Level value ${strength === 1200 ? 2 : strength === 1500 ? 6 : 10}`)
        } else {
          this.worker.postMessage('setoption name UCI_LimitStrength value false')
          this.worker.postMessage('setoption name Skill Level value 20')
        }
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
    return this.run(fen, 650, level)
  }
}

export const engine = new StockfishEngine()

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' }
}

export function heroEvaluation(evaluation: EngineEvaluation, fen: string, heroColor: 'w' | 'b') {
  const sideToMove = fen.split(' ')[1]
  return sideToMove === heroColor ? evaluation.centipawns : -evaluation.centipawns
}

export function humanEvaluation(centipawns: number) {
  const value = Math.abs(centipawns) / 100
  if (value < 0.5) return 'позиция примерно равна'
  const side = centipawns > 0 ? 'у тебя лучше' : 'ты стоишь хуже'
  if (value < 1.8) return `${side} примерно на пешку (${value.toFixed(1)})`
  if (value < 4.5) return `${side} примерно на ${value.toFixed(1)} пешки`
  return `${side} примерно на ладью (${value.toFixed(1)})`
}
