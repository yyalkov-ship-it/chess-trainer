import type { Game } from './types'

const modules = import.meta.glob('./games/*.json', { eager: true, import: 'default' })

export const games = Object.values(modules) as Game[]
