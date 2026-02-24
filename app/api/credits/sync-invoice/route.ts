import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { delCache, key } from '@/lib/redis'

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

    let synced = 0

    for (const row of pendingRows) {
      const externalId = row.external_id
      if (!externalId) continue

      try {
        const auth = Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64');
        const res = await fetch(`https://api.xendit.co/v2/invoices?external_id=${externalId}`, {
          headers: { 'Authorization': 'Basic ' + auth }
        });
        const invoicesRaw = await res.json();
        const invoice = Array.isArray(invoicesRaw) ? invoicesRaw[0] : invoicesRaw;

        const invStatus = (invoice?.status ?? '').toUpperCase()

        // Prioritaskan spesifik channel (BCA, ALFAMART, OVO) daripada kategori umum (BANK_TRANSFER)
        const specificChannel = invoice?.payment_channel || invoice?.bank_code || invoice?.retail_outlet_name || invoice?.ewallet_type
        const paymentMethod = specificChannel || invoice?.payment_method || null

        if (invStatus !== 'PAID' && invStatus !== 'SETTLED') continue

        const isPackage = externalId.startsWith('pkg_')
        const isAlbum = externalId.startsWith('album_')

        if (isPackage) {
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
              payment_method: paymentMethod,
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

          await delCache(key.userAlbums(userId))
          synced++
        } else if (isAlbum) {
          const match = externalId.match(/^album_(.+?)_user_(.+?)_ts_/)
          if (!match) continue
          const albumId = match[1]
          const userId = match[2]

          await adminClient
            .from('transactions')
            .update({
              status: invStatus,
              payment_method: paymentMethod,
              paid_at: new Date().toISOString(),
            })
            .eq('external_id', externalId)

          await adminClient
            .from('albums')
            .update({ payment_status: 'paid' })
            .eq('id', albumId)

          await Promise.all([
            delCache(key.userAlbums(userId)),
            delCache(key.albumOverview(albumId))
          ])
          synced++
        }
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
