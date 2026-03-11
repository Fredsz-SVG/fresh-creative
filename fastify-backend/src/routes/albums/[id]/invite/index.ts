import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'
import { getRole } from '../../../../lib/auth'

function generateShortInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}


const route: FastifyPluginAsync = async (server) => {
  server.post('/', async (request: any, reply) => {
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return reply.code(401).send({ error: 'Unauthorized' })

    const { id: albumId } = request.params as any
    if (!albumId) return reply.code(400).send({ error: 'Album ID required' })

    const supabaseAdmin = getAdminSupabaseClient()
    const { data: album, error: albumErr } = await supabaseAdmin
      .from('albums').select('id, user_id').eq('id', albumId).single()
    if (albumErr || !album) return reply.code(404).send({ error: 'Album not found' })

    const sysRole = await getRole(supabase, user)
    const isOwner = (album as any).user_id === user.id
    const isSysAdmin = sysRole === 'admin'

    if (!isOwner && !isSysAdmin) {
      const { data: member } = await supabase
        .from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      if (!member) return reply.code(403).send({ error: 'Only album owner or admin can create invite' })
    }

    const body = request.body || {}
    const inviteRole = body?.role === 'admin' ? 'admin' : 'member'
    if (inviteRole === 'admin' && !isOwner && !isSysAdmin) {
      return reply.code(403).send({ error: 'Only main owner can create admin invites' })
    }

    const token = generateShortInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: inviteErr } = await supabase
      .from('album_invites')
      .insert({ album_id: albumId, token, created_by: user.id, role: inviteRole, expires_at: expiresAt.toISOString() })
      .select('id, token, expires_at, role').single()

    if (inviteErr) return reply.code(500).send({ error: inviteErr.message })

    const origin = request.headers['origin'] || ''
    const inviteLink = `${origin}/join/${(invite as any).token}`

    return reply.send({
      token: (invite as any).token, role: (invite as any).role,
      inviteLink, expiresAt: (invite as any).expires_at,
    })
  })
}

export default route
