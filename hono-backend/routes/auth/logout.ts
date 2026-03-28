import { Hono } from 'hono'

const authLogout = new Hono()

// GET /api/auth/logout
authLogout.get('/', (c) => {
  c.header('Set-Cookie', 'otp_verified=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax')
  return c.json({ ok: true })
})

export default authLogout