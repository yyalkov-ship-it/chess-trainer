import { games } from './games'
import type { Drill, DrillMotif, GameTheme } from './types'

export type Puzzle = Drill & {
  id: string
  gameId: string
  gameTitle: string
  theme: GameTheme
  level: 1 | 2 | 3
  motif: DrillMotif
}

export const puzzles: Puzzle[] = games.flatMap((game) => game.drills.map((drill, index) => ({
  ...drill,
  id: `${game.id}#${index}`,
  gameId: game.id,
  gameTitle: game.title,
  theme: game.theme,
  level: game.level,
})))

export const motifLabels: Record<DrillMotif, string> = {
  mate: 'Мат',
  material: 'Выигрыш материала',
  sacrifice: 'Жертва',
  quiet: 'Тихий ход',
  endgame: 'Эндшпиль',
  promotion: 'Превращение пешки',
}

export const puzzleMotifs = Object.keys(motifLabels) as DrillMotif[]
