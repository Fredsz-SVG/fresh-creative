/**
 * Sinkron satu arah: Supabase public.users → D1 users.
 * Jalankan dari folder hono-backend setelah migrasi D1 sudah ada.
 *
 *   node --env-file=.dev.vars scripts/sync-supabase-users-to-d1.mjs
 *   node --env-file=.dev.vars scripts/sync-supabase-users-to-d1.mjs --local
 *
 * Butuh: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY di env.
 * --local  = wrangler d1 execute ... --local
 * default  = --remote
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

/** Isi env dari .dev.vars bila key belum ada (tidak menimpa env shell). */
function loadDevVars() {
  const p = path.join(ROOT, '.dev.vars')
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function sqlQuote(s) {
  if (s == null || s === '') return "''"
  return "'" + String(s).replace(/'/g, "''") + "'"
}

const DB_NAME = 'fresh-creative'

loadDevVars()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const useLocal = process.argv.includes('--local')
const flag = useLocal ? '--local' : '--remote'

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: rows, error } = await supabase.from('users').select('*').order('created_at')

if (error) {
  console.error('Supabase error:', error.message)
  process.exit(1)
}

if (!rows?.length) {
  console.log('Tidak ada baris di public.users — tidak ada yang disinkronkan.')
  process.exit(0)
}

const lines = ['-- Sinkron dari Supabase public.users → D1 (generated)', 'BEGIN TRANSACTION;']

for (const r of rows) {
  const id = r.id
  const email = r.email ?? ''
  const role = r.role === 'admin' ? 'admin' : 'user'
  const fullName = r.full_name ?? null
  const credits = typeof r.credits === 'number' ? r.credits : 0
  const suspended = r.is_suspended === true ? 1 : 0
  const created = r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
  const updated = r.updated_at ? new Date(r.updated_at).toISOString() : created

  lines.push(
    `INSERT OR REPLACE INTO users (id, email, role, full_name, credits, is_suspended, created_at, updated_at) VALUES (${sqlQuote(
      id
    )}, ${sqlQuote(email)}, ${sqlQuote(role)}, ${fullName == null ? 'NULL' : sqlQuote(fullName)}, ${credits}, ${suspended}, ${sqlQuote(
      created
    )}, ${sqlQuote(updated)});`
  )
}

lines.push('COMMIT;')

const sqlPath = path.join(ROOT, '.sync-users-to-d1-temp.sql')
fs.writeFileSync(sqlPath, lines.join('\n'), 'utf8')

console.log(`Menulis ${rows.length} user ke SQL → ${sqlPath}`)
console.log(`Menjalankan: wrangler d1 execute ${DB_NAME} ${flag} --file=...`)

try {
  execSync(`npx wrangler d1 execute ${DB_NAME} ${flag} --file="${sqlPath}"`, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })
} catch {
  process.exit(1)
} finally {
  try {
    fs.unlinkSync(sqlPath)
  } catch {
    /* ignore */
  }
}

console.log('Selesai.')
