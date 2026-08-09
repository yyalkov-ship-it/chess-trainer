const KEY = 'chess-trainer:v1'

export type Progress = {
  gameId: string
  currentPly: number
  score: number
  startedAt: number
  solved: number[]
  mistakes: number[]
  completedAt?: number
}

export type MistakeTask = {
  id: string
  gameId: string
  ply: number
  fen: string
  prompt: string
  answerSan: string
  explanation: string
  dueAt: number
  intervalStep: number
  correctStreak: number
}

export type Store = {
  progress: Record<string, Progress>
  mistakes: Record<string, MistakeTask>
  streak: { lastDay: string; count: number }
}

const emptyStore = (): Store => ({ progress: {}, mistakes: {}, streak: { lastDay: '', count: 0 } })

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    return { ...emptyStore(), ...parsed, progress: parsed.progress ?? {}, mistakes: parsed.mistakes ?? {} }
  } catch {
    return emptyStore()
  }
}

function writeStore(store: Store) { localStorage.setItem(KEY, JSON.stringify(store)) }

export function saveProgress(progress: Progress) {
  const store = loadStore()
  store.progress[progress.gameId] = progress
  writeStore(store)
}

export function addMistake(task: Omit<MistakeTask, 'id' | 'dueAt' | 'intervalStep' | 'correctStreak'>) {
  const store = loadStore()
  const id = `${task.gameId}:${task.ply}`
  if (!store.mistakes[id]) store.mistakes[id] = { ...task, id, dueAt: Date.now() + 86_400_000, intervalStep: 0, correctStreak: 0 }
  writeStore(store)
}

export function reviewMistake(id: string, correct: boolean) {
  const store = loadStore()
  const task = store.mistakes[id]
  if (!task) return
  if (!correct) {
    task.correctStreak = 0
    task.intervalStep = 0
    task.dueAt = Date.now()
  } else if (task.correctStreak >= 1) {
    delete store.mistakes[id]
  } else {
    const delays = [1, 3, 7]
    task.correctStreak += 1
    task.intervalStep = Math.min(task.intervalStep + 1, delays.length - 1)
    task.dueAt = Date.now() + delays[task.intervalStep] * 86_400_000
  }
  writeStore(store)
}

export function registerStudyDay() {
  const store = loadStore()
  const today = new Date().toISOString().slice(0, 10)
  if (store.streak.lastDay === today) return
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  store.streak = { lastDay: today, count: store.streak.lastDay === yesterday ? store.streak.count + 1 : 1 }
  writeStore(store)
}
