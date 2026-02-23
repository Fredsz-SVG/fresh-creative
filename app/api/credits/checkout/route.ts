import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Xendit } from 'xendit-node'

export async function POST(req: Request) {
    try {
        const { packageId } = await req.json()
        if (!packageId) return NextResponse.json({ error: 'Package ID required' }, { status: 400 })

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for package lookup
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                },
            }
        )

        // Verify Auth
        const authHeader = req.headers.get('authorization')
        let userId: string | undefined
        let userObj: any = null
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const { data: { user }, error } = await supabase.auth.getUser(token)
            if (user) {
                userId = user.id
                userObj = user
            }
        }

        if (!userId) {
            const sessionUser = await supabase.auth.getUser()
            if (sessionUser.data.user) {
                userId = sessionUser.data.user.id
                userObj = sessionUser.data.user
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get package info
        const { data: pkg, error: pkgError } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        // Cek role: admin redirect ke /admin/riwayat, user ke /user/portal/riwayat
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .maybeSingle()
        const isAdmin = profile?.role === 'admin'
        const redirectPath = isAdmin ? '/admin/riwayat' : '/user/portal/riwayat'

        // Create Invoice
        const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY || 'xnd_development_...' })
        const { Invoice } = xendit

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

        const invoiceData: any = {
            externalId: `pkg_${pkg.id}_user_${userId}_ts_${Date.now()}`,
            amount: pkg.price,
            currency: 'IDR',
            description: `Top up ${pkg.credits} credits`,
            successRedirectUrl: `${baseUrl}${redirectPath}?status=success`,
            failureRedirectUrl: `${baseUrl}${redirectPath}?status=failed`,
            items: [
                {
                    name: `${pkg.credits} Credits Package`,
                    quantity: 1,
                    price: pkg.price,
                }
            ]
        }

        // Use user email if available as payerEmail to help autofill
        if (userObj && userObj.email) {
            invoiceData.payerEmail = userObj.email
            invoiceData.customer = {
                givenNames: userObj.user_metadata?.full_name || 'Customer',
                email: userObj.email
            }
        }

        const invoice = await Invoice.createInvoice({ data: invoiceData })

        // Log transaction to database
        try {
            const adminSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            const { error: dbErr } = await adminSupabase.from('transactions').insert([{
                user_id: userId,
                external_id: invoiceData.externalId,
                package_id: packageId,
                amount: pkg.price,
                status: (invoice as any).status || 'PENDING',
                invoice_url: invoice.invoiceUrl ?? null,
            }]);
            if (dbErr) {
                console.error("DB Insert Error (transactions):", dbErr.message, dbErr.details, dbErr.hint);
            }
        } catch (dbErr: any) {
            console.error("Failed to insert transaction to DB:", dbErr?.message ?? dbErr);
        }

        return NextResponse.json({ invoiceUrl: invoice.invoiceUrl })
    } catch (error: any) {
        console.error('Invoice creation error:', error)
        try {
            const fs = require('fs')
            fs.writeFileSync('xendit-debug-error.log', JSON.stringify({
                message: error.message,
                response: error.response?.data || error.response,
                status: error.status,
                stack: error.stack
            }, null, 2))
        } catch (e) { }
        const errMsg = error.response?.message || error.message || 'Internal server error';
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}
