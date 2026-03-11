"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: request_data, error } = await client
            .from('album_join_requests')
            .select('id, student_name, email, status, requested_at')
            .eq('assigned_class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send({ request: request_data ?? null });
    });
};
exports.default = route;
