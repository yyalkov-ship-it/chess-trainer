import { Chess } from 'chess.js'
import { readFileSync } from 'node:fs'
import { NodeStockfish } from './engine-node'

const game = JSON.parse(readFileSync('src/content/games/kasparov-topalov-1999.json', 'utf8'))
const parsed = new Chess(); parsed.loadPgn(game.pgn); const history = parsed.history()
const choices: Record<number,string[]> = {34:['Qg7'],48:['Re8'],56:['Qxf6']}
const engine = new NodeStockfish()
try {
 await engine.ready()
 for (const [plyText,moves] of Object.entries(choices)) {
  const ply=Number(plyText); const base=new Chess(); for(const san of history.slice(0,ply)) base.move(san)
  for(const wrongSan of moves){ const wrong=new Chess(base.fen()); wrong.move(wrongSan); const pv=(await engine.analyse(wrong.fen(),1,20))[0]; const board=new Chess(wrong.fen()); const sans:string[]=[]; for(const uci of pv.moves.slice(0,4)){ sans.push(board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]??'q'}).san) } console.log(`${ply} ${wrongSan}: ${sans.join(' ')}`) }
 }
} finally { engine.close() }
