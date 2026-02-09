import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET: Proxy video playback agar bisa diputar di <video> (hindari CORS/InvalidKey).
 * Query: url = encodeURIComponent(videoUrl dari storage)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: albumId } = await params
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam || !albumId) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  let videoUrl: string
  try {
    videoUrl = decodeURIComponent(urlParam)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server error' }, { status: 500 })

  const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single()
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

  const match = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (!match) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 })

  const pathEncoded = match[1]
  const pathDecoded = tryDecodeURIComponent(pathEncoded)

  let data: ArrayBuffer | null = null
  let contentType = 'video/mp4'

  for (const path of [pathDecoded, pathEncoded]) {
    const { data: fileData, error } = await admin.storage.from('album-photos').download(path)
    if (!error && fileData) {
      data = await fileData.arrayBuffer()
      contentType = fileData.type || 'video/mp4'
      break
    }
  }

  if (!data) {
    return NextResponse.json({ error: 'Video tidak ditemukan' }, { status: 404 })
  }

  const totalLength = data.byteLength
  const rangeHeader = request.headers.get('range')

  if (rangeHeader?.startsWith('bytes=')) {
    const parts = rangeHeader.slice(6).split('-')
    const start = parts[0] ? parseInt(parts[0], 10) : 0
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1
    const safeStart = Math.min(Math.max(0, start), totalLength - 1)
    const safeEnd = Math.min(Math.max(safeStart, end), totalLength - 1)
    const chunk = data.slice(safeStart, safeEnd + 1)
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${safeStart}-${safeEnd}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunk.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(totalLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

function tryDecodeURIComponent(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}
