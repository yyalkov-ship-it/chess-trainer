import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Chess } from 'chess.js'
import type { DrillMotif, Game } from '../src/content/types'

const directory = resolve('src/content/games')
const files = readdirSync(directory).filter((name) => name.endsWith('.json')).sort()
if (!files.length) throw new Error('В src/content/games нет партий')
const games = files.map((file) => JSON.parse(readFileSync(resolve(directory, file), 'utf8')) as Game)
const motifs = new Set<DrillMotif>(['mate', 'material', 'sacrifice', 'quiet', 'endgame', 'promotion', 'attack'])
const bannedPromptSubstrings = [
  'мотив',
  'уровень',
  'задачу на',
  'выигрыш материала',
  'форсированный ход',
  'тихий ход',
  'эндшпильную задачу',
  'превращение пешки',
  'жертва',
  'жертву',
  'мат в',
]
const templatePrompt = /сейчас \d+-й ход: найди продолжение/u
const puzzleIds = games.flatMap((game) => game.drills.map((_, index) => `${game.id}#${index}`))
const drillTotal = games.reduce((sum, game) => sum + game.drills.length, 0)
if (puzzleIds.length !== drillTotal) throw new Error(`Пул задач: ${puzzleIds.length}, сумма упражнений: ${drillTotal}`)
if (new Set(puzzleIds).size !== puzzleIds.length) throw new Error('Пул задач содержит повторяющиеся id')
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sanWordRegExp = (san: string) => new RegExp(`(?<![\\p{L}\\p{N}_+#=\\-])${escapeRegExp(san)}(?![\\p{L}\\p{N}_+#=\\-])`, 'u')
const squareTokenRegExp = (square: string) => new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(square)}(?![\\p{L}\\p{N}_])`, 'iu')
const sourceGames = new Map<string, { headers: Record<string, string>; moves: string[] }[]>()
for (const sourceFile of readdirSync(resolve('src/content/sources')).filter((name) => name.endsWith('.pgn'))) {
  const source = readFileSync(resolve('src/content/sources', sourceFile), 'utf8')
  const parsedGames: { headers: Record<string, string>; moves: string[] }[] = []
  for (const chunk of source.split(/\n(?=\[Event )/).filter((item) => item.trim())) {
    const sourceGame = new Chess(); sourceGame.loadPgn(chunk)
    parsedGames.push({ headers: sourceGame.getHeaders(), moves: sourceGame.history() })
  }
  sourceGames.set(sourceFile, parsedGames)
}
const drillOwner = new Map<string, string>()
const drillPromptOwner = new Map<string, { gameId: string; index: number }>()
const drillSets = new Map<string, string>()
for (const game of games) validate(game)

function validate(game: Game) {
  const fail = (message: string): never => { throw new Error(`Контент ${game.id}: ${message}`) }
  const loadPgn = () => {
    const chess = new Chess()
    try { chess.loadPgn(game.pgn) } catch (error) { fail(`нелегальный PGN: ${String(error)}`) }
    return chess
  }
  const main = loadPgn()
  const history = main.history()
  const lessonPositions = new Set<string>()
  const lessonReplay = new Chess()
  lessonPositions.add(positionKey(lessonReplay.fen()))
  for (const san of history) { lessonReplay.move(san); lessonPositions.add(positionKey(lessonReplay.fen())) }
  if (!history.length) fail('PGN не содержит ходов')
  if (!['attack', 'positional', 'endgame'].includes(game.theme)) fail('theme должен быть attack, positional или endgame')
  if (!game.source?.file || !game.source.white || !game.source.black || !game.source.event || !game.source.year || !game.source.eco || !game.source.url) fail('source заполнен не полностью')
  if (!/^https:\/\//.test(game.source.url)) fail('source.url должен быть HTTPS-ссылкой на открытую базу')
  const candidates = sourceGames.get(game.source.file)
  if (!candidates) fail(`PGN-источник ${game.source.file} не найден`)
  const requiredTags = ['White', 'Black', 'Event', 'Site', 'Date', 'Result', 'ECO']
  const sourceGame = candidates.find(({ headers }) => headers.White === game.source.white && headers.Black === game.source.black && headers.Date?.startsWith(`${game.source.year}.`))
  if (!sourceGame) fail(`в ${game.source.file} нет партии ${game.source.white} — ${game.source.black} за ${game.source.year} год`)
  for (const tag of requiredTags) if (!sourceGame.headers[tag]) fail(`в источнике отсутствует обязательный тег ${tag}`)
  if (sourceGame.headers.Event !== game.source.event) fail(`Event в JSON (${game.source.event}) не совпадает с PGN (${sourceGame.headers.Event})`)
  if (sourceGame.headers.ECO !== game.source.eco) fail(`ECO в JSON (${game.source.eco}) не совпадает с PGN (${sourceGame.headers.ECO})`)
  if (sourceGame.headers.Result !== game.result) fail(`result ${game.result} не совпадает с PGN (${sourceGame.headers.Result})`)
  if (!game.title.includes(String(game.source.year))) fail(`год ${game.source.year} из Date отсутствует в title`)
  if (history.length !== sourceGame.moves.length || history.some((san, index) => san !== sourceGame.moves[index])) {
    const index = history.findIndex((san, ply) => san !== sourceGame.moves[ply])
    fail(`ходы не совпадают с ${game.source.file} на ply ${index < 0 ? Math.min(history.length, sourceGame.moves.length) : index}: урок ${history[index] ?? '∅'}, источник ${sourceGame.moves[index] ?? '∅'}`)
  }
  if (game.heroColor !== 'w' && game.heroColor !== 'b') fail('heroColor должен быть w или b')
  const positionBefore = (ply: number) => {
    if (!Number.isInteger(ply) || ply < 0 || ply >= history.length) fail(`ply ${ply} вне партии из ${history.length} полуходов`)
    const chess = new Chess()
    for (const san of history.slice(0, ply)) chess.move(san)
    return chess
  }
  const assertLegal = (chess: Chess, san: string, label: string) => {
    try { chess.move(san) } catch { fail(`${label}: ход ${san} нелегален в позиции ${chess.fen()}`) }
  }

  let previousPly = -1
  let momentsWithArrows = 0
  const findMomentPositions = new Set<string>()
  const isSquare = (value: string) => /^[a-h][1-8]$/.test(value)
  for (const [index, moment] of game.moments.entries()) {
    if (moment.ply <= previousPly) fail(`моменты должны идти по возрастанию ply (индекс ${index})`)
    previousPly = moment.ply
    const position = positionBefore(moment.ply)
    if (moment.kind === 'find') findMomentPositions.add(positionKey(position.fen()))
    const answerPosition = new Chess(position.fen())
    assertLegal(answerPosition, moment.answerSan, `момент ${index + 1}, ответ`)
    const actual = history[moment.ply]
    if (moment.answerSan !== actual) fail(`момент ${index + 1}: answerSan ${moment.answerSan}, а в партии ${actual} (включая суффикс шаха/мата)`)
    if (moment.kind === 'find' && position.turn() !== game.heroColor) fail(`момент ${index + 1}: ходит не герой (${position.turn()} вместо ${game.heroColor})`)
    for (const alt of moment.altAcceptable ?? []) assertLegal(new Chess(position.fen()), alt, `момент ${index + 1}, альтернатива`)
    for (const refutation of moment.refutations ?? []) {
      const branch = new Chess(position.fen())
      assertLegal(branch, refutation.san, `момент ${index + 1}, ошибка`)
      for (const san of refutation.line.trim().split(/\s+/).filter(Boolean)) assertLegal(branch, san, `момент ${index + 1}, опровержение ${refutation.san}`)
    }
    if (moment.kind === 'find' && moment.hints.length < 2) fail(`момент ${index + 1}: нужно минимум две подсказки`)
    if (moment.kind === 'find' && (moment.refutations?.length ?? 0) < 2) fail(`момент ${index + 1}: нужно минимум два опровержения`)
    if ((moment.arrows?.length ?? 0) > 0) momentsWithArrows += 1
    for (const arrow of moment.arrows ?? []) {
      if (!isSquare(arrow.from) || !isSquare(arrow.to)) fail(`момент ${index + 1}: неверное поле стрелки ${arrow.from}-${arrow.to}`)
    }
    for (const square of moment.highlight ?? []) if (!isSquare(square)) fail(`момент ${index + 1}: неверное поле подсветки ${square}`)
  }
  if (momentsWithArrows < 6) fail(`стрелки есть только в ${momentsWithArrows} моментах, нужно минимум 6`)
  const findCount = game.moments.filter((moment) => moment.kind === 'find').length
  if (findCount < 5) fail(`ходов для поиска ${findCount}, нужно минимум 5`)
  if (game.drills.length < 4) fail(`упражнений ${game.drills.length}, нужно минимум 4`)
  const drillSignature = game.drills.map((drill) => positionKey(drill.fen)).sort().join('|')
  const previousSetOwner = drillSets.get(drillSignature)
  if (previousSetOwner) fail(`набор упражнений совпадает с уроком ${previousSetOwner}`)
  drillSets.set(drillSignature, game.id)
  for (const [index, drill] of game.drills.entries()) {
    let position: Chess
    try { position = new Chess(drill.fen) } catch { fail(`упражнение ${index + 1}: неверный FEN`) }
    if (position.turn() !== drill.side) fail(`упражнение ${index + 1}: side не совпадает с FEN`)
    const key = positionKey(drill.fen)
    if (findMomentPositions.has(key)) fail(`упражнение ${index + 1}: FEN совпадает с моментом kind find этого же урока`)
    if (!lessonPositions.has(key)) {
      if (!Number.isInteger(drill.sourcePly) || !drill.sourceLine?.length) fail(`упражнение ${index + 1}: FEN не достигнут в PGN урока ${game.id}`)
      const branch = positionBefore(drill.sourcePly!)
      for (const san of drill.sourceLine!) assertLegal(branch, san, `упражнение ${index + 1}, линия происхождения`)
      if (positionKey(branch.fen()) !== key) fail(`упражнение ${index + 1}: sourcePly/sourceLine не приводят к указанному FEN`)
    } else if (drill.sourcePly !== undefined || drill.sourceLine !== undefined) fail(`упражнение ${index + 1}: sourcePly/sourceLine нужны только для позиции из варианта`)
    const owner = drillOwner.get(key)
    if (owner && owner !== game.id) fail(`упражнение ${index + 1}: FEN уже используется в уроке ${owner}`)
    drillOwner.set(key, game.id)
    assertLegal(position, drill.answerSan, `упражнение ${index + 1}, ответ`)
    if (!motifs.has(drill.motif)) fail(`упражнение ${index + 1}: motif ${String(drill.motif)} не входит в перечисление`)
    const isPromotion = drill.answerSan.includes('=')
    const isCapture = drill.answerSan.includes('x')
    const isCheck = /[+#]$/.test(drill.answerSan)
    if (drill.motif === 'promotion' && !isPromotion) fail(`упражнение ${index + 1}: motif promotion требует превращения в answerSan`)
    if (drill.motif === 'quiet' && (isCapture || isCheck || isPromotion)) fail(`упражнение ${index + 1}: motif quiet противоречит ходу ${drill.answerSan}: ход является взятием, шахом или превращением`)
    const sidePrompt = drill.side === 'w' ? 'Ход белых' : 'Ход чёрных'
    const oppositeSidePrompt = drill.side === 'w' ? 'Ход чёрных' : 'Ход белых'
    if (!drill.prompt.includes(sidePrompt)) fail(`упражнение ${index + 1}: prompt должен содержать «${sidePrompt}»`)
    if (drill.prompt.includes(oppositeSidePrompt)) fail(`упражнение ${index + 1}: prompt содержит неверную сторону «${oppositeSidePrompt}»`)
    const promptOwner = drillPromptOwner.get(drill.prompt)
    if (promptOwner) fail(`упражнение ${index + 1}: prompt дублирует ${promptOwner.gameId}, упражнение ${promptOwner.index + 1}`)
    drillPromptOwner.set(drill.prompt, { gameId: game.id, index })
    const loweredPrompt = drill.prompt.toLocaleLowerCase('ru-RU')
    const bannedPromptSubstring = bannedPromptSubstrings.find((item) => loweredPrompt.includes(item))
    if (bannedPromptSubstring) fail(`упражнение ${index + 1}: prompt содержит запрещённую подстроку «${bannedPromptSubstring}»`)
    if (templatePrompt.test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит шаблон «сейчас N-й ход: найди продолжение»`)
    if (sanWordRegExp(drill.answerSan).test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит answerSan «${drill.answerSan}» отдельным словом`)
    const afterAnswer = new Chess(drill.fen); const answerMove = afterAnswer.move(drill.answerSan)
    if (squareTokenRegExp(answerMove.to).test(drill.prompt)) fail(`упражнение ${index + 1}: prompt содержит поле назначения ответа «${answerMove.to}» отдельным токеном`)
    const solverPieces = afterAnswer.board().flat().filter((piece) => piece?.color === drill.side).length
    const hasImmediateMaterialThreat = afterAnswer.moves().some((san) => {
      const reply = new Chess(afterAnswer.fen()); reply.move(san)
      return reply.board().flat().filter((piece) => piece?.color === drill.side).length < solverPieces
    })
    if ((drill.motif === 'material' || drill.motif === 'sacrifice' || drill.motif === 'attack') && !(isCapture || isCheck || hasImmediateMaterialThreat)) fail(`упражнение ${index + 1}: motif ${drill.motif} требует взятия, шаха или немедленной угрозы`)
  }
  console.log(`✓ ${game.title}: ${history.length} полуходов, ${game.moments.length} моментов, ${game.drills.length} упражнений`)
}
