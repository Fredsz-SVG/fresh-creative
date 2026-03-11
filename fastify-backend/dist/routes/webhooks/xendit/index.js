"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const xenditWebhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
            const callbackToken = request.headers['x-callback-token'];
            if (xenditWebhookToken && callbackToken !== xenditWebhookToken) {
                console.warn('Invalid Xendit Webhook Token');
                return reply.code(401).send({ error: 'Unauthorized webhook' });
            }
            const payload = request.body;
            console.log('Received Xendit Webhook:', JSON.stringify(payload).slice(0, 500));
            // Dukung payload flat (status, external_id) atau nested (data.status, data.external_id)
            const raw = payload?.data ?? payload;
            const status = (raw?.status ?? payload?.status ?? '').toUpperCase();
            const externalId = raw?.external_id ?? payload?.external_id;
            // Prioritaskan spesifik channel (BCA, ALFAMART, OVO) daripada kategori umum (BANK_TRANSFER)
            const specificChannel = raw?.payment_channel || raw?.bank_code || raw?.retail_outlet_name || raw?.ewallet_type;
            const paymentMethod = specificChannel || raw?.payment_method || null;
            if (!externalId) {
                console.warn('Xendit webhook: no external_id in payload', payload);
                return reply.code(400).send({ error: 'No external_id provided' });
            }
            const supabase = (0, supabase_1.getAdminSupabaseClient)();
            // Jika status EXPIRED, update DB transaksi jadi EXPIRED tapi BUKAN nge-topup
            if (status === 'EXPIRED') {
                const { error: txError } = await supabase
                    .from('transactions')
                    .update({ status })
                    .eq('external_id', externalId);
                if (txError)
                    console.warn('Coult not update expired status:', txError);
                return reply.code(400).send({ message: 'Transaction expired handled successfully' });
            }
            // Kalau bukan PAID atau SETTLED (dan bukan EXPIRED), abaikan dengan aman
            if (status !== 'PAID' && status !== 'SETTLED') {
                return reply.send({ message: 'Ignored, unhandled status', received: status });
            }
            // Parse externalId: 
            // 1. pkg_<pkgId>_user_<userId>_ts_<timestamp>
            // 2. album_<albumId>_user_<userId>_ts_<timestamp>
            const isPackage = externalId.startsWith('pkg_');
            const isAlbum = externalId.startsWith('album_');
            if (isPackage) {
                const match = externalId.match(/^pkg_(.+?)_user_(.+?)_ts_/);
                if (!match) {
                    console.warn('Invalid externalId format for package:', externalId);
                    return reply.send({ error: 'Invalid externalId format' });
                }
                const packageId = match[1];
                const userId = match[2];
                console.log(`Processing Package Payment: pkg=${packageId}, user=${userId}, status=${status}`);
                // 1. Get Package details
                const { data: pkg, error: pkgError } = await supabase
                    .from('credit_packages')
                    .select('credits')
                    .eq('id', packageId)
                    .single();
                if (pkgError || !pkg) {
                    console.error('Package not found for webhook:', packageId, pkgError);
                    return reply.code(500).send({ error: 'Package not found' });
                }
                // 2. Fetch User
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single();
                if (userError || !user) {
                    console.error('User not found for webhook:', userId, userError);
                    return reply.code(500).send({ error: 'User not found' });
                }
                // 3. Update Transaction
                const { error: txError } = await supabase
                    .from('transactions')
                    .update({
                    status,
                    payment_method: paymentMethod,
                    paid_at: new Date().toISOString()
                })
                    .eq('external_id', externalId);
                if (txError) {
                    console.error('Failed to update transaction status:', txError);
                }
                // 4. Increment Credits
                const newCreditBalance = (user.credits || 0) + pkg.credits;
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ credits: newCreditBalance })
                    .eq('id', userId);
                if (updateError) {
                    console.error('Failed to update user credits:', updateError);
                }
                // 5. Clear Cache
            }
            else if (isAlbum) {
                const match = externalId.match(/^album_(.+?)_user_(.+?)_ts_/);
                if (!match) {
                    console.warn('Invalid externalId format for album:', externalId);
                    return reply.code(400).send({ error: 'Invalid externalId format' });
                }
                const albumId = match[1];
                const userId = match[2];
                console.log(`Processing Album Payment: album=${albumId}, user=${userId}, status=${status}`);
                // 1. Update Transaction
                const { data: txData, error: txError } = await supabase
                    .from('transactions')
                    .update({
                    status,
                    payment_method: paymentMethod,
                    paid_at: new Date().toISOString()
                })
                    .eq('external_id', externalId)
                    .select('new_students_count, amount')
                    .single();
                if (txError) {
                    console.error('Failed to update transaction status (album):', txError);
                }
                // 2. Update Album Status + students_count if specified in transaction
                const albumUpdates = {
                    payment_status: 'paid',
                };
                if (txData?.new_students_count) {
                    albumUpdates.students_count = txData.new_students_count;
                    albumUpdates.total_estimated_price = txData.amount;
                }
                const { error: albumUpdateErr } = await supabase
                    .from('albums')
                    .update(albumUpdates)
                    .eq('id', albumId);
                if (albumUpdateErr) {
                    console.error('Failed to update album payment status:', albumUpdateErr);
                }
                // 3. Clear Cache
                // Cache removed - no-op
            }
            else {
                console.warn('Unknown externalId prefix:', externalId);
                return reply.code(400).send({ error: 'Unknown externalId prefix' });
            }
            return reply.code(500).send({ message: 'Success' });
        }
        catch (error) {
            console.error('Xendit Webhook Error:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
};
exports.default = route;
