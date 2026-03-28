import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const transactions = new Hono()

transactions.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  const url = new URL(c.req.url)
  const scope = url.searchParams.get('scope')
  const adminClient = getAdminSupabaseClient(c?.env as any)
  const selectWithDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
  const selectWithoutDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)'
  if (scope !== 'all') {
    let data: any[] | null = null; let error: any = null
    const selectWithDescUser = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
    const res1 = await adminClient.from('transactions').select(selectWithDescUser).eq('user_id', user.id).order('created_at', { ascending: false })
    if (res1.error) {
      const res2 = await adminClient.from('transactions').select(selectWithoutDesc).eq('user_id', user.id).order('created_at', { ascending: false })
      data = res2.data; error = res2.error
    } else { data = res1.data }
    if (error) return c.json({ error: error.message }, 500)
    const list = (data || []).map((row: any) => {
      const { credit_packages, albums, ...rest } = row
      const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
      const album = Array.isArray(albums) ? albums[0] : albums
      return { ...rest, credits: pkg?.credits ?? null, album_name: album?.name ?? null }
    })
    return c.json(list)
  }
  // All transactions (scope=all)
  const selectAllWithDesc = 'id, user_id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
  const selectAllWithoutDesc = 'id, user_id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)'
  let rows: any[] | null = null; let rowsError: any = null
  const r1 = await adminClient.from('transactions').select(selectAllWithDesc).order('created_at', { ascending: false })
  if (r1.error) {
    const r2 = await adminClient.from('transactions').select(selectAllWithoutDesc).order('created_at', { ascending: false })
    rows = r2.data; rowsError = r2.error
  } else { rows = r1.data }
  if (rowsError) return c.json({ error: rowsError.message }, 500)
  const list = rows || []
  if (list.length === 0) return c.json([])
  const userIds = [...new Set(list.map((r: any) => r.user_id))]
  const { data: users } = await adminClient.from('users').select('id, full_name, email').in('id', userIds)
  const userMap = new Map((users || []).map((u: any) => [u.id, { full_name: u.full_name || '-', email: u.email || '-' }]))
  return c.json(list.map((tx: any) => {
    const u: any = userMap.get(tx.user_id) || { full_name: '-', email: '-' }
    const { credit_packages, albums, ...rest } = tx
    const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
    const album = Array.isArray(albums) ? albums[0] : albums
    return { ...rest, credits: pkg?.credits ?? null, album_name: album?.name ?? null, user_full_name: u.full_name, user_email: u.email }
  }))
})

export default transactions
