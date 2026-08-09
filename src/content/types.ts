export type Square = `${'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'}${1|2|3|4|5|6|7|8}`

export type Refutation = { san: string; line: string; why: string }
export type Moment = {
  ply: number
  kind: 'find' | 'explain'
  prompt: string
  answerSan: string
  altAcceptable?: string[]
  hints: string[]
  explanation: string
  refutations?: Refutation[]
  arrows?: { from: Square; to: Square; color: 'green' | 'red' | 'blue' }[]
  highlight?: Square[]
}
export type Drill = { fen: string; side: 'w' | 'b'; prompt: string; answerSan: string; explanation: string }
export type Game = {
  id: string
  title: string
  opening: string
  result: string
  level: 1 | 2 | 3
  intro: string
  pgn: string
  moments: Moment[]
  drills: Drill[]
}
