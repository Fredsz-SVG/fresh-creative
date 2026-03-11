import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient } from '../../../lib/supabase'

const OTP_COOKIE_NAME = 'otp_verified'

function getSkipOtp(): boolean {
    const v = (process.env.SKIP_OTP || process.env.SKIP_LOGIN_OTP || '').trim().toLowerCase().replace(/^"|"$/g, '')
    return v === 'true' || v === '1' || v === 'yes'
}

const route: FastifyPluginAsync = async (server) => {
    // GET /api/auth/otp-status
    server.get('/', async (request: any, reply) => {
        const supabase = getSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()

        let suspended = false
        if (user) {
            const { data } = await supabase
                .from('users')
                .select('is_suspended')
                .eq('id', user.id)
                .maybeSingle()
            suspended = !!data?.is_suspended
        }

        const skipOtp = getSkipOtp()
        const cookieVerified = request.cookies?.[OTP_COOKIE_NAME] === '1'
        const verified = !suspended && (skipOtp ? !!user : !!(user && cookieVerified))

        return reply.send({ verified: !!verified, suspended })
    })
}

export default route
