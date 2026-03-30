/** Kolom JSON di D1 disimpan sebagai TEXT. */
export function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (raw == null || raw === '') return []
  try {
    const j = JSON.parse(raw)
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}
