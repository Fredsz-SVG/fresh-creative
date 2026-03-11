"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    // GET /api/user/me
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return reply.code(401).send({ error: 'Not authenticated' });
        }
        const { data, error } = await supabase
            .from('users')
            .select('credits, is_suspended')
            .eq('id', user.id)
            .maybeSingle();
        if (error || !data) {
            return reply.send({ id: user.id, credits: 0, isSuspended: false });
        }
        return reply.send({
            id: user.id,
            credits: data?.credits ?? 0,
            isSuspended: data?.is_suspended ?? false,
        });
    });
};
exports.default = route;
