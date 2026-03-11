import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../../lib/supabase'

function generateShortInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

const route: FastifyPluginAsync = async (server) => {
  server.get('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  
    const { id: albumId } = request.params as any
    if (!albumId) {
      return reply.code(400).send({ error: 'Album ID required' })
    }
  
    const supabaseAdmin = getAdminSupabaseClient()
    const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
      .from('albums')
      .select('id, user_id, student_invite_token, student_invite_expires_at')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) {
      return reply.code(404).send({ error: 'Album not found' })
    }
  
    // Check if user is owner or admin
    const isOwner = album.user_id === user.id
    if (!isOwner) {
      // Check if album admin
      const { data: member } = await supabase
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
  
      if (!member) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
    }
  
    return reply.send({
      token: album.student_invite_token || null,
      expiresAt: album.student_invite_expires_at || null,
    })
  
  })

  server.post('/', async (request: any, reply: any) => {
  
    const supabase = getSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  
    const { id: albumId } = request.params as any
    if (!albumId) {
      return reply.code(400).send({ error: 'Album ID required' })
    }
  
    const supabaseAdmin = getAdminSupabaseClient()
    const { data: album, error: albumErr } = await (supabaseAdmin || supabase)
      .from('albums')
      .select('id, user_id')
      .eq('id', albumId)
      .single()
  
    if (albumErr || !album) {
      return reply.code(404).send({ error: 'Album not found' })
    }
  
    // Check if user is owner or admin
    const isOwner = album.user_id === user.id
    if (!isOwner) {
      // Check if album admin
      const { data: member } = await supabase
        .from('album_members')
        .select('role')
        .eq('album_id', albumId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
  
      if (!member) {
        return reply.code(403).send({ error: 'Only album owner or admin can create invite token' })
      }
    }
  
    const body = (request.body || {})
    const expiresInDays = body?.expiresInDays || 7
  
    // Generate new token (kode pendek saja)
    const token = generateShortInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  
    // Update album with new token
    const { error: updateErr } = await (supabaseAdmin || supabase)
      .from('albums')
      .update({
        student_invite_token: token,
        student_invite_expires_at: expiresAt.toISOString(),
      })
      .eq('id', albumId)
  
    if (updateErr) {
      console.error('Failed to update album with invite token:', updateErr)
      return reply.code(500).send({ error: 'Failed to generate invite token' })
    }
  
    return reply.send({
      token,
      expiresAt: expiresAt.toISOString(),
    })
  
  })

}

export default route
