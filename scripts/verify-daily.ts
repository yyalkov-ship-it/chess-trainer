import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dailyPuzzleIds } from '../src/puzzle-queue'
import type { Game } from '../src/content/types'

const games = readdirSync(resolve('src/content/games')).filter((name) => name.endsWith('.json')).sort().map((file) => JSON.parse(readFileSync(resolve('src/content/games', file), 'utf8')) as Game)
const pool = games.flatMap((game) => game.drills.map((_, index) => ({ id: `${game.id}#${index}` })))
const day = process.argv[2] ?? '2026-08-13'
console.log(dailyPuzzleIds(pool, day).join(', '))
