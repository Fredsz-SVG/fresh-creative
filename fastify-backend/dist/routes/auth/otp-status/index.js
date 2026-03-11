"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const OTP_COOKIE_NAME = 'otp_verified';
function getSkipOtp() {
    const v = (process.env.SKIP_OTP || process.env.SKIP_LOGIN_OTP || '').trim().toLowerCase().replace(/^"|"$/g, '');
    return v === 'true' || v === '1' || v === 'yes';
}
const route = async (server) => {
    // GET /api/auth/otp-status
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        let suspended = false;
        if (user) {
            const { data } = await supabase
                .from('users')
                .select('is_suspended')
                .eq('id', user.id)
                .maybeSingle();
            suspended = !!data?.is_suspended;
        }
        const skipOtp = getSkipOtp();
        const cookieVerified = request.cookies?.[OTP_COOKIE_NAME] === '1';
        const verified = !suspended && (skipOtp ? !!user : !!(user && cookieVerified));
        return reply.send({ verified: !!verified, suspended });
    });
};
exports.default = route;
