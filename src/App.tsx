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
import { addMistake, loadStore, registerStudyDay, reviewMistake, saveProgress, type MistakeTask } from './storage'
import { engine, heroEvaluation, humanEvaluation, uciToMove } from './engine'

type Screen = { name: 'home' } | { name: 'intro'; game: Game } | { name: 'lesson'; game: Game } | { name: 'result'; game: Game } | { name: 'drills'; game: Game } | { name: 'mistakes' }
type RefutationPlayback = { moves: string[]; shown: number; why: string }

function positionAt(history: string[], ply: number) {
  const chess = new Chess()
  history.slice(0, ply).forEach((san) => chess.move(san))
  return chess
}

function gamePlyCount(game: Game) {
  const chess = new Chess()
  chess.loadPgn(game.pgn)
  return chess.history().length
}

type BoardProps = { chess: Chess; movable: boolean; onMove: (from: Key, to: Key) => void; flash: 'right' | 'wrong' | null; orientation?: 'white' | 'black'; lastMove?: Key[]; moment?: Moment }

function Board({ chess, movable, onMove, flash, orientation = 'white', lastMove, moment }: BoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  useEffect(() => {
    if (!ref.current) return
    api.current = Chessground(ref.current, { orientation, animation: { enabled: true, duration: 180 } })
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
      orientation,
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: { color: movable ? (chess.turn() === 'w' ? 'white' : 'black') : undefined, dests, events: { after: onMove } },
      lastMove,
      highlight: { lastMove: true, check: true },
      drawable: { autoShapes: [
        ...(moment?.arrows ?? []).map((arrow) => ({ orig: arrow.from as Key, dest: arrow.to as Key, brush: arrow.color })),
        ...(moment?.highlight ?? []).map((square) => ({ orig: square as Key, brush: 'blue' })),
      ] },
    })
  }, [chess, movable, onMove, orientation, lastMove, moment])
  return <div className={`board-wrap ${flash ? `flash-${flash}` : ''}`}><div ref={ref} className="cg-board-host" /></div>
}

function PlayMode({ initialFen, heroColor, onExit }: { initialFen: string; heroColor: 'w' | 'b'; onExit: () => void }) {
  const [chess, setChess] = useState(() => new Chess(initialFen))
  const [level, setLevel] = useState<1200 | 1500 | 1800>(1200)
  const [thinking, setThinking] = useState(false)
  const heroName = heroColor === 'w' ? 'белыми' : 'чёрными'
  const [message, setMessage] = useState(`Ты играешь ${heroName}. Сделай ход.`)
  const [evaluation, setEvaluation] = useState(0)
  const history = useRef<string[]>([initialFen])

  const updateEvaluation = async (position: Chess) => {
    try {
      const result = await engine.evaluate(position.fen(), 500)
      const whiteScore = position.turn() === 'w' ? result.centipawns : -result.centipawns
      setEvaluation(Math.max(-800, Math.min(800, whiteScore)))
    } catch { /* игра остаётся доступной и без полоски оценки */ }
  }

  const onMove = async (from: Key, to: Key) => {
    if (thinking || chess.turn() !== heroColor || chess.isGameOver()) return
    const next = new Chess(chess.fen())
    if (!next.move({ from, to, promotion: 'q' })) return
    history.current.push(next.fen())
    setChess(next)
    if (next.isGameOver()) { setMessage('Партия закончена.'); return }
    setThinking(true)
    setMessage('Компьютер думает…')
    try {
      const result = await engine.bestMove(next.fen(), level)
      const reply = uciToMove(result.bestMove)
      const played = next.move(reply)
      if (!played) throw new Error('Движок предложил неверный ход')
      history.current.push(next.fen())
      setChess(new Chess(next.fen()))
      setMessage(next.isGameOver() ? 'Партия закончена.' : `Компьютер сыграл ${played.san}. Твой ход.`)
      void updateEvaluation(next)
    } catch {
      setMessage('Движок не ответил. Можно взять ход назад и попробовать ещё раз.')
    } finally { setThinking(false) }
  }

  const undo = () => {
    if (thinking || history.current.length <= 1) return
    history.current.splice(Math.max(1, history.current.length - 2))
    const restored = new Chess(history.current.at(-1) ?? initialFen)
    setChess(restored)
    setMessage('Ходы отменены. Попробуй другой план.')
    void updateEvaluation(restored)
  }

  const whiteShare = 50 + evaluation / 16
  return <main className="lesson-shell">
    <header className="lesson-top"><button className="back" onClick={onExit}>← К разбору</button><span>Игра с компьютером</span><strong>{level} Эло</strong></header>
    <div className="eval-track" aria-label="Оценка позиции"><span style={{ width: `${whiteShare}%` }} /></div>
    <Board chess={chess} orientation={heroColor === 'w' ? 'white' : 'black'} movable={!thinking && chess.turn() === heroColor && !chess.isGameOver()} onMove={onMove} flash={null} />
    <section className="coach-card play-card">
      <span className="eyebrow">Доигрывание</span><h2>{message}</h2>
      <label>Сила соперника<select value={level} disabled={thinking} onChange={(event) => setLevel(Number(event.target.value) as 1200 | 1500 | 1800)}><option value={1200}>1200</option><option value={1500}>1500</option><option value={1800}>1800</option></select></label>
      <div className="play-actions"><button onClick={undo} disabled={thinking || history.current.length <= 1}>Взять ход назад</button><button onClick={onExit}>Сдаться и вернуться</button></div>
    </section>
  </main>
}

function Lesson({ game, onExit, onComplete }: { game: Game; onExit: () => void; onComplete: () => void }) {
  const history = useMemo(() => { const c = new Chess(); c.loadPgn(game.pgn); return c.history() }, [game.pgn])
  const [ply, setPly] = useState(() => loadStore().progress[game.id]?.currentPly ?? 0)
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(() => loadStore().progress[game.id]?.score ?? 0)
  const saved = useMemo(() => loadStore().progress[game.id], [game.id])
  const [solved, setSolved] = useState<number[]>(() => saved?.solved ?? [])
  const [mistakes, setMistakes] = useState<number[]>(() => saved?.mistakes ?? [])
  const startedAt = useRef(saved?.startedAt ?? Date.now())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null)
  const [playFen, setPlayFen] = useState<string | null>(null)
  const [engineBusy, setEngineBusy] = useState(false)
  const [refutationPlayback, setRefutationPlayback] = useState<RefutationPlayback | null>(null)
  const chess = useMemo(() => positionAt(history, ply), [history, ply])
  const moment = game.moments.find((item) => item.ply === ply)
  const mustFind = moment?.kind === 'find' && !solved.includes(ply)
  const lastMove = useMemo(() => {
    if (ply === 0) return undefined
    const previous = positionAt(history, ply - 1)
    const move = previous.move(history[ply - 1])
    return move ? [move.from as Key, move.to as Key] : undefined
  }, [history, ply])

  useEffect(() => { saveProgress({ gameId: game.id, currentPly: ply, score, startedAt: startedAt.current, solved, mistakes }) }, [game.id, ply, score, solved, mistakes])
  useEffect(() => { setAttempts(0); setFeedback(null); setFlash(null); setRefutationPlayback(null) }, [ply])
  useEffect(() => {
    if (!refutationPlayback || refutationPlayback.shown >= refutationPlayback.moves.length) return
    const timer = window.setTimeout(() => {
      setRefutationPlayback((current) => current ? { ...current, shown: current.shown + 1 } : null)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [refutationPlayback])
  const blink = (kind: 'right' | 'wrong') => { setFlash(kind); window.setTimeout(() => setFlash(null), 500) }

  const revealAnswer = (target: Moment) => {
    setSolved((items) => [...items, ply])
    setFeedback(target.explanation)
  }
  const onMove = async (from: Key, to: Key) => {
    if (!mustFind || !moment) return
    const trial = positionAt(history, ply)
    const move = trial.move({ from, to, promotion: 'q' })
    if (!move) return
    const accepted = [moment.answerSan, ...(moment.altAcceptable ?? [])].includes(move.san)
    if (accepted) {
      registerStudyDay()
      const gained = Math.max(1, 3 - attempts)
      setScore((value) => value + gained)
      blink('right')
      revealAnswer(moment)
      return
    }
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    setMistakes((items) => items.includes(ply) ? items : [...items, ply])
    addMistake({ gameId: game.id, ply, fen: chess.fen(), prompt: moment.prompt, answerSan: moment.answerSan, explanation: moment.explanation })
    blink('wrong')
    if (nextAttempt >= 3) {
      setFeedback(`Правильный ход: ${moment.answerSan}. ${moment.explanation}`)
      setSolved((items) => [...items, ply])
    } else {
      const refutation = moment.refutations?.find((item) => item.san === move.san)
      if (refutation) {
        const moves = [move.san, ...refutation.line.trim().split(/\s+/).filter(Boolean)]
        setRefutationPlayback({ moves, shown: 1, why: refutation.why })
        setFeedback(refutation.why)
      } else {
        setFeedback(`${moment.hints[nextAttempt - 1]} Stockfish проверяет твою идею…`)
        setEngineBusy(true)
        try {
          const before = await engine.evaluate(chess.fen(), 700)
          const after = await engine.evaluate(trial.fen(), 900)
          const beforeForHero = heroEvaluation(before, chess.fen(), game.heroColor)
          const afterForHero = heroEvaluation(after, trial.fen(), game.heroColor)
          const change = afterForHero - beforeForHero
          const reply = new Chess(trial.fen())
          const best = reply.move(uciToMove(after.bestMove))
          const verdict = change < -50 ? `Стало хуже на ${(Math.abs(change) / 100).toFixed(1)} пешки.` : change > 50 ? `Стало лучше на ${(change / 100).toFixed(1)} пешки.` : 'Оценка почти не изменилась.'
          setFeedback(`До хода: ${humanEvaluation(beforeForHero)}. После твоего хода: ${humanEvaluation(afterForHero)}. ${verdict} Лучший ответ соперника — ${best?.san ?? after.bestMove}. ${moment.hints[nextAttempt - 1]}`)
        } catch {
          setFeedback(`${moment.hints[nextAttempt - 1]} Движок сейчас недоступен, но можно продолжать урок.`)
        } finally { setEngineBusy(false) }
      }
    }
  }
  const moveTo = (next: number) => {
    if (mustFind) return
    const bounded = Math.max(0, Math.min(next, history.length))
    if (bounded > ply) {
      const blocked = game.moments.find((item) => item.kind === 'find' && item.ply >= ply && item.ply < bounded && !solved.includes(item.ply))
      if (blocked) { setPly(blocked.ply); return }
    }
    if (bounded === history.length) {
      saveProgress({ gameId: game.id, currentPly: bounded, score, startedAt: startedAt.current, solved, mistakes, completedAt: Date.now() })
      registerStudyDay()
      onComplete()
      return
    }
    setPly(bounded)
  }
  const visibleFeedback = feedback ?? (moment?.kind === 'explain' ? moment.explanation : null)
  const displayedChess = useMemo(() => {
    if (!refutationPlayback) return chess
    const branch = new Chess(chess.fen())
    for (const san of refutationPlayback.moves.slice(0, refutationPlayback.shown)) branch.move(san)
    return branch
  }, [chess, refutationPlayback])
  const playbackLastMove = useMemo(() => {
    if (!refutationPlayback?.shown) return lastMove
    const branch = new Chess(chess.fen())
    let latest: { from: string; to: string } | null = null
    for (const san of refutationPlayback.moves.slice(0, refutationPlayback.shown)) latest = branch.move(san)
    return latest ? [latest.from as Key, latest.to as Key] : lastMove
  }, [chess, lastMove, refutationPlayback])

  if (playFen) return <PlayMode initialFen={playFen} heroColor={game.heroColor} onExit={() => setPlayFen(null)} />
  return <main className="lesson-shell">
    <header className="lesson-top"><button className="back" onClick={onExit}>← Выйти</button><span>{ply}/{history.length}</span><strong>{score} очков</strong></header>
    <Board chess={displayedChess} orientation={game.heroColor === 'w' ? 'white' : 'black'} movable={Boolean(mustFind && !refutationPlayback)} onMove={onMove} flash={flash} lastMove={playbackLastMove} moment={refutationPlayback || (moment?.kind === 'find' && !solved.includes(ply)) ? undefined : moment} />
    <section className="coach-card">
      <span className="eyebrow">{mustFind ? `Твоя очередь · попытка ${attempts + 1} из 3` : moment ? 'Разбор позиции' : 'Ходы партии'}</span>
      <h2>{mustFind ? moment?.prompt : moment?.prompt ?? 'Следи, как развивается партия'}</h2>
      {visibleFeedback && <p className="feedback">{visibleFeedback}</p>}
      {engineBusy && <p className="engine-status">Анализ позиции…</p>}
      {refutationPlayback && refutationPlayback.shown < refutationPlayback.moves.length && <p className="engine-status">Смотри ответ соперника: ход {refutationPlayback.shown} из {refutationPlayback.moves.length}</p>}
      {refutationPlayback && refutationPlayback.shown >= refutationPlayback.moves.length && <button className="primary" onClick={() => { setRefutationPlayback(null); setFeedback(moment?.hints[Math.min(attempts - 1, (moment?.hints.length ?? 1) - 1)] ?? null) }}>Вернуться и попробовать снова</button>}
      {mustFind && attempts === 0 && <p>Сделай ход фигурой прямо на доске.</p>}
      {!mustFind && moment?.kind === 'find' && solved.includes(ply) && <button className="primary" onClick={() => setPly((value) => Math.min(value + 1, history.length))}>Продолжить</button>}
      {moment && !mustFind && <button className="secondary" onClick={() => setPlayFen(chess.fen())}>Сыграть эту позицию</button>}
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

function PuzzleBoard({ fen, prompt, answerSan, explanation, onDone }: { fen: string; prompt: string; answerSan: string; explanation: string; onDone: (correct: boolean) => void }) {
  const chess = useMemo(() => new Chess(fen), [fen])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const onMove = (from: Key, to: Key) => {
    if (finished) return
    const trial = new Chess(fen)
    const move = trial.move({ from, to, promotion: 'q' })
    if (!move) return
    const correct = move.san === answerSan
    setFeedback(correct ? `Верно! ${explanation}` : `Пока нет. Правильный ход: ${answerSan}. ${explanation}`)
    setFinished(true)
    onDone(correct)
  }
  return <><Board chess={chess} orientation={chess.turn() === 'w' ? 'white' : 'black'} movable={!finished} onMove={onMove} flash={finished ? (feedback?.startsWith('Верно') ? 'right' : 'wrong') : null} /><section className="coach-card"><span className="eyebrow">Найди ход</span><h2>{prompt}</h2>{feedback ? <p className="feedback">{feedback}</p> : <p>Сделай ход на доске.</p>}</section></>
}

function Drills({ game, onExit }: { game: Game; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const drill = game.drills[index]
  if (!drill) return <main className="shell"><section className="hero intro"><span className="eyebrow">{game.drills.length ? 'Упражнения завершены' : 'Упражнений пока нет'}</span><h1>{score} из {game.drills.length}</h1>{game.drills.length > 0 ? <p>Ты повторил главные идеи партии: размен защитника, вскрытие линий и тихие ходы в атаке.</p> : <p>Для этой партии упражнения ещё не добавлены.</p>}<button className="primary" onClick={onExit}>На главную</button></section></main>
  return <main className="lesson-shell"><header className="lesson-top"><button className="back" onClick={onExit}>← Выйти</button><span>Упражнение {index + 1}/{game.drills.length}</span><strong>{score} верно</strong></header><PuzzleBoard key={index} {...drill} onDone={(correct) => { if (correct) setScore((value) => value + 1); window.setTimeout(() => setIndex((value) => value + 1), 1200) }} /></main>
}

function Mistakes({ onExit }: { onExit: () => void }) {
  const [tasks, setTasks] = useState<MistakeTask[]>(() => Object.values(loadStore().mistakes).sort((a, b) => a.dueAt - b.dueAt))
  const [index, setIndex] = useState(0)
  const task = tasks[index]
  if (!task) return <main className="shell"><button className="back" onClick={onExit}>← На главную</button><section className="hero intro"><span className="eyebrow">Работа над ошибками</span><h1>Всё чисто</h1><p>Сейчас нет позиций для повторения. Новые появятся после ошибок в уроке.</p></section></main>
  const due = task.dueAt <= Date.now()
  return <main className="lesson-shell"><header className="lesson-top"><button className="back" onClick={onExit}>← Выйти</button><span>{index + 1}/{tasks.length}</span><strong>{due ? 'Пора повторить' : `через ${Math.max(1, Math.ceil((task.dueAt - Date.now()) / 86_400_000))} дн.`}</strong></header>{due ? <PuzzleBoard key={task.id} fen={task.fen} prompt={task.prompt} answerSan={task.answerSan} explanation={task.explanation} onDone={(correct) => { reviewMistake(task.id, correct); window.setTimeout(() => { const next = Object.values(loadStore().mistakes).sort((a, b) => a.dueAt - b.dueAt); setTasks(next); setIndex(0) }, 1200) }} /> : <section className="coach-card"><span className="eyebrow">Следующее повторение</span><h2>Возвращайся позже</h2><p>Интервалы растут: один день, три дня, затем неделя. После двух верных решений подряд позиция уйдёт из списка.</p></section>}</main>
}

function Result({ game, onHome, onDrills }: { game: Game; onHome: () => void; onDrills: () => void }) {
  const progress = loadStore().progress[game.id]
  const max = game.moments.filter((item) => item.kind === 'find').length * 3
  const percent = Math.round((progress?.score ?? 0) / max * 100)
  const minutes = Math.max(1, Math.round(((progress?.completedAt ?? Date.now()) - (progress?.startedAt ?? Date.now())) / 60_000))
  return <main className="shell"><section className="hero intro"><span className="eyebrow">Партия завершена</span><h1>{percent >= 70 ? 'Урок пройден!' : 'Хорошая тренировка'}</h1><p>{progress?.score ?? 0} из {max} очков · {minutes} мин. Ошибок для повторения: {progress?.mistakes.length ?? 0}.</p><div className="result-actions"><button className="primary" onClick={onDrills}>Перейти к упражнениям</button><button className="secondary" onClick={onHome}>На главную</button></div></section></main>
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const store = loadStore()
  if (screen.name === 'lesson') return <Lesson game={screen.game} onExit={() => setScreen({ name: 'intro', game: screen.game })} onComplete={() => setScreen({ name: 'result', game: screen.game })} />
  if (screen.name === 'result') return <Result game={screen.game} onHome={() => setScreen({ name: 'home' })} onDrills={() => setScreen({ name: 'drills', game: screen.game })} />
  if (screen.name === 'drills') return <Drills game={screen.game} onExit={() => setScreen({ name: 'home' })} />
  if (screen.name === 'mistakes') return <Mistakes onExit={() => setScreen({ name: 'home' })} />
  if (screen.name === 'intro') return <main className="shell"><button className="back" onClick={() => setScreen({ name: 'home' })}>← На главную</button><section className="hero intro"><span className="eyebrow">Урок · {screen.game.opening}</span><h1>{screen.game.title}</h1><p>{screen.game.intro}</p><div className="lesson-facts"><span>{screen.game.moments.filter((item) => item.kind === 'find').length} ходов для поиска</span><span>{screen.game.moments.length} разборов</span><span>{screen.game.drills.length} упражнений</span></div><button className="primary" onClick={() => setScreen({ name: 'lesson', game: screen.game })}>Начать урок</button></section></main>
  const mistakeCount = Object.values(store.mistakes).filter((task) => task.dueAt <= Date.now()).length
  const gameWord = games.length % 10 === 1 && games.length % 100 !== 11 ? 'партия' : [2, 3, 4].includes(games.length % 10) && ![12, 13, 14].includes(games.length % 100) ? 'партии' : 'партий'
  const themeSections = [
    { theme: 'attack', title: 'Атака на короля' },
    { theme: 'positional', title: 'Позиционная игра' },
    { theme: 'endgame', title: 'Эндшпиль' },
  ] as const
  let gameNumber = 0
  return <main className="shell"><header className="topbar"><span className="mark">♞</span><span>Шахматный тренер</span><span className="streak">🔥 {store.streak.count}</span></header><section className="hero"><span className="eyebrow">Классические партии</span><h1>Думай как чемпион</h1><p>Находи сильные ходы сам, разбирай ошибки и доигрывай позиции против компьютера.</p></section><section aria-labelledby="lessons-title"><div className="section-title"><h2 id="lessons-title">Твои уроки</h2><span>{games.length} {gameWord}</span></div>{themeSections.map(({ theme, title }) => { const themedGames = games.filter((game) => game.theme === theme); return <section className="theme-section" key={theme} aria-labelledby={`theme-${theme}`}><h3 id={`theme-${theme}`}>{title}</h3><div className="game-list">{themedGames.map((game) => { gameNumber += 1; const progress = store.progress[game.id]; const totalPly = gamePlyCount(game); return <button key={game.id} className="game-card" onClick={() => setScreen({ name: 'intro', game })}><span className="game-number">{String(gameNumber).padStart(2, '0')}</span><span className="game-copy"><strong>{game.title}</strong><small>{progress?.completedAt ? 'Пройдено' : progress ? 'В процессе' : `${game.opening} · уровень ${game.level}`}</small></span><span className="arrow">→</span><span className="progress-track"><span style={{ width: `${progress ? Math.round(progress.currentPly / totalPly * 100) : 0}%` }} /></span></button> })}</div></section> })}</section><button className="mistakes" onClick={() => setScreen({ name: 'mistakes' })}><span>Работа над ошибками {mistakeCount ? `· ${mistakeCount}` : ''}</span><small>{mistakeCount ? 'Повтори позиции, где было трудно' : 'Здесь появятся позиции, в которых ты ошибся'}</small></button></main>
}
