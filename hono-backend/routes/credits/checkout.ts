import { Hono } from 'hono'
import { getSupabaseClient, getAdminSupabaseClient } from '../../lib/supabase'

const creditsCheckout = new Hono()

creditsCheckout.post('/', async (c) => {
  const supabase = getSupabaseClient(c)
  try {
    const body = await c.req.json().catch(() => ({}))
    const { packageId } = body
    if (!packageId) return c.json({ error: 'Package ID required' }, 400)

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    const userId = user.id

    // Get package info
    const { data: pkg, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError || !pkg) return c.json({ error: 'Package not found' }, 404)

    // Check role for redirect
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    const isAdmin = profile?.role === 'admin'
    const redirectPath = isAdmin ? '/admin/riwayat' : '/user/riwayat'

    // Create Invoice via Xendit REST API
    const xenditKey = (c.env as any).XENDIT_SECRET_KEY || ''
    const baseUrl = (c.env as any).NEXT_PUBLIC_APP_URL || ''

    const externalId = `pkg_${pkg.id}_user_${userId}_ts_${Date.now()}`
    const invoicePayload: any = {
      external_id: externalId,
      amount: pkg.price,
      currency: 'IDR',
      description: `Top up ${pkg.credits} credits`,
      success_redirect_url: `${baseUrl}${redirectPath}?status=success`,
      failure_redirect_url: `${baseUrl}${redirectPath}?status=failed`,
      items: [{
        name: `${pkg.credits} Credits Package`,
        quantity: 1,
        price: pkg.price,
      }]
    }

    if (user.email) {
      invoicePayload.payer_email = user.email
      invoicePayload.customer = {
        given_names: user.user_metadata?.full_name || 'Customer',
        email: user.email
      }
    }

    const auth = btoa(xenditKey + ':')
    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    })
    const invoice = await xenditRes.json() as any

    if (!xenditRes.ok) {
      console.error('Xendit error:', invoice)
      return c.json({ error: invoice?.message || 'Failed to create invoice' }, 500)
    }

    // Log transaction to database
    try {
      const adminSupabase = getAdminSupabaseClient(c?.env as any)
      await adminSupabase.from('transactions').insert([{
        user_id: userId,
        external_id: externalId,
        package_id: packageId,
        amount: pkg.price,
        status: invoice.status || 'PENDING',
        invoice_url: invoice.invoice_url ?? null,
      }])
    } catch (dbErr: any) {
      console.error('Failed to insert transaction to DB:', dbErr?.message ?? dbErr)
    }

    return c.json({ invoiceUrl: invoice.invoice_url })
  } catch (error: any) {
    console.error('Invoice creation error:', error)
    return c.json({ error: error?.message || 'Internal server error' }, 500)
  }
})

export default creditsCheckout