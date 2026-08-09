import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Key } from '@lichess-org/chessground/types'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.brown.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import { games } from './content/games'
import type { Game, Moment } from './content/types'
import { loadStore, saveProgress } from './storage'

type Screen = { name: 'home' } | { name: 'intro'; game: Game } | { name: 'lesson'; game: Game }

function positionAt(history: string[], ply: number) {
  const chess = new Chess()
  history.slice(0, ply).forEach((san) => chess.move(san))
  return chess
}

function Board({ chess, movable, onMove, flash }: { chess: Chess; movable: boolean; onMove: (from: Key, to: Key) => void; flash: 'right' | 'wrong' | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  useEffect(() => {
    if (!ref.current) return
    api.current = Chessground(ref.current, { orientation: 'white', animation: { enabled: true, duration: 180 } })
    return () => api.current?.destroy()
  }, [])
  useEffect(() => {
    const dests = new Map<Key, Key[]>()
    if (movable) {
      for (const move of chess.moves({ verbose: true })) {
        const from = move.from as Key
        dests.set(from, [...(dests.get(from) ?? []), move.to as Key])
      }
    }
    api.current?.set({
      fen: chess.fen(),
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: { color: movable ? (chess.turn() === 'w' ? 'white' : 'black') : undefined, dests, events: { after: onMove } },
      lastMove: undefined,
      highlight: { lastMove: true, check: true },
    })
  }, [chess, movable, onMove])
  return <div className={`board-wrap ${flash ? `flash-${flash}` : ''}`}><div ref={ref} className="cg-board-host" /></div>
}

function Lesson({ game, onExit }: { game: Game; onExit: () => void }) {
  const history = useMemo(() => { const c = new Chess(); c.loadPgn(game.pgn); return c.history() }, [game.pgn])
  const [ply, setPly] = useState(() => loadStore().progress[game.id]?.currentPly ?? 0)
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(() => loadStore().progress[game.id]?.score ?? 0)
  const [solved, setSolved] = useState<number[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null)
  const chess = useMemo(() => positionAt(history, ply), [history, ply])
  const moment = game.moments.find((item) => item.ply === ply)
  const mustFind = moment?.kind === 'find' && !solved.includes(ply)

  useEffect(() => { saveProgress({ gameId: game.id, currentPly: ply, score, startedAt: Date.now() }) }, [game.id, ply, score])
  useEffect(() => { setAttempts(0); setFeedback(null); setFlash(null) }, [ply])
  const blink = (kind: 'right' | 'wrong') => { setFlash(kind); window.setTimeout(() => setFlash(null), 500) }

  const revealAnswer = (target: Moment) => {
    setSolved((items) => [...items, ply])
    setFeedback(target.explanation)
  }
  const onMove = (from: Key, to: Key) => {
    if (!mustFind || !moment) return
    const trial = positionAt(history, ply)
    const move = trial.move({ from, to, promotion: 'q' })
    if (!move) return
    const accepted = [moment.answerSan, ...(moment.altAcceptable ?? [])].includes(move.san)
    if (accepted) {
      const gained = Math.max(1, 3 - attempts)
      setScore((value) => value + gained)
      blink('right')
      revealAnswer(moment)
      return
    }
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    blink('wrong')
    if (nextAttempt >= 3) {
      setFeedback(`Правильный ход: ${moment.answerSan}. ${moment.explanation}`)
      setSolved((items) => [...items, ply])
    } else {
      const refutation = moment.refutations?.find((item) => item.san === move.san)
      setFeedback(refutation ? `${refutation.why} Ответ соперника: ${refutation.line}.` : moment.hints[nextAttempt - 1])
    }
  }
  const moveTo = (next: number) => {
    if (mustFind) return
    const bounded = Math.max(0, Math.min(next, history.length))
    if (bounded > ply) {
      const blocked = game.moments.find((item) => item.kind === 'find' && item.ply >= ply && item.ply < bounded && !solved.includes(item.ply))
      if (blocked) { setPly(blocked.ply); return }
    }
    setPly(bounded)
  }
  const visibleFeedback = feedback ?? (moment?.kind === 'explain' ? moment.explanation : null)

  return <main className="lesson-shell">
    <header className="lesson-top"><button className="back" onClick={onExit}>← Выйти</button><span>{ply}/{history.length}</span><strong>{score} очков</strong></header>
    <Board chess={chess} movable={Boolean(mustFind)} onMove={onMove} flash={flash} />
    <section className="coach-card">
      <span className="eyebrow">{mustFind ? `Твоя очередь · попытка ${attempts + 1} из 3` : moment ? 'Разбор позиции' : 'Ходы партии'}</span>
      <h2>{mustFind ? moment?.prompt : moment?.prompt ?? 'Следи, как развивается партия'}</h2>
      {visibleFeedback && <p className="feedback">{visibleFeedback}</p>}
      {mustFind && attempts === 0 && <p>Сделай ход фигурой прямо на доске.</p>}
      {!mustFind && moment?.kind === 'find' && solved.includes(ply) && <button className="primary" onClick={() => setPly((value) => Math.min(value + 1, history.length))}>Продолжить</button>}
    </section>
    <nav className="lesson-nav" aria-label="Навигация по партии">
      <button onClick={() => moveTo(0)} disabled={mustFind || ply === 0}>В начало</button>
      <button onClick={() => moveTo(ply - 1)} disabled={mustFind || ply === 0}>← Назад</button>
      <button onClick={() => moveTo(ply + 1)} disabled={mustFind || ply === history.length}>Вперёд →</button>
    </nav>
    <div className="move-strip">
      {history.map((san, index) => <button key={`${san}-${index}`} className={ply === index + 1 ? 'active' : ''} onClick={() => moveTo(index + 1)} disabled={mustFind}>{index % 2 === 0 ? `${index / 2 + 1}. ` : ''}{san}</button>)}
    </div>
  </main>
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [store] = useState(loadStore)
  if (screen.name === 'lesson') return <Lesson game={screen.game} onExit={() => setScreen({ name: 'intro', game: screen.game })} />
  if (screen.name === 'intro') return <main className="shell"><button className="back" onClick={() => setScreen({ name: 'home' })}>← На главную</button><section className="hero intro"><span className="eyebrow">Урок 1 · {screen.game.opening}</span><h1>{screen.game.title}</h1><p>{screen.game.intro}</p><div className="lesson-facts"><span>8 ходов для поиска</span><span>13 разборов</span><span>около 60 минут</span></div><button className="primary" onClick={() => setScreen({ name: 'lesson', game: screen.game })}>Начать урок</button></section></main>
  const game = games[0]
  const progress = store.progress[game.id]
  return <main className="shell"><header className="topbar"><span className="mark">♞</span><span>Шахматный тренер</span></header><section className="hero"><span className="eyebrow">Классические партии</span><h1>Думай как чемпион</h1><p>Находи сильные ходы сам, разбирай ошибки и доигрывай позиции против компьютера.</p></section><section aria-labelledby="lessons-title"><div className="section-title"><h2 id="lessons-title">Твои уроки</h2><span>1 партия</span></div><button className="game-card" onClick={() => setScreen({ name: 'intro', game })}><span className="game-number">01</span><span className="game-copy"><strong>{game.title}</strong><small>{game.opening} · уровень {game.level}</small></span><span className="arrow">→</span><span className="progress-track"><span style={{ width: `${progress ? Math.round(progress.currentPly / 87 * 100) : 0}%` }} /></span></button></section><button className="mistakes" disabled><span>Работа над ошибками</span><small>Здесь появятся позиции, в которых ты ошибся</small></button></main>
}
