import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'

const userTransactions = new Hono()

// GET - List user transactions
userTransactions.get('/', async (c) => {
  const supabase = getSupabaseClient(c)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return c.json({ error: 'Unauthorized' }, 401)

  const adminClient = getAdminSupabaseClient(c?.env as any)
  const selectWithDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, description, albums(name), credit_packages(credits)'
  const selectWithoutDesc = 'id, external_id, amount, status, payment_method, invoice_url, created_at, album_id, albums(name), credit_packages(credits)'

  let data: any[] | null = null
  let error: any = null

  const res1 = await adminClient.from('transactions').select(selectWithDesc).eq('user_id', user.id).order('created_at', { ascending: false })
  if (res1.error) {
    const res2 = await adminClient.from('transactions').select(selectWithoutDesc).eq('user_id', user.id).order('created_at', { ascending: false })
    data = res2.data; error = res2.error
  } else {
    data = res1.data
  }

  if (error) return c.json({ error: error.message }, 500)

  const list = (data || []).map((row: any) => {
    const { credit_packages, albums, ...rest } = row
    const pkg = Array.isArray(credit_packages) ? credit_packages[0] : credit_packages
    const album = Array.isArray(albums) ? albums[0] : albums
    return { ...rest, credits: pkg?.credits ?? null, album_name: album?.name ?? null }
  })
  return c.json(list)
})

export default userTransactions