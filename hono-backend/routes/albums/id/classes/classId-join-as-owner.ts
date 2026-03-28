import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

const joinAsOwnerRoute = new Hono()

joinAsOwnerRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const albumId = c.req.param('id')
  const classId = c.req.param('classId')
  if (!albumId || !classId) {
    return c.json({ error: 'Album ID and class ID required' }, 400)
  }

  const admin = getAdminSupabaseClient(c?.env as any)
  if (!admin) {
    return c.json({ error: 'Admin client not available' }, 500)
  }

  // 1. Verify user is album owner
  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) {
    return c.json({ error: 'Album not found' }, 404)
  }

  if (album.user_id !== user.id) {
    return c.json({ error: 'Only album owner can use this endpoint' }, 403)
  }

  // 2. Verify class exists and belongs to this album
  const { data: classData, error: classErr } = await admin
    .from('album_classes')
    .select('id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (classErr || !classData) {
    return c.json({ error: 'Class not found' }, 404)
  }

  // 3. Check if owner already registered in ANY class in this album (limit: 1 class only)
  const { data: anyAccess } = await admin
    .from('album_class_access')
    .select('id, class_id, student_name')
    .eq('album_id', albumId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (anyAccess) {
    // If already registered in this class
    if (anyAccess.class_id === classId) {
      return c.json({
        error: 'Anda sudah terdaftar di kelas ini',
        access: anyAccess
      }, 400)
    }
    // If already registered in another class
    return c.json({
      error: 'Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.',
      existingClassId: anyAccess.class_id
    }, 400)
  }

  // 4. Get profile data: dari body, atau bawaan dari akun web (nama & email login)
  const body = await c.req.json().catch(() => ({}))
  const fullName = (user.user_metadata?.full_name as string)?.trim() || ''
  const userEmail = (user.email as string)?.trim() || null
  const studentName = typeof body?.student_name === 'string' && body.student_name.trim()
    ? body.student_name.trim()
    : (fullName || userEmail || '')
  const email = typeof body?.email === 'string' && body.email.trim()
    ? body.email.trim()
    : userEmail

  // 5. Insert owner into album_class_access with approved status (bypass RLS)
  const { data: newAccess, error: insertErr } = await admin
    .from('album_class_access')
    .insert({
      album_id: albumId,
      class_id: classId,
      user_id: user.id,
      student_name: studentName,
      email: email,
      status: 'approved', // Owner langsung approved
    })
    .select()
    .single()

  if (insertErr) {
    console.error('[JOIN AS OWNER] Insert error:', insertErr)
    return c.json({
      error: 'Gagal menambahkan owner ke kelas',
      details: insertErr.message
    }, 500)
  }

  return c.json({
    success: true,
    access: newAccess,
    message: 'Berhasil menambahkan diri ke kelas'
  })
})

export default joinAsOwnerRoute
