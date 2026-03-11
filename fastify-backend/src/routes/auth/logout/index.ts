import { FastifyPluginAsync } from 'fastify'

const route: FastifyPluginAsync = async (server) => {
    // GET /api/auth/logout
    server.get('/', async (request, reply) => {
        reply
            .setCookie('otp_verified', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })
            .send({ ok: true })
    })
}

export default route
