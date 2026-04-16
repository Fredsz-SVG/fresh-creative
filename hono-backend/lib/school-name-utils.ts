/**
 * Normalize a school name for fuzzy comparison:
 * - lowercase
 * - collapse whitespace
 * - strip non-alphanumeric (keep spaces)
 * - collapse trailing repeated chars per word (e.g. "salahsatuu" → "salahsatu")
 */
export function normalizeName(s: string): string {
  let n = s.trim().toLowerCase()
  n = n.replace(/\s+/g, ' ')
  n = n.replace(/[^a-z0-9 ]/g, '')
  n = n
    .split(' ')
    .map((word) => word.replace(/(.)\1+$/g, '$1'))
    .join(' ')
  return n.trim()
}

/**
 * Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Extract numbers from a string
 */
function extractNumbers(s: string): string {
  const match = s.match(/\d+/g)
  return match ? match.join('') : ''
}

/**
 * Check if two school names are "similar" (potential duplicates).
 * Returns true if normalized names match exactly, or Levenshtein tolerance,
 * BUT ONLY IF their numbers (like SMP 1 vs SMP 2) match.
 */
export function isSimilarSchoolName(a: string, b: string): boolean {
  const normA = normalizeName(a)
  const normB = normalizeName(b)
  if (normA === normB) return true

  // STRICT RULE: If the schools have different numbers (SMA 1 vs SMA 2), they are DEFINITELY different schools.
  const numA = extractNumbers(normA)
  const numB = extractNumbers(normB)
  if (numA !== numB) return false // They have different numbers, so they cannot be the same school

  const noSpA = normA.replace(/\s/g, '')
  const noSpB = normB.replace(/\s/g, '')
  if (noSpA === noSpB) return true

  if (levenshtein(normA, normB) <= (Math.max(normA.length, normB.length) > 10 ? 3 : 2)) return true
  if (levenshtein(noSpA, noSpB) <= (Math.max(noSpA.length, noSpB.length) > 10 ? 3 : 2)) return true

  return false
}
