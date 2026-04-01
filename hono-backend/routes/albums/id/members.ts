import { Hono } from 'hono'
import { getSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'
import { getD1 } from '../../../lib/edge-env'

const albumsIdMembers = new Hono()

// GET /api/albums/:id/members
albumsIdMembers.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)
  try {
    const album = await db
      .prepare(`SELECT user_id FROM albums WHERE id = ?`)
      .bind(albumId)
      .first<{ user_id: string }>()
    if (!album) return c.json({ error: 'Album not found' }, 404)

    const globalRole = await getRole(c, user)
    const adminCheck = await db
      .prepare(
        `SELECT role FROM album_members WHERE album_id = ? AND user_id = ? AND role = 'admin'`
      )
      .bind(albumId, user.id)
      .first<{ role: string }>()

    const isOwner = album.user_id === user.id
    const isGlobalAdmin = globalRole === 'admin'
    const isAlbumAdmin = !!adminCheck?.role
    const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

    if (!canManage) return c.json({ error: 'Forbidden' }, 403)

    const { results: members } = await db
      .prepare(`SELECT user_id, role, joined_at FROM album_members WHERE album_id = ?`)
      .bind(albumId)
      .all<{ user_id: string; role: string; joined_at: string | null }>()

    const { results: allStudents } = await db
      .prepare(
        `SELECT user_id, student_name, email, status FROM album_class_access WHERE album_id = ? AND status = 'approved'`
      )
      .bind(albumId)
      .all<{ user_id: string; student_name: string; email: string | null; status: string }>()

    const ownerData = await db
      .prepare(`SELECT id, email FROM users WHERE id = ?`)
      .bind(album.user_id)
      .first<{ id: string; email: string }>()

    const memberIds =
      members?.map((m) => m.user_id).filter((id) => id !== album.user_id) ?? []
    const emailByUserId: Record<string, string> = {}
    if (memberIds.length > 0) {
      const ph = memberIds.map(() => '?').join(',')
      const { results: userRows } = await db
        .prepare(`SELECT id, email FROM users WHERE id IN (${ph})`)
        .bind(...memberIds)
        .all<{ id: string; email: string }>()
      for (const u of userRows ?? []) {
        emailByUserId[u.id] = u.email || 'Unknown'
      }
    }

    const userMap = new Map<string, Record<string, unknown>>()
    if (ownerData) {
      userMap.set(ownerData.id, {
        user_id: ownerData.id,
        email: ownerData.email || 'Unknown',
        role: 'owner',
        name: null,
        has_account: true,
        is_owner: true,
      })
    }
    members?.forEach((m) => {
      if (m.user_id === album.user_id) return
      const r = m.role === 'admin' || m.role === 'member' ? m.role : 'member'
      userMap.set(m.user_id, {
        user_id: m.user_id,
        email: emailByUserId[m.user_id] || 'Unknown',
        role: r,
        name: null,
        has_account: true,
      })
    })
    allStudents?.forEach((s) => {
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
          has_account: !!s.user_id,
        })
      }
    })
    return c.json(Array.from(userMap.values()))
  } finally {
    /* noop */
  }
})

// POST /api/albums/:id/members
albumsIdMembers.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const body = await c.req.json()
  const { user_id, email, role } = body

  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  const isOwner = album?.user_id === user.id
  const globalRole = await getRole(c, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin)
    return c.json({ error: 'Hanya owner atau admin web yang bisa menambah/promote member' }, 403)

  let targetUserId = user_id as string | undefined
  if (!targetUserId && email) {
    const userData = await db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .bind(body.email)
      .first<{ id: string }>()
    if (!userData) {
      return c.json(
        {
          error:
            'User dengan email tersebut belum terdaftar. Minta mereka untuk login/registrasi terlebih dahulu.',
        },
        404
      )
    }
    targetUserId = userData.id
  }
  if (!targetUserId) return c.json({ error: 'User ID atau Email diperlukan' }, 400)
  const roleNorm = role === 'admin' || role === 'member' ? role : 'member'
  const r = await db
    .prepare(
      `INSERT INTO album_members (album_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(album_id, user_id) DO UPDATE SET role = excluded.role`
    )
    .bind(albumId, targetUserId, roleNorm)
    .run()
  if (!r.success) return c.json({ error: 'Upsert failed' }, 500)
  return c.json({ success: true })
})

// PATCH /api/albums/:id/members
albumsIdMembers.patch('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
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
  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  const isOwner = album?.user_id === user.id
  const globalRole = await getRole(c, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin) {
    return c.json({ error: 'Only owner or global admin can update roles' }, 403)
  }
  const upd = await db
    .prepare(`UPDATE album_members SET role = ? WHERE album_id = ? AND user_id = ?`)
    .bind(role, albumId, targetUserId)
    .run()
  if (!upd.success) {
    return c.json({ error: 'Update failed' }, 500)
  }
  return c.json({ success: true, role })
})

// DELETE /api/albums/:id/members
albumsIdMembers.delete('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  const albumId = c.req.param('id')
  const searchParams = c.req.query()
  const targetUserId = searchParams['user_id']
  if (!targetUserId) return c.json({ error: 'user_id required' }, 400)

  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  if (!album) return c.json({ error: 'Album not found' }, 404)
  const ownerId = album.user_id
  if (targetUserId === ownerId) return c.json({ error: 'Owner album tidak dapat dihapus' }, 400)
  const isOwner = ownerId === user.id
  const globalRole = await getRole(c, user)
  const isGlobalAdmin = globalRole === 'admin'
  if (!isOwner && !isGlobalAdmin) {
    const member = await db
      .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
      .bind(albumId, user.id)
      .first<{ role: string }>()
    const isAlbumAdmin = member?.role === 'admin'
    if (!isAlbumAdmin) return c.json({ error: 'Hanya owner atau admin yang dapat menghapus member' }, 403)
  }
  const del = await db
    .prepare(`DELETE FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, targetUserId)
    .run()
  if (!del.success) return c.json({ error: 'Delete failed' }, 500)

  // Keep team/approval data consistent: removing member from album
  // must also remove class access rows and pending/rejected requests.
  await db
    .prepare(`DELETE FROM album_class_access WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, targetUserId)
    .run()
  await db
    .prepare(`DELETE FROM album_join_requests WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, targetUserId)
    .run()

  return c.json({ success: true })
})

export default albumsIdMembers
