import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

const albumsIdMembers = new Hono()

// GET /api/albums/:id/members
albumsIdMembers.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  try {
    const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
    const client = supabaseAdmin || supabase

    const [albumRes, globalRole, adminCheck] = await Promise.all([
      client.from('albums').select('user_id').eq('id', albumId).single(),
      getRole(supabase, user),
      client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    ])
    const album = albumRes.data as { user_id: string } | null
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const isOwner = album.user_id === user.id
    const isGlobalAdmin = globalRole === 'admin'
    const isAlbumAdmin = !!(adminCheck.data as { role?: string } | null)?.role
    const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

    if (!canManage) return c.json({ error: 'Forbidden' }, 403)

    const [membersRes, allStudentsRes, ownerRes] = await Promise.all([
      client.from('album_members').select('user_id, role, joined_at').eq('album_id', albumId),
      client.from('album_class_access').select('user_id, student_name, email, status').eq('album_id', albumId).eq('status', 'approved'),
      client.from('users').select('id, email').eq('id', album.user_id).single()
    ])
    const members = membersRes.data
    const allStudents = allStudentsRes.data
    const ownerData = ownerRes.data

    const memberIds = members?.map((m: any) => m.user_id).filter((id: string) => id !== album.user_id) ?? []
    let emailByUserId: Record<string, string> = {}
    if (memberIds.length > 0) {
      const { data: userRows } = await client.from('users').select('id, email').in('id', memberIds)
      if (userRows) userRows.forEach((u: any) => { emailByUserId[u.id] = u.email || 'Unknown' })
    }

    const userMap = new Map()
    if (ownerData) {
      userMap.set(ownerData.id, {
        user_id: ownerData.id,
        email: ownerData.email || 'Unknown',
        role: 'owner',
        name: null,
        has_account: true,
        is_owner: true
      })
    }
    members?.forEach((m: any) => {
      if (m.user_id === album.user_id) return
      const role = (m.role === 'admin' || m.role === 'member') ? m.role : 'member'
      userMap.set(m.user_id, {
        user_id: m.user_id,
        email: emailByUserId[m.user_id] || 'Unknown',
        role,
        name: null,
        has_account: true
      })
    })
    allStudents?.forEach((s: any) => {
      if (s.user_id === album.user_id) {
        const owner = userMap.get(s.user_id)
        if (owner) {
          owner.name = s.student_name
          if (!owner.email || owner.email === 'Unknown') owner.email = s.email
        }
        return
      }
      const key = s.user_id || `no-account-${s.student_name}-${s.email}`
      const existing = s.user_id ? userMap.get(s.user_id) : null
      if (existing) {
        existing.name = s.student_name
        if (!existing.email || existing.email === 'Unknown') existing.email = s.email
      } else {
        userMap.set(key, {
          user_id: s.user_id,
          email: s.email || 'Belum ada email',
          role: s.user_id ? 'student' : 'no-account',
          name: s.student_name,
          has_account: !!s.user_id
        })
      }
    })
    return c.json(Array.from(userMap.values()))
  } finally {}
})

// POST /api/albums/:id/members
albumsIdMembers.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const body = await c.req.json()
  const { user_id, email, role } = body
  const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
  const client = supabaseAdmin || supabase

  const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
  const isOwner = album?.user_id === user.id
  const globalRole = await getRole(supabase, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin) return c.json({ error: 'Hanya owner atau admin web yang bisa menambah/promote member' }, 403)

  let targetUserId = user_id
  if (!targetUserId && email) {
    const { data: userData } = await client.from('users').select('id').eq('email', body.email).single()
    if (!userData) {
      return c.json({ error: 'User dengan email tersebut belum terdaftar. Minta mereka untuk login/registrasi terlebih dahulu.' }, 404)
    }
    targetUserId = userData.id
  }
  if (!targetUserId) return c.json({ error: 'User ID atau Email diperlukan' }, 400)
  const roleNorm = (role === 'admin' || role === 'member') ? role : 'member'
  const { error } = await client.from('album_members').upsert({ album_id: albumId, user_id: targetUserId, role: roleNorm }, { onConflict: 'album_id,user_id' })
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

// PATCH /api/albums/:id/members
albumsIdMembers.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const searchParams = c.req.query()
  const targetUserId = searchParams['user_id']
  if (!targetUserId) return c.json({ error: 'User ID required' }, 400)
  const body = await c.req.json()
  const { role } = body
  if (role !== 'admin' && role !== 'member') {
    return c.json({ error: 'Invalid role' }, 400)
  }
  const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
  const client = supabaseAdmin || supabase
  const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
  const isOwner = album?.user_id === user.id
  const globalRole = await getRole(supabase, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin) {
    return c.json({ error: 'Only owner or global admin can update roles' }, 403)
  }
  const { error } = await client.from('album_members').update({ role }).eq('album_id', albumId).eq('user_id', targetUserId)
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  return c.json({ success: true, role })
})

// DELETE /api/albums/:id/members
albumsIdMembers.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  const searchParams = c.req.query()
  const targetUserId = searchParams['user_id']
  if (!targetUserId) return c.json({ error: 'user_id required' }, 400)
  const admin = getAdminSupabaseClient(c?.env as any)
  if (!admin) return c.json({ error: 'Server error' }, 500)
  const { data: album } = await admin.from('albums').select('user_id').eq('id', albumId).single()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const ownerId = (album as { user_id: string }).user_id
  if (targetUserId === ownerId) return c.json({ error: 'Owner album tidak dapat dihapus' }, 400)
  const isOwner = ownerId === user.id
  const globalRole = await getRole(supabase, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin) {
    const { data: member } = await admin.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    const isAlbumAdmin = (member as { role?: string } | null)?.role === 'admin'
    if (!isAlbumAdmin) return c.json({ error: 'Hanya owner atau admin yang dapat menghapus member' }, 403)
  }
  const { error } = await admin.from('album_members').delete().eq('album_id', albumId).eq('user_id', targetUserId)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

export default albumsIdMembers
