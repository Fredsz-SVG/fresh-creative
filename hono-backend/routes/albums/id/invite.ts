import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'

function generateShortInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const albumInviteRoute = new Hono()

albumInviteRoute.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const albumId = c.req.param('id')
  if (!albumId) return c.json({ error: 'Album ID required' }, 400)

  const supabaseAdmin = getAdminSupabaseClient(c?.env as any)
  const { data: album, error: albumErr } = await supabaseAdmin
    .from('albums').select('id, user_id').eq('id', albumId).single()
  if (albumErr || !album) return c.json({ error: 'Album not found' }, 404)

  const sysRole = await getRole(supabase, user)
  const isOwner = (album as any).user_id === user.id
  const isSysAdmin = sysRole === 'admin'

  if (!isOwner && !isSysAdmin) {
    const { data: member } = await supabase
      .from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!member) return c.json({ error: 'Only album owner or admin can create invite' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const inviteRole = body?.role === 'admin' ? 'admin' : 'member'
  if (inviteRole === 'admin' && !isOwner && !isSysAdmin) {
    return c.json({ error: 'Only main owner can create admin invites' }, 403)
  }

  const token = generateShortInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invite, error: inviteErr } = await supabase
    .from('album_invites')
    .insert({ album_id: albumId, token, created_by: user.id, role: inviteRole, expires_at: expiresAt.toISOString() })
    .select('id, token, expires_at, role').single()

  if (inviteErr) return c.json({ error: inviteErr.message }, 500)

  const origin = c.req.header('origin') || ''
  const inviteLink = `${origin}/join/${(invite as any).token}`

  return c.json({
    token: (invite as any).token, role: (invite as any).role,
    inviteLink, expiresAt: (invite as any).expires_at,
  })
})

export default albumInviteRoute
