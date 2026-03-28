import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { isSimilarSchoolName } from '../../lib/school-name-utils'

const albumsRoute = new Hono()

albumsRoute.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return c.json([])
    }

    let role: 'admin' | 'user' = 'user'
    try {
      role = await getRole(supabase, user)
    } catch {
      // ignore
    }
    const isAdmin = role === 'admin'
    const scope = c.req.query('scope')
    const shouldUseAdminScope = isAdmin && scope !== 'mine'

    // Admin: Fetch ALL albums
    if (shouldUseAdminScope) {
      const adminClient = getAdminSupabaseClient(c?.env as any)
      if (!adminClient) {
        return c.json({ error: 'Admin client not configured' }, 500)
      }

      const { data: albums, error } = await adminClient
        .from('albums')
        .select(`
          id, name, type, status, created_at, 
          pricing_package_id, 
          pricing_packages(name), 
          school_city, kab_kota, wa_e164, province_id, province_name, pic_name, students_count, source, total_estimated_price,
          payment_status, payment_url
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[GET /api/albums] admin error:', error.message)
        return c.json({ error: error.message }, 500)
      }

      const result = (albums ?? []).map((a: any) => {
        const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
        return {
          ...a,
          pricing_packages: pkg,
          isOwner: false
        }
      })

      return c.json(result)
    }

    const albumColumns = 'id, name, type, status, user_id, created_at, cover_image_url, pricing_package_id, pricing_packages(name), payment_status, payment_url, total_estimated_price'

    const [ownedRes, memberRowsRes] = await Promise.all([
      supabase.from('albums').select(albumColumns).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('album_members').select('album_id').eq('user_id', user.id)
    ])
    if (ownedRes.error) return c.json({ error: ownedRes.error.message })
    const ownedAlbums = ownedRes.data ?? []
    const memberAlbumIds = (memberRowsRes.data ?? []).map((r: { album_id: string }) => r.album_id).filter(Boolean)

    const adminClient = getAdminSupabaseClient(c?.env as any)
    const [memberAlbumsRes, approvedRowsRes] = await Promise.all([
      memberAlbumIds.length > 0 ? supabase.from('albums').select(albumColumns).in('id', memberAlbumIds) : Promise.resolve({ data: [] as any[] }),
      adminClient
        ? adminClient.from('album_class_access').select('album_id').eq('user_id', user.id).eq('status', 'approved')
        : Promise.resolve({ data: [] as any[] })
    ])
    const memberAlbums = memberAlbumsRes.data ?? []
    const approvedAlbumIds = (approvedRowsRes.data ?? []).map((r: { album_id: string }) => r.album_id).filter(Boolean)

    let approvedClassAccessAlbums: any[] = []
    if (adminClient && approvedAlbumIds.length > 0) {
      const { data } = await adminClient.from('albums').select(albumColumns).in('id', approvedAlbumIds)
      approvedClassAccessAlbums = data ?? []
    }

    const ownedSet = new Set((ownedAlbums ?? []).map(a => a.id))
    const memberSet = new Set(memberAlbums.map(a => a.id))
    const finalAlbums = [
      ...(ownedAlbums ?? []).map(a => ({ ...a, isOwner: true })),
      ...memberAlbums.filter(a => !ownedSet.has(a.id)).map(a => ({ ...a, isOwner: false })),
      ...approvedClassAccessAlbums.filter(a => !ownedSet.has(a.id) && !memberSet.has(a.id)).map(a => ({ ...a, isOwner: false, status: 'approved' }))
    ]

    finalAlbums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const normalized = finalAlbums.map((a: any) => {
      const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages
      return { ...a, pricing_packages: pkg }
    })

    return c.json(normalized)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/albums]', err)
    return c.json({ error: message })
  }
})

albumsRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return c.json({ error: 'Unauthorized. Please login.' }, 401)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { type = 'yearbook', name, school_name } = body

  const dataToInsert: any = {
    user_id: user.id,
    type: type,
    status: 'pending',
  }

  if (type === 'yearbook') {
    const finalName = (school_name || name || '').trim()
    if (!finalName) {
      return c.json({ error: 'Nama sekolah wajib.' }, 400)
    }

    const SCHOOL_NAME_REGEX = /^(SMAN|SMKN|SMK|SMA|MAN|MA|SMPN|SMP|MTsN|MTs|SDN|SD|MIN|MI)\s+\d+\s+.{2,}$/i
    if (!SCHOOL_NAME_REGEX.test(finalName)) {
      return c.json({ error: 'Format nama sekolah harus seperti: SMAN 1 Salatiga, SMKN 2 Bandung, dst.' }, 400)
    }

    const adminClient = getAdminSupabaseClient(c?.env as any)
    if (adminClient) {
      const { data: albums } = await adminClient
        .from('albums')
        .select('id, name, pic_name, wa_e164')
        .eq('type', 'yearbook')

      if (albums && albums.length > 0) {
        for (const album of albums) {
          if (isSimilarSchoolName(finalName, album.name || '')) {
            const contact = [album.pic_name, album.wa_e164].filter(Boolean).join(' - ')
            return c.json({
              error: `Nama sekolah "${finalName}" mirip dengan "${album.name}" yang sudah terdaftar.${contact ? ` Hubungi ${contact} untuk informasi lebih lanjut.` : ''}`
            }, 409)
          }
        }
      }
    }

    dataToInsert.name = finalName
    dataToInsert.school_city = body.school_city
    dataToInsert.kab_kota = body.kab_kota
    dataToInsert.wa_e164 = body.wa_e164
    dataToInsert.province_id = body.province_id
    dataToInsert.province_name = body.province_name
    dataToInsert.pic_name = body.pic_name
    dataToInsert.students_count = body.students_count
    dataToInsert.source = body.source || 'showroom'
    dataToInsert.pricing_package_id = body.pricing_package_id
    dataToInsert.total_estimated_price = body.total_estimated_price

  } else if (type === 'public') {
    if (!name) {
      return c.json({ error: 'Nama album wajib.' }, 400)
    }
    dataToInsert.name = name
    dataToInsert.status = 'approved'
  } else {
    return c.json({ error: 'Invalid type' }, 400)
  }

  const { data, error } = await supabase
    .from('albums')
    .insert(dataToInsert)
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json(data)
})

albumsRoute.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({}))
  const { id } = body
  if (!id) return c.json({ error: 'Album ID is required' }, 400)

  const role = await getRole(supabase, user)

  if (role === 'admin') {
    const admin = getAdminSupabaseClient(c?.env as any)
    if (!admin) return c.json({ error: 'Admin client not configured' }, 500)
    const { data: albumData } = await admin.from('albums').select('user_id').eq('id', id).single()
    const { error } = await admin.from('albums').delete().eq('id', id)
    if (error) return c.json({ error: error.message }, 500)
  } else {
    const { error } = await supabase.from('albums').delete().eq('id', id).eq('user_id', user.id)
    if (error) return c.json({ error: error.message }, 500)
  }

  return c.json({ message: 'Album deleted successfully' })
})

export default albumsRoute
