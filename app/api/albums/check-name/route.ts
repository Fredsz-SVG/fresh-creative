import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeName, levenshtein } from '@/lib/school-name-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/albums/check-name?name=SMAN+1+Salatiga
 * Checks if an album with the same or very similar school name already exists.
 * Uses normalization + fuzzy matching to prevent tricks like extra letters.
 * Returns { exists: boolean, matched_name?, pic_name?, wa_e164? }
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim()

  if (!name) {
    return NextResponse.json({ exists: false })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  }

  const inputNorm = normalizeName(name)

  // Fetch all yearbook album names for comparison
  const { data: albums, error } = await admin
    .from('albums')
    .select('id, name, pic_name, wa_e164')
    .eq('type', 'yearbook')

  if (error) {
    console.error('[check-name] error:', error.message)
    return NextResponse.json({ exists: false })
  }

  if (!albums || albums.length === 0) {
    return NextResponse.json({ exists: false })
  }

  // Check each album for similarity
  for (const album of albums) {
    const albumNorm = normalizeName(album.name || '')

    // 1. Exact normalized match
    if (albumNorm === inputNorm) {
      return NextResponse.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }

    // 2. Levenshtein distance ≤ 2 on normalized names
    const dist = levenshtein(albumNorm, inputNorm)
    if (dist <= 2) {
      return NextResponse.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }

    // 3. Check if one is substring-contained in the other (after normalization)
    //    e.g. "sman 1 salahsatu" vs "sman 1 salahsatuu" both normalize similarly
    //    but also catch "sman 1 salah satu" vs "sman 1 salahsatu"
    const inputNoSpaces = inputNorm.replace(/\s/g, '')
    const albumNoSpaces = albumNorm.replace(/\s/g, '')
    if (inputNoSpaces === albumNoSpaces) {
      return NextResponse.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }

    // 4. Levenshtein on space-stripped versions ≤ 2
    const distNoSpaces = levenshtein(inputNoSpaces, albumNoSpaces)
    if (distNoSpaces <= 2) {
      return NextResponse.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }
  }

  return NextResponse.json({ exists: false })
}
