import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const OTP_EXPIRY_MINUTES = 5

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

const route: FastifyPluginAsync = async (server) => {
    // POST /api/auth/send-login-otp
    server.post('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user?.email) {
            return reply.code(401).send({ error: 'Unauthorized' })
        }

        const apiKey = process.env.RESEND_API_KEY
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

        if (apiKey) {
            const code = generateOtp()
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
            let db: any
            try { db = getAdminSupabaseClient() } catch { db = supabase }

            const { error: upsertError } = await db
                .from('login_otps')
                .upsert({ user_id: user.id, code, expires_at: expiresAt }, { onConflict: 'user_id' })

            if (upsertError) {
                return reply.code(500).send({ error: upsertError.message })
            }

            try {
                const { Resend } = await import('resend')
                const resend = new Resend(apiKey)
                const { error: resendError } = await resend.emails.send({
                    from: fromEmail,
                    to: user.email,
                    subject: 'Kode OTP masuk dashboard',
                    html: `<p>Kode OTP Anda: <strong>${code}</strong></p><p>Berlaku ${OTP_EXPIRY_MINUTES} menit.</p>`,
                })
                if (resendError) {
                    console.error('Resend API error:', resendError)
                    return reply.code(500).send({ error: (resendError as any).message || 'Gagal mengirim email OTP' })
                }
            } catch (err) {
                console.error('Resend send error:', err)
                return reply.code(500).send({ error: 'Gagal mengirim email OTP' })
            }
            return reply.send({ ok: true })
        }

        // Fallback: Supabase OTP
        const { error } = await supabase.auth.signInWithOtp({
            email: user.email,
            options: { shouldCreateUser: false },
        })
        if (error) {
            return reply.code(400).send({ error: error.message })
        }
        return reply.send({ ok: true })
    })
}

export default route
