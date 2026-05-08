import { D1Database } from '@cloudflare/workers-types'
import { invalidateUserResponseCaches } from './user-response-cache'

export interface CreateNotificationOptions {
  userId: string
  title: string
  message: string
  type?: string
  actionUrl?: string | null
  metadata?: any
  sendEmail?: boolean
}

/**
 * Helper to create a notification in DB and optionally send an email
 */
export async function createNotification(
  db: D1Database,
  env: any,
  options: CreateNotificationOptions
) {
  const { userId, title, message, type = 'info', actionUrl = null, metadata = null, sendEmail = true } = options
  
  const id = crypto.randomUUID()
  const metaStr = metadata !== null ? JSON.stringify(metadata) : null

  // 1. Insert into DB
  const ins = await db
    .prepare(
      `INSERT INTO notifications (id, user_id, title, message, type, action_url, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(id, userId, title, message, type, actionUrl, metaStr)
    .run()

  if (!ins.success) {
    console.error(`[createNotification] DB Insert failed for user ${userId}`)
  } else {
    invalidateUserResponseCaches(userId)
  }

  // 2. Send Email if requested (and env is configured)
  if (sendEmail && env.RESEND_API_KEY) {
    try {
      // Get user email
      const user = await db
        .prepare('SELECT email, full_name FROM users WHERE id = ?')
        .bind(userId)
        .first<{ email: string; full_name: string }>()

      if (user?.email) {
        const { Resend } = await import('resend')
        const resend = new Resend(env.RESEND_API_KEY)
        const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

        const formattedMessage = message.split('\n').map((line, i) => {
          const l = line.trim()
          if (i === 0 && (l === 'Menunggu Persetujuan' || l === 'Disetujui' || l.startsWith('Ditolak'))) {
            const color = l === 'Disetujui' ? '#10b981' : l === 'Menunggu Persetujuan' ? '#f59e0b' : '#ef4444'
            return `<div style="display: inline-block; padding: 4px 10px; background-color: ${color}; color: white; border-radius: 4px; font-weight: 800; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${l}</div>`
          }
          return line
        }).join('<br/>')

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: title,
          html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #0f172a;">
              <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; margin: 0 0 24px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
                ${title}
              </h1>
              
              <div style="margin-bottom: 32px;">
                <p style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Halo ${user.full_name || 'User'},</p>
                <div style="font-size: 15px; line-height: 1.6; color: #475569;">
                  ${formattedMessage}
                </div>
              </div>
              
              ${actionUrl ? `
                <div style="margin-top: 32px;">
                  <a href="${env.NEXT_PUBLIC_APP_URL || 'https://fresh-creative.id'}${actionUrl}" 
                     style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                    Lihat di Dashboard
                  </a>
                </div>
              ` : ''}
              
              <div style="margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <p style="font-size: 12px; color: #94a3b8; font-weight: 500; margin: 0;">
                  Notifikasi otomatis dari Fresh Creative Indonesia.<br/>
                  &copy; ${new Date().getFullYear()} Fresh Creative ID.
                </p>
              </div>
            </div>
          `
        })

        if (error) {
          console.error('[createNotification] Resend error:', error)
        }
      }
    } catch (err) {
      console.error('[createNotification] Email send unexpected error:', err)
    }
  }

  // Return the record (optional, can fetch again if needed)
  return { id, userId, title, message, type, action_url: actionUrl, metadata, created_at: new Date().toISOString() }
}
