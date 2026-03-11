/**
 * Normalize a school name for fuzzy comparison.
 */
export function normalizeName(s: string): string {
    let n = s.trim().toLowerCase()
    n = n.replace(/\s+/g, ' ')
    n = n.replace(/[^a-z0-9 ]/g, '')
    n = n.split(' ').map(word => word.replace(/(.)\1+$/g, '$1')).join(' ')
    return n.trim()
}

/**
 * Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
    }
    return dp[m][n]
}

export function isSimilarSchoolName(a: string, b: string): boolean {
    const normA = normalizeName(a)
    const normB = normalizeName(b)
    if (normA === normB) return true

    const noSpA = normA.replace(/\s/g, '')
    const noSpB = normB.replace(/\s/g, '')
    if (noSpA === noSpB) return true

    // Check digits. If digits differ, it's likely a different school (e.g., SMAN 1 vs SMAN 3)
    const digitsA = normA.match(/\d+/g)?.join('') || ''
    const digitsB = normB.match(/\d+/g)?.join('') || ''
    if (digitsA !== digitsB) return false

    // If digits are the same, use a more strict Levenshtein threshold
    // Dist <= 1 is usually enough for typos when the main parts are the same.
    if (levenshtein(normA, normB) <= 1) return true
    if (levenshtein(noSpA, noSpB) <= 1) return true

    return false
}
