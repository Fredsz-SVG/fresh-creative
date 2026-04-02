#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const migrationPath = resolve(root, 'd1/migrations/0006_api_hot_indexes.sql')

function runStep(name, command, args) {
  console.log(`\n==> ${name}`)
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    console.error(`\n[FAIL] ${name}`)
    process.exit(result.status ?? 1)
  }
  console.log(`[OK] ${name}`)
}

console.log('Production performance release check started...')

if (!existsSync(migrationPath)) {
  console.error(`\n[FAIL] Required migration not found: ${migrationPath}`)
  process.exit(1)
}
console.log(`[OK] Migration exists: ${migrationPath}`)

runStep('Lint', 'npm', ['run', 'lint'])
runStep('Typecheck', 'npm', ['run', 'typecheck'])
runStep('Worker build', 'npm', ['run', 'build'])

console.log('\nRelease check passed.')
console.log('Next:')
console.log('- Apply D1 migrations in target env (local/remote).')
console.log('- Deploy worker.')
console.log('- Monitor p95/p99 + error rate for 15-30 minutes.')
