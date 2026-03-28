import { Hono } from 'hono'
import { getAdminSupabaseClient } from '../lib/supabase'

const selectArea = new Hono()

// GET /api/select-area?type=provinces|cities&...params
selectArea.get('/', async (c) => {
  try {
    const q = c.req.query()
    const type = (q?.type ?? '').trim().toLowerCase()
    const supabase = getAdminSupabaseClient(c?.env as any)

    if (type === 'provinces') {
      const qRaw = (q?.q ?? '').trim().toLowerCase()
      let query = supabase.from('ref_provinces').select('id,name').order('name', { ascending: true }).limit(100)
      if (qRaw) query = query.ilike('name_lower', `%${qRaw}%`)
      const { data, error } = await query
      if (error) return c.json({ ok: false, error: error.message }, 500)
      return c.json({ ok: true, data: data ?? [] })
    }

    if (type === 'cities') {
      const province_id = (q?.province_id ?? '').trim()
      if (!province_id) return c.json({ ok: false, error: 'province_id is required' }, 400)
      const qRaw = (q?.q ?? '').trim().toLowerCase()
      const kind = (q?.kind ?? '').trim().toLowerCase()
      const limit = Math.min(Number(q?.limit ?? '100') || 100, 300)
      const cleanQ = qRaw.replace(/^kota\s+/, '').replace(/^kabupaten\s+/, '').replace(/^kab\s+/, '').trim()
      let query = supabase.from('ref_cities').select('id, province_id, name, kind').eq('province_id', province_id)
      if (kind === 'kota' || kind === 'kabupaten') query = query.eq('kind', kind)
      if (cleanQ) {
        query = query.or(`name_lower.ilike.${cleanQ}%,name_lower.ilike.kota ${cleanQ}%,name_lower.ilike.kabupaten ${cleanQ}%,name_lower.ilike.kab ${cleanQ}%`)
      }
      const { data, error } = await query.order('name').limit(limit)
      if (error) return c.json({ ok: false, error: error.message }, 500)
      return c.json({ ok: true, data: data ?? [] })
    }

    return c.json({ ok: false, error: 'type parameter required: "provinces" or "cities"' }, 400)
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message ?? 'unknown error' }, 500)
  }
})

export default selectArea