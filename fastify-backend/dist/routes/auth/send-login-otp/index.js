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
const supabase_1 = require("../../../lib/supabase");
const OTP_EXPIRY_MINUTES = 5;
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
const route = async (server) => {
    // POST /api/auth/send-login-otp
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user?.email) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        if (apiKey) {
            const code = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
            let db;
            try {
                db = (0, supabase_1.getAdminSupabaseClient)();
            }
            catch {
                db = supabase;
            }
            const { error: upsertError } = await db
                .from('login_otps')
                .upsert({ user_id: user.id, code, expires_at: expiresAt }, { onConflict: 'user_id' });
            if (upsertError) {
                return reply.code(500).send({ error: upsertError.message });
            }
            try {
                const { Resend } = await Promise.resolve().then(() => __importStar(require('resend')));
                const resend = new Resend(apiKey);
                const { error: resendError } = await resend.emails.send({
                    from: fromEmail,
                    to: user.email,
                    subject: 'Kode OTP masuk dashboard',
                    html: `<p>Kode OTP Anda: <strong>${code}</strong></p><p>Berlaku ${OTP_EXPIRY_MINUTES} menit.</p>`,
                });
                if (resendError) {
                    console.error('Resend API error:', resendError);
                    return reply.code(500).send({ error: resendError.message || 'Gagal mengirim email OTP' });
                }
            }
            catch (err) {
                console.error('Resend send error:', err);
                return reply.code(500).send({ error: 'Gagal mengirim email OTP' });
            }
            return reply.send({ ok: true });
        }
        // Fallback: Supabase OTP
        const { error } = await supabase.auth.signInWithOtp({
            email: user.email,
            options: { shouldCreateUser: false },
        });
        if (error) {
            return reply.code(400).send({ error: error.message });
        }
        return reply.send({ ok: true });
    });
};
exports.default = route;
