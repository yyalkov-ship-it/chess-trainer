import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/App.tsx'), 'utf8')
let failures = 0

const fail = (message: string) => {
  failures += 1
  console.error(`✗ ${message}`)
}

if (!/movable:\s*\{[^}]*\bfree:\s*false\b/s.test(source)) {
  fail('Board movable config must contain free: false')
}

const bareInvalidMoveReturn = /\bif\s*\(\s*!move\s*\)\s*return\b/
if (bareInvalidMoveReturn.test(source)) {
  fail('Move handlers must restore the board instead of using bare if (!move) return')
}

if (failures) process.exitCode = 1
else console.log('✓ Board safety check passed')
