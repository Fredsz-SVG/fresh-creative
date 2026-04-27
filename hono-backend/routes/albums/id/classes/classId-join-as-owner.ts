import { Hono } from 'hono'
import { getD1 } from '../../../../lib/edge-env'
import { AppEnv, requireAuthJwt } from '../../../../middleware'
import { getAuthUserFromContext } from '../../../../lib/auth-user'

const joinAsOwnerRoute = new Hono<AppEnv>()
joinAsOwnerRoute.use('*', requireAuthJwt)

joinAsOwnerRoute.post('/', async (c) => {
  const db = getD1(c)
  if (!db) return c.json({ error: 'Database not configured' }, 503)
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) {
    return c.json({ error: 'Album ID and class ID required' }, 400)
  }

  const album = await db
    .prepare(`SELECT id, user_id FROM albums WHERE id = ?`)
    .bind(albumId)
    .first<{ id: string; user_id: string }>()

  if (!album) {
    return c.json({ error: 'Album not found' }, 404)
  }

  if (album.user_id !== user.id) {
    return c.json({ error: 'Only album owner can use this endpoint' }, 403)
  }

  const classData = await db
    .prepare(`SELECT id FROM album_classes WHERE id = ? AND album_id = ?`)
    .bind(classId, albumId)
    .first<{ id: string }>()

  if (!classData) {
    return c.json({ error: 'Class not found' }, 404)
  }

  const anyAccess = await db
    .prepare(
      `SELECT id, class_id, student_name FROM album_class_access WHERE album_id = ? AND user_id = ?`
    )
    .bind(albumId, user.id)
    .first<{ id: string; class_id: string; student_name: string }>()

  if (anyAccess) {
    if (anyAccess.class_id === classId) {
      return c.json(
        {
          error: 'Anda sudah terdaftar di kelas ini',
          access: anyAccess,
        },
        400
      )
    }
    return c.json(
      {
        error: 'Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.',
        existingClassId: anyAccess.class_id,
      },
      400
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() || ''
  const userEmail = (user.email as string | null | undefined)?.trim() || null
  const studentName =
    typeof body?.student_name === 'string' && body.student_name.trim()
      ? body.student_name.trim()
      : fullName || userEmail || ''
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : userEmail

  const accessId = crypto.randomUUID()
  const ins = await db
    .prepare(
      `INSERT INTO album_class_access (id, album_id, class_id, user_id, student_name, email, status, photos, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', '[]', datetime('now'), datetime('now'))`
    )
    .bind(accessId, albumId, classId, user.id, studentName, email)
    .run()

  if (!ins.success) {
    console.error('[JOIN AS OWNER] Insert error')
    return c.json(
      {
        error: 'Gagal menambahkan owner ke kelas',
      },
      500
    )
  }

  const newAccess = await db
    .prepare(`SELECT * FROM album_class_access WHERE id = ?`)
    .bind(accessId)
    .first()

  return c.json({
    success: true,
    access: newAccess,
    message: 'Berhasil menambahkan diri ke kelas',
  })
})

export default joinAsOwnerRoute
