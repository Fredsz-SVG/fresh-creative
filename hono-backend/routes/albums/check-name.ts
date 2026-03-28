import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../../lib/supabase'
import { isSimilarSchoolName } from '../../lib/school-name-utils'

const checkName = new Hono()

checkName.get('/', async (c) => {
  const url = new URL(c.req.url)
  const name = url.searchParams.get('name')?.trim()
  if (!name) {
    return c.json({ exists: false })
  }
  const admin = getAdminSupabaseClient(c?.env as any)
  if (!admin) {
    return c.json({ error: 'Admin client not configured' }, 500)
  }
  const { data: albums, error } = await admin
    .from('albums')
    .select('id, name, pic_name, wa_e164')
    .eq('type', 'yearbook')
  if (error) {
    console.error('[check-name] error:', error.message)
    return c.json({ exists: false })
  }
  if (!albums || albums.length === 0) {
    return c.json({ exists: false })
  }
  for (const album of albums) {
    if (isSimilarSchoolName(name, album.name || '')) {
      return c.json({
        exists: true,
        matched_name: album.name,
        pic_name: album.pic_name || null,
        wa_e164: album.wa_e164 || null,
      })
    }
  }
  return c.json({ exists: false })
})

export default checkName
