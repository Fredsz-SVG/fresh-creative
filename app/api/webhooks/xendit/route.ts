import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const xenditWebhookToken = process.env.XENDIT_WEBHOOK_TOKEN
        const callbackToken = req.headers.get('x-callback-token')

        if (xenditWebhookToken && callbackToken !== xenditWebhookToken) {
            console.warn('Invalid Xendit Webhook Token')
            return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 })
        }

        const payload = await req.json()
        console.log('Received Xendit Webhook:', JSON.stringify(payload).slice(0, 500))

        // Dukung payload flat (status, external_id) atau nested (data.status, data.external_id)
        const raw = payload?.data ?? payload
        const status = (raw?.status ?? payload?.status ?? '').toUpperCase()
        const externalId = raw?.external_id ?? payload?.external_id

        if (!externalId) {
            console.warn('Xendit webhook: no external_id in payload', payload)
            return NextResponse.json({ error: 'No external_id provided' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Jika status EXPIRED, update DB transaksi jadi EXPIRED tapi BUKAN nge-topup
        if (status === 'EXPIRED') {
            const { error: txError } = await supabase
                .from('transactions')
                .update({ status })
                .eq('external_id', externalId)

            if (txError) console.warn('Coult not update expired status:', txError)
            return NextResponse.json({ message: 'Transaction expired handled successfully' })
        }

        // Kalau bukan PAID atau SETTLED (dan bukan EXPIRED), abaikan dengan aman
        if (status !== 'PAID' && status !== 'SETTLED') {
            return NextResponse.json({ message: 'Ignored, unhandled status', received: status })
        }

        // Parse externalId: pkg_<pkgId>_user_<userId>_ts_<timestamp>
        const match = externalId.match(/^pkg_(.+?)_user_(.+?)_ts_/)
        if (!match) {
            console.warn('Invalid externalId format:', externalId)
            return NextResponse.json({ error: 'Invalid externalId format' }, { status: 400 })
        }

        const packageId = match[1]
        const userId = match[2]

        // 1. Get Package details to know how many credits to give
        const { data: pkg, error: pkgError } = await supabase
            .from('credit_packages')
            .select('credits')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) {
            console.error('Package not found for webhook:', packageId, pkgError)
            return NextResponse.json({ error: 'Package not found' }, { status: 500 })
        }

        // 2. Fetch User's current credits
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            console.error('User not found for webhook:', userId, userError)
            return NextResponse.json({ error: 'User not found' }, { status: 500 })
        }

        // 3. Update Transaction Table First
        const { error: txError } = await supabase
            .from('transactions')
            .update({
                status,
                paid_at: new Date().toISOString()
            })
            .eq('external_id', externalId)

        if (txError) {
            console.warn('Could not update transaction status mapping:', txError)
        }

        // 4. Increment Credits
        const newCreditBalance = (user.credits || 0) + pkg.credits
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: newCreditBalance })
            .eq('id', userId)

        if (updateError) {
            console.error('Failed to update user credits:', updateError)
            return NextResponse.json({ error: 'Update Failed' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Success' })
    } catch (error: any) {
        console.error('Xendit Webhook Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
