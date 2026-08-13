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
  origin: 'lesson' | 'puzzle'
}

export type PuzzleStat = {
  id: string
  attempts: number
  solved: number
  lastResult: 'ok' | 'fail'
  lastAt: number
}

export type Store = {
  progress: Record<string, Progress>
  mistakes: Record<string, MistakeTask>
  streak: { lastDay: string; count: number }
  puzzles: Record<string, PuzzleStat>
  daily: { date: string; ids: string[]; index: number; correct: number } | null
  marathonRecord: number
}

const emptyStore = (): Store => ({ progress: {}, mistakes: {}, streak: { lastDay: '', count: 0 }, puzzles: {}, daily: null, marathonRecord: 0 })

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    const mistakes = Object.fromEntries(Object.entries(parsed.mistakes ?? {}).map(([id, task]) => [id, { ...task, origin: task.origin ?? 'lesson' }]))
    return { ...emptyStore(), ...parsed, progress: parsed.progress ?? {}, mistakes, puzzles: parsed.puzzles ?? {}, daily: parsed.daily ?? null, marathonRecord: parsed.marathonRecord ?? 0 }
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

export function addMistake(task: Omit<MistakeTask, 'id' | 'dueAt' | 'intervalStep' | 'correctStreak' | 'origin'>) {
  const store = loadStore()
  const id = `${task.gameId}:${task.ply}`
  if (!store.mistakes[id]) store.mistakes[id] = { ...task, id, origin: 'lesson', dueAt: Date.now() + 86_400_000, intervalStep: 0, correctStreak: 0 }
  writeStore(store)
}

export function recordPuzzle(task: { id: string; gameId: string; fen: string; prompt: string; answerSan: string; explanation: string }, correct: boolean) {
  const store = loadStore()
  const previous = store.puzzles[task.id]
  store.puzzles[task.id] = { id: task.id, attempts: (previous?.attempts ?? 0) + 1, solved: (previous?.solved ?? 0) + (correct ? 1 : 0), lastResult: correct ? 'ok' : 'fail', lastAt: Date.now() }
  if (!correct && !store.mistakes[task.id]) store.mistakes[task.id] = { ...task, id: task.id, ply: -1, origin: 'puzzle', dueAt: Date.now() + 86_400_000, intervalStep: 0, correctStreak: 0 }
  writeStore(store)
  registerStudyDay()
}

export function saveDaily(daily: Store['daily']) { const store = loadStore(); store.daily = daily; writeStore(store) }
export function saveMarathonRecord(value: number) { const store = loadStore(); store.marathonRecord = Math.max(store.marathonRecord, value); writeStore(store) }

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
