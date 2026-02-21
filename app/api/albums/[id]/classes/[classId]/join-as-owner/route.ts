import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST: Owner album menambahkan dirinya sendiri ke kelas
 * Bypass RLS karena owner tidak ada di album_members (table itu hanya untuk admin/helper)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: albumId, classId } = await params
  if (!albumId || !classId) {
    return NextResponse.json({ error: 'Album ID and class ID required' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not available' }, { status: 500 })
  }

  // 1. Verify user is album owner
  const { data: album, error: albumErr } = await admin
    .from('albums')
    .select('id, user_id')
    .eq('id', albumId)
    .single()

  if (albumErr || !album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  if (album.user_id !== user.id) {
    return NextResponse.json({ error: 'Only album owner can use this endpoint' }, { status: 403 })
  }

  // 2. Verify class exists and belongs to this album
  const { data: classData, error: classErr } = await admin
    .from('album_classes')
    .select('id')
    .eq('id', classId)
    .eq('album_id', albumId)
    .single()

  if (classErr || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
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
      return NextResponse.json({ 
        error: 'Anda sudah terdaftar di kelas ini',
        access: anyAccess 
      }, { status: 400 })
    }
    
    // If already registered in another class
    return NextResponse.json({ 
      error: 'Anda sudah terdaftar di kelas lain. Hanya bisa daftar di 1 kelas.',
      existingClassId: anyAccess.class_id
    }, { status: 400 })
  }

  // 4. Get profile data: dari body, atau bawaan dari akun web (nama & email login)
  const body = await request.json().catch(() => ({}))
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
    return NextResponse.json({ 
      error: 'Gagal menambahkan owner ke kelas',
      details: insertErr.message 
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    access: newAccess,
    message: 'Berhasil menambahkan diri ke kelas'
  })
}
