import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walk(dir, fileList = []) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    if (statSync(filePath).isDirectory()) {
      if (file !== 'node_modules') walk(filePath, fileList)
    } else {
      if (filePath.endsWith('.ts')) fileList.push(filePath)
    }
  }
  return fileList
}

const files = walk('./routes')
let modifiedCount = 0

for (const file of files) {
  let content = readFileSync(file, 'utf8')
  let original = content

  // Replace getAdminSupabaseClient() with getAdminSupabaseClient(c.env as any)
  // ONLY if it's inside a function that has `c` as the first argument, OR just globally if it matches EXACTLY "getAdminSupabaseClient()".
  // Actually, some places don't have `c` in scope. We need to pass `c` to them!

  if (content.includes('getAdminSupabaseClient()')) {
    // If there's an async function without `c` context, we need to manually fix. Let's see them.
    if (content.match(/async function .*?\(/)) {
      // We'll log them and fix manually
      console.log('Needs manual fix:', file)
    }
    content = content.replace(
      /getAdminSupabaseClient\(\)/g,
      'getAdminSupabaseClient(c?.env as any)'
    )
  }

  // Also fix getSupabaseClient(c)
  // Actually it's already getSupabaseClient(c), so that's fine.

  if (content !== original) {
    writeFileSync(file, content)
    modifiedCount++
  }
}

console.log('Fixed', modifiedCount, 'files.')
