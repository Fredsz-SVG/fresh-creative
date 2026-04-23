import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { getSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'
import { getD1, getAssets } from '../../../../lib/edge-env'
import { deleteAlbumObject, putAlbumPhoto } from '../../../../lib/r2-assets'
import { publicAlbumAssetUrl, getR2KeyFromPublicUrl } from '../../../../lib/public-file-url'
import { albumPathFromR2Key } from '../../../../lib/storage-layout'

const classIdPhoto = new Hono()

async function canManageClass(
  db: D1Database,
  albumId: string,
  userId: string,
  role: 'admin' | 'user'
): Promise<boolean> {
  if (role === 'admin') return true
  const album = await db
    .prepare(`SELECT user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ user_id: string }>()
  if (album?.user_id === userId) return true
  const member = await db
    .prepare(`SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`)
    .bind(albumId, userId)
    .first<{ role: string }>()
  return member?.role === 'admin'
}

// POST /api/albums/:id/classes/:classId/photo
classIdPhoto.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const classId = c.req.param('classId')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const sysRole = await getRole(c, user)
    if (!(await canManageClass(db, albumId, user.id, sysRole))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const classObj = await db
      .prepare(`SELECT batch_photo_url FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ batch_photo_url: string | null }>()
    if (!classObj) return c.json({ error: 'Class not found' }, 404)

    const formData = await c.req.formData()
    const rawFile = formData.get('file')
    if (rawFile == null || typeof rawFile === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }
    const file = rawFile as File
    if (!file.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400)
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'Foto maksimal 10MB' }, 413)

    if (classObj.batch_photo_url) {
      const oldKey = getR2KeyFromPublicUrl(c, classObj.batch_photo_url)
      if (oldKey) {
        try {
          await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
        } catch (e) {
          console.error('Failed to cleanup old batch photo:', e)
        }
      }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const relPath = `classes/${classId}/${fileName}`
    const fileBuffer = await file.arrayBuffer()

    try {
      await putAlbumPhoto(bucket, relPath, fileBuffer, { contentType: file.type })
    } catch (e: unknown) {
      return c.json({ error: e instanceof Error ? e.message : 'Upload failed' }, 500)
    }

    const publicUrl = publicAlbumAssetUrl(c, relPath)

    const upd = await db
      .prepare(`UPDATE album_classes SET batch_photo_url = ? WHERE id = ? AND album_id = ?`)
      .bind(publicUrl, classId, albumId)
      .run()
    if (!upd.success) {
      await deleteAlbumObject(bucket, relPath)
      return c.json({ error: 'Update failed' }, 500)
    }

    const updatedClass = await db
      .prepare(`SELECT id, name, sort_order, batch_photo_url FROM album_classes WHERE id = ?`)
      .bind(classId)
      .first()
    return c.json(updatedClass)
  } catch (error: unknown) {
    console.error('Error in POST class photo:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

// DELETE /api/albums/:id/classes/:classId/photo
classIdPhoto.delete('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c)
    const db = getD1(c)
    const bucket = getAssets(c)
    if (!db) return c.json({ error: 'Database not configured' }, 503)
    if (!bucket) return c.json({ error: 'Storage not configured' }, 503)
    const albumId = c.req.param('id')
    const classId = c.req.param('classId')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

    const sysRole = await getRole(c, user)
    if (!(await canManageClass(db, albumId, user.id, sysRole))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const classObj = await db
      .prepare(`SELECT batch_photo_url FROM album_classes WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .first<{ batch_photo_url: string | null }>()
    if (!classObj) return c.json({ error: 'Class not found' }, 404)
    if (!classObj.batch_photo_url) return c.json({ error: 'No photo to delete' }, 400)

    if (classObj.batch_photo_url) {
      const oldKey = getR2KeyFromPublicUrl(c, classObj.batch_photo_url)
      if (oldKey) {
        try {
          await deleteAlbumObject(bucket, albumPathFromR2Key(oldKey))
        } catch (e) {
          console.error('Failed to delete batch photo from R2:', e)
        }
      }
    }

    const upd = await db
      .prepare(`UPDATE album_classes SET batch_photo_url = NULL WHERE id = ? AND album_id = ?`)
      .bind(classId, albumId)
      .run()
    if (!upd.success) return c.json({ error: 'Update failed' }, 500)

    return c.json({ success: true })
  } catch (error: unknown) {
    console.error('Error in DELETE class photo:', error)
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})

export default classIdPhoto
