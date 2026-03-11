import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import { getRole } from '../../../lib/auth'


const OTP_COOKIE_NAME = 'otp_verified'
const OTP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const route: FastifyPluginAsync = async (server) => {
    // POST /api/auth/verify-login-otp
    server.post('/', async (request: any, reply) => {
        const body = request.body || {}
        const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
        const code = rawCode.replace(/\D/g, '').slice(0, 6)
        const nextPath = typeof body.next === 'string' ? body.next.trim() : ''
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : ''

        if (!code) {
            return reply.code(400).send({ error: 'Kode OTP wajib diisi' })
        }

        const supabase = getSupabaseClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return reply.code(401).send({ error: 'Unauthorized' })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('is_suspended')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.is_suspended) {
            await supabase.auth.signOut()
            return reply.code(403).send({ error: 'Akun Anda sedang disuspend. Silakan hubungi admin.' })
        }

        let db: any
        try { db = getAdminSupabaseClient() } catch { db = supabase }

        const { data: row } = await db
            .from('login_otps')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

        if (row) {
            await db.from('login_otps').delete().eq('user_id', user.id)
            const role = await getRole(supabase, user)
            const redirectTo = role === 'admin' ? '/admin' : '/user'
            return reply
                .setCookie(OTP_COOKIE_NAME, '1', {
                    path: '/', maxAge: OTP_COOKIE_MAX_AGE, httpOnly: true,
                    sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
                })
                .send({ ok: true, redirectTo })
        }

        // Fallback: Supabase verifyOtp
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
            email: user.email, token: code, type: 'email',
        })

        if (verifyError) {
            const msg = verifyError.message === 'Token has expired or is invalid'
                ? 'Kode OTP tidak valid atau sudah kadaluarsa' : verifyError.message
            return reply.code(400).send({ error: msg })
        }

        const verifiedUser = data?.user ?? user
        const role = await getRole(supabase, verifiedUser)
        const redirectTo = safeNext || (role === 'admin' ? '/admin' : '/user')

        return reply
            .setCookie(OTP_COOKIE_NAME, '1', {
                path: '/', maxAge: OTP_COOKIE_MAX_AGE, httpOnly: true,
                sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
            })
            .send({ ok: true, redirectTo })
    })
}

export default route
