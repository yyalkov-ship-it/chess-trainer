import { useState } from 'react'
import { games } from './content/games'
import type { Game } from './content/types'
import { loadStore } from './storage'

type Screen = { name: 'home' } | { name: 'intro'; game: Game }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [store] = useState(loadStore)

  if (screen.name === 'intro') {
    return (
      <main className="shell">
        <button className="back" onClick={() => setScreen({ name: 'home' })}>← На главную</button>
        <section className="hero intro">
          <span className="eyebrow">Урок 1 · {screen.game.opening}</span>
          <h1>{screen.game.title}</h1>
          <p>{screen.game.intro}</p>
          <div className="lesson-facts">
            <span>8 ходов для поиска</span><span>13 разборов</span><span>около 60 минут</span>
          </div>
          <button className="primary" disabled>Начать — скоро</button>
        </section>
      </main>
    )
  }

  const game = games[0]
  const progress = store.progress[game.id]
  return (
    <main className="shell">
      <header className="topbar"><span className="mark">♞</span><span>Шахматный тренер</span></header>
      <section className="hero">
        <span className="eyebrow">Классические партии</span>
        <h1>Думай как чемпион</h1>
        <p>Находи сильные ходы сам, разбирай ошибки и доигрывай позиции против компьютера.</p>
      </section>
      <section aria-labelledby="lessons-title">
        <div className="section-title"><h2 id="lessons-title">Твои уроки</h2><span>1 партия</span></div>
        <button className="game-card" onClick={() => setScreen({ name: 'intro', game })}>
          <span className="game-number">01</span>
          <span className="game-copy"><strong>{game.title}</strong><small>{game.opening} · уровень {game.level}</small></span>
          <span className="arrow">→</span>
          <span className="progress-track"><span style={{ width: `${progress ? 20 : 0}%` }} /></span>
        </button>
      </section>
      <button className="mistakes" disabled><span>Работа над ошибками</span><small>Здесь появятся позиции, в которых ты ошибся</small></button>
    </main>
  )
}
