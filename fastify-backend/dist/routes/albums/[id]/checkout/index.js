"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const { id: albumId } = request.params;
            if (!albumId)
                return reply.code(400).send({ error: 'Album ID required' });
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user)
                return reply.code(401).send({ error: 'Unauthorized' });
            const adminSupabase = (0, supabase_1.getAdminSupabaseClient)();
            const { data: album, error: albumError } = await adminSupabase.from('albums').select('*').eq('id', albumId).single();
            if (albumError || !album)
                return reply.code(404).send({ error: 'Album not found' });
            if (album.user_id !== user.id) {
                const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin')
                    return reply.code(403).send({ error: 'Forbidden' });
            }
            if (album.status !== 'approved')
                return reply.code(400).send({ error: 'Album must be approved before payment' });
            const body = request.body || {};
            const isUpgradeRequest = body.upgrade === true;
            if (album.payment_status === 'paid' && !isUpgradeRequest) {
                return reply.code(400).send({ error: 'Album already paid' });
            }
            const amount = isUpgradeRequest ? (body.amount || 0) : album.total_estimated_price;
            if (!amount || amount <= 0)
                return reply.code(400).send({ error: 'Invalid album price' });
            const { data: existingTx } = await adminSupabase.from('transactions').select('*')
                .eq('album_id', albumId).eq('status', 'PENDING').eq('amount', amount)
                .order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (existingTx?.invoice_url)
                return reply.send({ invoiceUrl: existingTx.invoice_url });
            const { Xendit } = await Promise.resolve().then(() => __importStar(require('xendit-node')));
            const xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY || '' });
            const { Invoice } = xendit;
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
            const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single();
            const isAdmin = profile?.role === 'admin';
            const redirectPath = isAdmin ? '/admin/riwayat' : '/user/riwayat';
            const addedStudents = body.added_students || 0;
            const invoiceDescription = isUpgradeRequest
                ? `Penambahan ${addedStudents} Anggota Album: ${album.name}`
                : `Pembayaran Album: ${album.name}`;
            const itemName = isUpgradeRequest
                ? `Tambah ${addedStudents} Anggota: ${album.name}`
                : `Yearbook Album: ${album.name}`;
            const invoiceData = {
                externalId: `album_${album.id}_user_${user.id}_ts_${Date.now()}`,
                amount, currency: 'IDR', description: invoiceDescription,
                successRedirectUrl: `${baseUrl}${redirectPath}?status=success&albumId=${album.id}`,
                failureRedirectUrl: `${baseUrl}${redirectPath}?status=failed&albumId=${album.id}`,
                items: [{ name: itemName, quantity: 1, price: amount }],
            };
            if (user.email) {
                invoiceData.payerEmail = user.email;
                invoiceData.customer = { givenNames: user.user_metadata?.full_name || 'Customer', email: user.email };
            }
            const invoice = await Invoice.createInvoice({ data: invoiceData });
            const txRecord = {
                user_id: user.id, external_id: invoiceData.externalId, album_id: albumId,
                amount, status: invoice.status || 'PENDING', invoice_url: invoice.invoiceUrl ?? null,
            };
            const { error: insertErr1 } = await adminSupabase.from('transactions').insert([{
                    ...txRecord, description: invoiceDescription, new_students_count: body.new_students_count || null,
                }]);
            if (insertErr1) {
                const { error: insertErr2 } = await adminSupabase.from('transactions').insert([txRecord]);
                if (insertErr2)
                    console.error('DB Insert Error:', insertErr2.message);
            }
            await adminSupabase.from('albums').update({ payment_url: invoice.invoiceUrl }).eq('id', albumId);
            return reply.send({ invoiceUrl: invoice.invoiceUrl });
        }
        catch (error) {
            console.error('Album checkout error:', error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });
};
exports.default = route;
