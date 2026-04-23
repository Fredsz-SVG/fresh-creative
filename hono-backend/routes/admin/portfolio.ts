import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSupabaseClient } from '../../lib/supabase'
import { getRole } from '../../lib/auth'
import { ensureUserInD1, honoEnvForSupabasePublicSync } from '../../lib/d1-users'
import { putAlbumPhoto, deleteAlbumObject } from '../../lib/r2-assets'
import { albumPathFromR2Key } from '../../lib/storage-layout'
import { getR2KeyFromPublicUrl } from '../../lib/public-file-url'

interface HonoUser {
  id: string
  role: string
}

const adminPortfolio = new Hono<{ Variables: { user: HonoUser } }>()

function requireDb(c: Context<{ Variables: { user: HonoUser } }>): D1Database | null {
  return (c.env as { DB?: D1Database }).DB ?? null
}

function requireAssets(c: Context<{ Variables: { user: HonoUser } }>): R2Bucket | null {
  return (c.env as { ASSETS?: R2Bucket }).ASSETS ?? null
}

// GET /api/admin/portfolio
adminPortfolio.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 not configured' }, 503)
  
  await ensureUserInD1(db, user, honoEnvForSupabasePublicSync(c.env))
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
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
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
    let imageUrl = formData.imageUrl as string || ''

    if (imageFile && typeof imageFile !== 'string') {
      const fileName = `${id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, imageFile, { contentType: imageFile.type })
      imageUrl = `/api/files/${key}`
    }

    await db.prepare(
      `INSERT INTO portfolio_items (id, title, subtitle, description, image_url, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, title, subtitle, description, imageUrl, displayOrder).run()

    return c.json({ success: true, id })
  } catch (e) {
    console.error('Portfolio create failed:', e)
    return c.json({ error: e instanceof Error ? e.message : 'Create failed' }, 500)
  }
})

// PUT /api/admin/portfolio/:id
adminPortfolio.put('/:id', async (c) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
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
    let imageUrl = formData.imageUrl as string

    // 0. Fetch existing item to know the old image_url
    const oldItem = await db.prepare('SELECT image_url FROM portfolio_items WHERE id = ?').bind(id).first() as { image_url?: string } | null
    const oldImageUrl = oldItem?.image_url

    if (imageFile && typeof imageFile !== 'string') {
      // 1. Delete old image from R2 if it exists and is an internal file
      const oldKey = getR2KeyFromPublicUrl(c, oldImageUrl || '')
      if (oldKey) {
        const relativePath = albumPathFromR2Key(oldKey)
        try {
          await deleteAlbumObject(assets, relativePath)
        } catch (e) {
          console.error('Failed to delete old portfolio image from R2:', e)
        }
      }

      const fileName = `${id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const r2Key = `landing/portfolio/${fileName}`
      const { key } = await putAlbumPhoto(assets, r2Key, imageFile, { contentType: imageFile.type })
      imageUrl = `/api/files/${key}`
    }

    await db.prepare(
      `UPDATE portfolio_items 
       SET title = ?, subtitle = ?, description = ?, image_url = ?, display_order = ?, updated_at = (datetime('now'))
       WHERE id = ?`
    ).bind(title, subtitle, description, imageUrl, displayOrder, id).run()

    return c.json({ success: true })
  } catch (e) {
    console.error('Portfolio update failed:', e)
    return c.json({ error: e instanceof Error ? e.message : 'Update failed' }, 500)
  }
})

// DELETE /api/admin/portfolio/:id
adminPortfolio.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const supabase = getSupabaseClient(c)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = requireDb(c)
  if (!db) return c.json({ error: 'D1 not configured' }, 503)

  if (await getRole(c, user) !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    const assets = requireAssets(c)
    // 0. Fetch existing item to know the image_url
    const oldItem = await db.prepare('SELECT image_url FROM portfolio_items WHERE id = ?').bind(id).first() as { image_url?: string } | null
    const oldImageUrl = oldItem?.image_url

    // 1. Delete from R2 if it exists and we have bucket access
    const oldKey = getR2KeyFromPublicUrl(c, oldImageUrl || '')
    if (assets && oldKey) {
      const relativePath = albumPathFromR2Key(oldKey)
      try {
        await deleteAlbumObject(assets, relativePath)
      } catch (e) {
        console.error('Failed to delete portfolio image from R2 on delete:', e)
      }
    }

    await db.prepare('DELETE FROM portfolio_items WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Delete failed' }, 500)
  }
})

export default adminPortfolio
