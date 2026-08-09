const KEY = 'chess-trainer:v1'

export type Progress = { gameId: string; currentPly: number; score: number; startedAt: number }
type Store = { progress: Record<string, Progress>; streak: { lastDay: string; count: number } }
const empty: Store = { progress: {}, streak: { lastDay: '', count: 0 } }

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) as Store } : empty
  } catch {
    return empty
  }
}

export function saveProgress(progress: Progress) {
  const store = loadStore()
  store.progress[progress.gameId] = progress
  localStorage.setItem(KEY, JSON.stringify(store))
}
