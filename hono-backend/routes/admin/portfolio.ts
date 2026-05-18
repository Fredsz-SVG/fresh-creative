import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getRole } from '../../lib/auth'
import { ensureUserInD1 } from '../../lib/d1-users'
import { putAlbumPhoto, deleteAlbumObject } from '../../lib/r2-assets'
import { albumPathFromR2Key } from '../../lib/storage-layout'
import { getR2KeyFromPublicUrl } from '../../lib/public-file-url'
import { AppEnv, requireAuthJwt } from '../../middleware'
import { getAuthUserFromContext } from '../../lib/auth-user'
import { publishRealtimeEventFromContext } from '../../lib/realtime'
import { invalidatePortfolioCache } from '../../lib/public-cache'

const adminPortfolio = new Hono<AppEnv>()
adminPortfolio.use('*', requireAuthJwt)

function requireDb(c: Context): D1Database | null {
  return (c.env as { DB?: D1Database }).DB ?? null
}

function requireAssets(c: Context): R2Bucket | null {
  return (c.env as { ASSETS?: R2Bucket }).ASSETS ?? null
}

// GET /api/admin/portfolio
adminPortfolio.get('/', async (c) => {
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 not configured' }, 503)
  
  await ensureUserInD1(db, user)
  if (await getRole(c, user) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    const { results } = await db.prepare('SELECT * FROM portfolio_items ORDER BY display_order ASC').all()
    return c.json(results)
  } catch {
    return c.json({ error: 'Failed to fetch portfolio' }, 500)
  }
})

// POST /api/admin/portfolio
adminPortfolio.post('/', async (c) => {
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  const assets = requireAssets(c)
  if (!db || !assets) return c.json({ error: 'Storage not configured' }, 503)

  if (await getRole(c, user) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    const formData = await c.req.parseBody()
    const id = (formData.id as string) || crypto.randomUUID()
    const title = formData.title as string
    const subtitle = formData.subtitle as string
    const description = formData.description as string
    const displayOrder = parseInt(formData.displayOrder as string) || 0
    const imageFile = formData.image as File
    const videoFile = formData.video as File
    let imageUrl = formData.imageUrl as string || ''
    let videoUrl = formData.videoUrl as string || ''

    if (imageFile && typeof imageFile !== 'string') {
      const fileName = `${id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, imageFile, { contentType: imageFile.type })
      imageUrl = `/api/files/${key}`
    }

    if (videoFile && typeof videoFile !== 'string' && videoFile.size > 0) {
      const fileName = `${id}-${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/videos/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, videoFile, { contentType: videoFile.type })
      videoUrl = `/api/files/${key}`
    }

    // Make room for the new item
    await db.prepare('UPDATE portfolio_items SET display_order = display_order + 1 WHERE display_order >= ?')
      .bind(displayOrder).run()

    await db.prepare(
      `INSERT INTO portfolio_items (id, title, subtitle, description, image_url, video_url, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, title, subtitle, description, imageUrl, videoUrl || null, displayOrder).run()

    c.executionCtx.waitUntil(publishRealtimeEventFromContext(c, {
      type: 'api.mutated',
      channel: 'global',
      payload: { path: '/api/admin/portfolio' },
      ts: new Date().toISOString()
    }))
    // Bust public portfolio cache
    invalidatePortfolioCache()

    return c.json({ success: true, id })
  } catch (e) {
    console.error('Portfolio create failed:', e)
    return c.json({ error: e instanceof Error ? e.message : 'Create failed' }, 500)
  }
})

// PUT /api/admin/portfolio/:id
adminPortfolio.put('/:id', async (c) => {
  const id = c.req.param('id')
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  const assets = requireAssets(c)
  if (!db || !assets) return c.json({ error: 'Storage not configured' }, 503)

  if (await getRole(c, user) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    const formData = await c.req.parseBody()
    const title = formData.title as string
    const subtitle = formData.subtitle as string
    const description = formData.description as string
    const displayOrder = parseInt(formData.displayOrder as string) || 0
    const imageFile = formData.image as File
    const videoFile = formData.video as File
    const removeVideo = formData.removeVideo === 'true'
    let imageUrl = formData.imageUrl as string
    let videoUrl = formData.videoUrl as string

    // Fetch existing item
    const oldItem = await db.prepare('SELECT display_order, image_url, video_url FROM portfolio_items WHERE id = ?')
      .bind(id).first() as { display_order?: number; image_url?: string; video_url?: string } | null
    const oldOrder = oldItem?.display_order
    const oldImageUrl = oldItem?.image_url
    const oldVideoUrl = oldItem?.video_url

    // Handle image replacement
    if (imageFile && typeof imageFile !== 'string') {
      const oldKey = getR2KeyFromPublicUrl(c, oldImageUrl || '')
      if (oldKey) {
        const relativePath = albumPathFromR2Key(oldKey)
        try { await deleteAlbumObject(assets, relativePath) } catch (e) {
          console.error('Failed to delete old portfolio image from R2:', e)
        }
      }
      const fileName = `${id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, imageFile, { contentType: imageFile.type })
      imageUrl = `/api/files/${key}`
    }

    // Handle video: replace or remove
    if (removeVideo) {
      // Admin explicitly removed the video
      if (oldVideoUrl) {
        const oldKey = getR2KeyFromPublicUrl(c, oldVideoUrl)
        if (oldKey) {
          const relativePath = albumPathFromR2Key(oldKey)
          try { await deleteAlbumObject(assets, relativePath) } catch (e) {
            console.error('Failed to delete old portfolio video from R2:', e)
          }
        }
      }
      videoUrl = ''
    } else if (videoFile && typeof videoFile !== 'string' && videoFile.size > 0) {
      // New video uploaded — delete old one first
      if (oldVideoUrl) {
        const oldKey = getR2KeyFromPublicUrl(c, oldVideoUrl)
        if (oldKey) {
          const relativePath = albumPathFromR2Key(oldKey)
          try { await deleteAlbumObject(assets, relativePath) } catch (e) {
            console.error('Failed to delete old portfolio video from R2:', e)
          }
        }
      }
      const fileName = `${id}-${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/videos/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, videoFile, { contentType: videoFile.type })
      videoUrl = `/api/files/${key}`
    } else {
      // Keep existing video_url (passed from frontend) or fallback to what's in DB
      videoUrl = videoUrl ?? oldVideoUrl ?? ''
    }

    // Shift other items to make room for the new displayOrder
    if (oldOrder !== undefined && oldOrder !== null && oldOrder !== displayOrder) {
      if (oldOrder < displayOrder) {
        await db.prepare('UPDATE portfolio_items SET display_order = display_order - 1 WHERE display_order > ? AND display_order <= ?')
          .bind(oldOrder, displayOrder).run()
      } else {
        await db.prepare('UPDATE portfolio_items SET display_order = display_order + 1 WHERE display_order >= ? AND display_order < ?')
          .bind(displayOrder, oldOrder).run()
      }
    }

    await db.prepare(
      `UPDATE portfolio_items 
       SET title = ?, subtitle = ?, description = ?, image_url = ?, video_url = ?, display_order = ?, updated_at = (datetime('now'))
       WHERE id = ?`
    ).bind(title, subtitle, description, imageUrl, videoUrl || null, displayOrder, id).run()

    c.executionCtx.waitUntil(publishRealtimeEventFromContext(c, {
      type: 'api.mutated',
      channel: 'global',
      payload: { path: '/api/admin/portfolio' },
      ts: new Date().toISOString()
    }))
    // Bust public portfolio cache
    invalidatePortfolioCache()

    return c.json({ success: true })
  } catch (e) {
    console.error('Portfolio update failed:', e)
    return c.json({ error: e instanceof Error ? e.message : 'Update failed' }, 500)
  }
})

// DELETE /api/admin/portfolio/:id
adminPortfolio.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = getAuthUserFromContext(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 not configured' }, 503)

  if (await getRole(c, user) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    const assets = requireAssets(c)
    const oldItem = await db.prepare('SELECT display_order, image_url, video_url FROM portfolio_items WHERE id = ?')
      .bind(id).first() as { display_order?: number; image_url?: string; video_url?: string } | null
    const oldOrder = oldItem?.display_order
    const oldImageUrl = oldItem?.image_url
    const oldVideoUrl = oldItem?.video_url

    if (assets) {
      // Delete image
      const oldImageKey = getR2KeyFromPublicUrl(c, oldImageUrl || '')
      if (oldImageKey) {
        const relativePath = albumPathFromR2Key(oldImageKey)
        try { await deleteAlbumObject(assets, relativePath) } catch (e) {
          console.error('Failed to delete portfolio image from R2 on delete:', e)
        }
      }
      // Delete video
      const oldVideoKey = getR2KeyFromPublicUrl(c, oldVideoUrl || '')
      if (oldVideoKey) {
        const relativePath = albumPathFromR2Key(oldVideoKey)
        try { await deleteAlbumObject(assets, relativePath) } catch (e) {
          console.error('Failed to delete portfolio video from R2 on delete:', e)
        }
      }
    }

    await db.prepare('DELETE FROM portfolio_items WHERE id = ?').bind(id).run()

    if (oldOrder !== undefined && oldOrder !== null) {
      // Shift items down to fill the gap
      await db.prepare('UPDATE portfolio_items SET display_order = display_order - 1 WHERE display_order > ?')
        .bind(oldOrder).run()
    }
    c.executionCtx.waitUntil(publishRealtimeEventFromContext(c, {
      type: 'api.mutated',
      channel: 'global',
      payload: { path: '/api/admin/portfolio' },
      ts: new Date().toISOString()
    }))
    // Bust public portfolio cache
    invalidatePortfolioCache()

    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Delete failed' }, 500)
  }
})

export default adminPortfolio






