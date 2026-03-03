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

        // Parse request body for upgrade info
        let body: { upgrade?: boolean; amount?: number; added_students?: number; new_students_count?: number } = {}
        try { body = await req.json() } catch { /* no body = normal checkout */ }

        const isUpgradeRequest = body.upgrade === true

        // Block duplicate payment only for initial payment, not upgrades
        if (album.payment_status === 'paid' && !isUpgradeRequest) {
            return NextResponse.json({ error: 'Album already paid' }, { status: 400 })
        }

        // For upgrades, use the amount from the request body; for initial payment, use album price
        const amount = isUpgradeRequest ? (body.amount || 0) : album.total_estimated_price
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid album price' }, { status: 400 })
        }

        // Check if there is an existing PENDING transaction for this album with same amount
        const { data: existingTx } = await adminSupabase
            .from('transactions')
            .select('*')
            .eq('album_id', albumId)
            .eq('status', 'PENDING')
            .eq('amount', amount)
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
        const redirectPath = isAdmin ? '/admin/riwayat' : '/user/riwayat'

        // Check if this is an upgrade (from request body)
        const isUpgrade = isUpgradeRequest
        const addedStudents = body.added_students || 0
        const invoiceDescription = isUpgrade
            ? `Penambahan ${addedStudents} Anggota Album: ${album.name}`
            : `Pembayaran Album: ${album.name}`
        const itemName = isUpgrade
            ? `Tambah ${addedStudents} Anggota: ${album.name}`
            : `Yearbook Album: ${album.name}`

        const invoiceData: any = {
            externalId: `album_${album.id}_user_${user.id}_ts_${Date.now()}`,
            amount: amount,
            currency: 'IDR',
            description: invoiceDescription,
            successRedirectUrl: `${baseUrl}${redirectPath}?status=success&albumId=${album.id}`,
            failureRedirectUrl: `${baseUrl}${redirectPath}?status=failed&albumId=${album.id}`,
            items: [
                {
                    name: itemName,
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
        const txRecord: Record<string, unknown> = {
            user_id: user.id,
            external_id: invoiceData.externalId,
            album_id: albumId,
            amount: amount,
            status: (invoice as any).status || 'PENDING',
            invoice_url: invoice.invoiceUrl ?? null,
        }

        // Try inserting with new columns first, fallback without them if columns don't exist yet
        let dbErr: { message: string } | null = null
        const { error: insertErr1 } = await adminSupabase.from('transactions').insert([{
            ...txRecord,
            description: invoiceDescription,
            new_students_count: body.new_students_count || null,
        }]);

        if (insertErr1) {
            // Fallback: insert without new columns (migration might not be applied yet)
            console.warn("Insert with new columns failed, retrying without:", insertErr1.message);
            const { error: insertErr2 } = await adminSupabase.from('transactions').insert([txRecord]);
            dbErr = insertErr2
        }

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
