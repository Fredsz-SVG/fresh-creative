"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const route = async (server) => {
    // PATCH /api/user/notifications/:id - Mark single notification as read
    server.patch('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id } = request.params;
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id).eq('user_id', user.id)
            .select().single();
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send(data);
    });
};
exports.default = route;
