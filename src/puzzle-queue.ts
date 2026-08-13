type QueuePuzzle = { id: string }
type QueueStat = { lastAt: number }

export function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashSeed(value: string) {
  let hash = 2166136261
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return hash >>> 0 || 1
}

export function seededShuffle<T>(items: readonly T[], seed: string) {
  const result = [...items]
  let state = hashSeed(seed)
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296 }
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

export const dailyPuzzleIds = (pool: readonly QueuePuzzle[], day: string) => seededShuffle(pool, day).slice(0, 5).map((puzzle) => puzzle.id)

export function practiceQueue<T extends QueuePuzzle>(pool: readonly T[], stats: Record<string, QueueStat>, limit = 10) {
  return [...pool].sort((left, right) => {
    const a = stats[left.id]
    const b = stats[right.id]
    if (!a && b) return -1
    if (a && !b) return 1
    return (a?.lastAt ?? 0) - (b?.lastAt ?? 0)
  }).slice(0, limit)
}
