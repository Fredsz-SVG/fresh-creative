import { FastifyPluginAsync } from 'fastify'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase'
import Xendit from 'xendit-node'

const route: FastifyPluginAsync = async (server) => {
    server.post('/', async (request: any, reply: any) => {
        const supabase = getSupabaseClient(request)
        try {
            const { packageId } = request.body
            if (!packageId) return reply.code(400).send({ error: 'Package ID required' })


            // Verify Auth
            const authHeader = request.headers['authorization']
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
                return reply.code(401).send({ error: 'Unauthorized' })
            }

            // Get package info
            const { data: pkg, error: pkgError } = await supabase
                .from('credit_packages')
                .select('*')
                .eq('id', packageId)
                .single()

            if (pkgError || !pkg) {
                return reply.code(404).send({ error: 'Package not found' })
            }

            // Cek role: admin redirect ke /admin/riwayat, user ke /user/riwayat
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .maybeSingle()
            const isAdmin = profile?.role === 'admin'
            const redirectPath = isAdmin ? '/admin/riwayat' : '/user/riwayat'

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
                const adminSupabase = getAdminSupabaseClient()
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

            return reply.send({ invoiceUrl: invoice.invoiceUrl })
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
            return reply.code(500).send({ error: errMsg })
        }
    })

}

export default route
