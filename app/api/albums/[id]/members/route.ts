import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Fetch all associated users (admins, members, students). Allowed: owner, album admin, or global admin.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId } = await params
    if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

    const supabaseAdmin = createAdminClient()
    const client = supabaseAdmin || supabase

    const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })

    const isOwner = (album as { user_id: string }).user_id === user.id
    const globalRole = await getRole(supabase, user)
    const isGlobalAdmin = globalRole === 'admin'

    const { data: adminCheck } = await client
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

    const isAlbumAdmin = !!(adminCheck as { role?: string } | null)?.role
    const canManage = isOwner || isAlbumAdmin || isGlobalAdmin

    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 1. Get existing members (those with explicit roles) - only columns from album_members so role is always correct
    const { data: members } = await client
        .from('album_members')
        .select('user_id, role, joined_at')
        .eq('album_id', albumId)

    const memberIds = members?.map((m: any) => m.user_id).filter((id: string) => id !== album.user_id) ?? []
    let emailByUserId: Record<string, string> = {}
    if (memberIds.length > 0) {
        const { data: userRows } = await client.from('users').select('id, email').in('id', memberIds)
        if (userRows) userRows.forEach((u: any) => { emailByUserId[u.id] = u.email || 'Unknown' })
    }

    // 2. Get ALL students from class access (including those without user_id)
    const { data: allStudents } = await client
        .from('album_class_access')
        .select('user_id, student_name, email, status')
        .eq('album_id', albumId)
        .eq('status', 'approved')

    // Merge
    const userMap = new Map()

    // Add owner first with special role
    const { data: ownerData } = await client
        .from('users')
        .select('id, email')
        .eq('id', album.user_id)
        .single()

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

    // Add members first (those with roles) - role from DB
    members?.forEach((m: any) => {
        if (m.user_id === album.user_id) return // Skip owner
        const role = (m.role === 'admin' || m.role === 'member') ? m.role : 'member'
        userMap.set(m.user_id, {
            user_id: m.user_id,
            email: emailByUserId[m.user_id] || 'Unknown',
            role,
            name: null,
            has_account: true
        })
    })

    // Add ALL students (merge if already exists)
    allStudents?.forEach((s: any) => {
        if (s.user_id === album.user_id) {
            // Update owner name if found in students
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
            // User already in members: only add name/email, never overwrite role (owner/admin/member from album_members)
            existing.name = s.student_name
            if (!existing.email || existing.email === 'Unknown') existing.email = s.email
        } else {
            // New entry
            userMap.set(key, {
                user_id: s.user_id,
                email: s.email || 'Belum ada email',
                role: s.user_id ? 'student' : 'no-account',
                name: s.student_name,
                has_account: !!s.user_id
            })
        }
    })

    return NextResponse.json(Array.from(userMap.values()))
}

// POST: Promote/Add member
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId } = await params
    const body = await request.json()
    const { user_id, email, role } = body
    const supabaseAdmin = createAdminClient()
    const client = supabaseAdmin || supabase

    const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
    const isOwner = album?.user_id === user.id

    if (!isOwner) return NextResponse.json({ error: 'Hanya owner yang bisa menambah/promote member' }, { status: 403 })

    let targetUserId = user_id
    if (!targetUserId && email) {
        const { data: userData } = await client
            .from('users')
            .select('id')
            .eq('email', body.email)
            .single()

        if (!userData) {
            return NextResponse.json({ error: 'User dengan email tersebut belum terdaftar. Minta mereka untuk login/registrasi terlebih dahulu.' }, { status: 404 })
        }
        targetUserId = userData.id
    }

    if (!targetUserId) return NextResponse.json({ error: 'User ID atau Email diperlukan' }, { status: 400 })

    const roleNorm = (role === 'admin' || role === 'member') ? role : 'member'

    // Upsert member (explicit onConflict so role update persists)
    const { error } = await client
        .from('album_members')
        .upsert(
            {
                album_id: albumId,
                user_id: targetUserId,
                role: roleNorm,
            },
            { onConflict: 'album_id,user_id' }
        )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}

// DELETE: Remove member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: albumId } = await params
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')

    if (!targetUserId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const client = supabaseAdmin || supabase

    const { data: album } = await client.from('albums').select('user_id').eq('id', albumId).single()
    const isOwner = album?.user_id === user.id
    const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle()
    const isAlbumAdmin = (memberRow as { role?: string } | null)?.role === 'admin'
    const canManage = isOwner || isAlbumAdmin

    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (targetUserId === album?.user_id) return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 })
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

    // Remove from album_members
    const { error } = await client
        .from('album_members')
        .delete()
        .eq('album_id', albumId)
        .eq('user_id', targetUserId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
