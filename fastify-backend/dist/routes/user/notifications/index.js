"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    // GET - List all notifications
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { data, error } = await supabase
            .from('notifications').select('*')
            .eq('user_id', user.id).order('created_at', { ascending: false });
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send(data);
    });
    // POST - Create notification
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { title, message, type, action_url, metadata } = request.body || {};
        const { data, error } = await supabase
            .from('notifications')
            .insert({ user_id: user.id, title, message, type: type || 'info', action_url, metadata })
            .select().single();
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send(data);
    });
    // PATCH - Mark all as read
    server.patch('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send({ success: true });
    });
    // DELETE - Clear all
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send({ success: true });
    });
};
exports.default = route;
