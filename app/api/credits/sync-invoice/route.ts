import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Xendit } from 'xendit-node'

export const dynamic = 'force-dynamic'

/**
 * Sync status invoice dari Xendit ke DB.
 * Dipanggil saat user kembali ke riwayat dengan ?status=success agar tampilan ikut PAID/SETTLED
 * kalau webhook belum sempat diproses atau tidak terpanggil.
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pendingRows } = await adminClient
      .from('transactions')
      .select('id, external_id, package_id, amount')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')

    if (!pendingRows?.length) {
      return NextResponse.json({ synced: 0 })
    }

    const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY || '' })
    const { Invoice } = xendit
    let synced = 0

    for (const row of pendingRows) {
      const externalId = row.external_id
      if (!externalId) continue

      try {
        const invoices = await Invoice.getInvoices({ externalId })
        const invoice = Array.isArray(invoices) ? invoices[0] : invoices
        const invStatus = (invoice?.status ?? '').toUpperCase()

        if (invStatus !== 'PAID' && invStatus !== 'SETTLED') continue

        const match = externalId.match(/^pkg_(.+?)_user_(.+?)_ts_/)
        if (!match) continue
        const packageId = match[1]
        const userId = match[2]

        const { data: pkg } = await adminClient
          .from('credit_packages')
          .select('credits')
          .eq('id', packageId)
          .single()

        if (!pkg) continue

        await adminClient
          .from('transactions')
          .update({
            status: invStatus,
            paid_at: new Date().toISOString(),
          })
          .eq('external_id', externalId)

        const { data: userRow } = await adminClient
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single()

        const newCredits = (userRow?.credits ?? 0) + (pkg.credits ?? 0)
        await adminClient.from('users').update({ credits: newCredits }).eq('id', userId)

        synced++
      } catch (e) {
        console.warn('Sync invoice failed for', externalId, e)
      }
    }

    return NextResponse.json({ synced })
  } catch (error: unknown) {
    console.error('Sync invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
