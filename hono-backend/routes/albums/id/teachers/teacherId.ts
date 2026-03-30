import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject } from '../../../../lib/r2-assets'

const albumsIdTeachersTeacherId = new Hono()

async function canManageTeacher(
  db: D1Database,
  albumId: string,
  userId: string,
  isGlobalAdmin: boolean
): Promise<boolean> {
  if (isGlobalAdmin) return true
  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  if (!album) return false
  if (album.user_id === userId) return true
  const member = await db
    .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, userId)
    .first<{ role: string }>()
  return member?.role === 'admin'
}

// PATCH /api/albums/:id/teachers/:teacherId
albumsIdTeachersTeacherId.patch('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
    const body = await c.req.json()
    const { name, title, message, video_url } = body
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const isGlobalAdmin = (await getRole(c, user)) === 'admin'
    if (!(await canManageTeacher(db, albumId, user.id, isGlobalAdmin))) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (title !== undefined) updateData.title = title?.trim() || null
    if (message !== undefined) updateData.message = message?.trim() || null
    if (video_url !== undefined) updateData.video_url = video_url?.trim() || null
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }
    const existingTeacher = await db
      .prepare(`SELECT * FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first()
    if (!existingTeacher) {
      return c.json({ error: 'Teacher not found' }, 404)
    }
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, v] of Object.entries(updateData)) {
      sets.push(`${k} = ?`)
      vals.push(v)
    }
    sets.push(`updated_at = datetime('now')`)
    vals.push(teacherId, albumId)
    const r = await db
      .prepare(`UPDATE album_teachers SET ${sets.join(', ')} WHERE id = ? AND album_id = ?`)
      .bind(...vals)
      .run()
    if (!r.success) return c.json({ error: 'Update failed' }, 500)
    const updated = await db
      .prepare(`SELECT * FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first()
    return c.json(updated, 200)
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/teachers/:teacherId
albumsIdTeachersTeacherId.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    const albumId = c.req.param('id')
    const teacherId = c.req.param('teacherId')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const isGlobalAdmin = (await getRole(c, user)) === 'admin'
    if (!(await canManageTeacher(db, albumId, user.id, isGlobalAdmin))) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const teacher = await db
      .prepare(`SELECT photo_url FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .first<{ photo_url: string | null }>()
    if (teacher?.photo_url && bucket) {
      try {
        const urlParts = teacher.photo_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        await deleteAlbumObject(bucket, `teachers/${teacherId}/${fileName}`)
      } catch {
        /* ignore */
      }
    }
    const del = await db
      .prepare(`DELETE FROM album_teachers WHERE id = ? AND album_id = ?`)
      .bind(teacherId, albumId)
      .run()
    if (!del.success) return c.json({ error: 'Delete failed' }, 500)
    return c.json({ success: true }, 200)
  } catch (error: unknown) {
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default albumsIdTeachersTeacherId
