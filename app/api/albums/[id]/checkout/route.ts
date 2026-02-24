import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Xendit } from 'xendit-node'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: albumId } = await params
        if (!albumId) return NextResponse.json({ error: 'Album ID required' }, { status: 400 })

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                },
            }
        )

        // Verify Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get album info
        // We use admin access to ensure we can read all necessary fields
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: album, error: albumError } = await adminSupabase
            .from('albums')
            .select('*')
            .eq('id', albumId)
            .single()

        if (albumError || !album) {
            return NextResponse.json({ error: 'Album not found' }, { status: 404 })
        }

        if (album.user_id !== user.id) {
            // Check if user is an admin
            const { data: profile } = await adminSupabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        if (album.status !== 'approved') {
            return NextResponse.json({ error: 'Album must be approved before payment' }, { status: 400 })
        }

        if (album.payment_status === 'paid') {
            return NextResponse.json({ error: 'Album already paid' }, { status: 400 })
        }

        const amount = album.total_estimated_price
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid album price' }, { status: 400 })
        }

        // Check if there is an existing PENDING transaction for this album
        const { data: existingTx } = await adminSupabase
            .from('transactions')
            .select('*')
            .eq('album_id', albumId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingTx && existingTx.invoice_url) {
            // Return existing invoice if still valid (Xendit invoices usually valid for 24h)
            // For simplicity, we'll just return it. If it's expired, user will see it on Xendit side.
            return NextResponse.json({ invoiceUrl: existingTx.invoice_url })
        }

        // Create Invoice
        const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY || '' })
        const { Invoice } = xendit

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
        const isAdmin = profile?.role === 'admin'
        const redirectPath = isAdmin ? '/admin/riwayat' : '/user/portal/riwayat'

        const invoiceData: any = {
            externalId: `album_${album.id}_user_${user.id}_ts_${Date.now()}`,
            amount: amount,
            currency: 'IDR',
            description: `Payment for Album: ${album.name}`,
            successRedirectUrl: `${baseUrl}${redirectPath}?status=success&albumId=${album.id}`,
            failureRedirectUrl: `${baseUrl}${redirectPath}?status=failed&albumId=${album.id}`,
            items: [
                {
                    name: `Yearbook Album: ${album.name}`,
                    quantity: 1,
                    price: amount,
                }
            ]
        }

        if (user.email) {
            invoiceData.payerEmail = user.email
            invoiceData.customer = {
                givenNames: user.user_metadata?.full_name || 'Customer',
                email: user.email
            }
        }

        const invoice = await Invoice.createInvoice({ data: invoiceData })

        // Log transaction to database
        const { error: dbErr } = await adminSupabase.from('transactions').insert([{
            user_id: user.id,
            external_id: invoiceData.externalId,
            album_id: albumId,
            amount: amount,
            status: (invoice as any).status || 'PENDING',
            invoice_url: invoice.invoiceUrl ?? null,
        }]);

        if (dbErr) {
            console.error("DB Insert Error (transactions):", dbErr.message);
        }

        // Update album with payment_url
        await adminSupabase
            .from('albums')
            .update({ payment_url: invoice.invoiceUrl })
            .eq('id', albumId)

        return NextResponse.json({ invoiceUrl: invoice.invoiceUrl })
    } catch (error: any) {
        console.error('Album checkout error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
