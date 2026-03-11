"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data, error } = await supabase
            .from('credit_packages')
            .select('*')
            .order('price', { ascending: true });
        if (error) {
            return reply.code(500).send({ error: error.message });
        }
        return reply.send(data);
    });
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { credits, price, popular } = request.body;
        const { data, error } = await supabase
            .from('credit_packages')
            .insert([{ credits, price, popular }])
            .select();
        if (error) {
            return reply.code(500).send({ error: error.message });
        }
        return reply.send(data);
    });
    server.put('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { id, credits, price, popular } = request.body;
        if (!id) {
            return reply.code(400).send({ error: 'ID is required' });
        }
        const { data, error } = await supabase
            .from('credit_packages')
            .update({ credits, price, popular })
            .eq('id', id)
            .select();
        if (error) {
            return reply.code(500).send({ error: error.message });
        }
        if (!data || data.length === 0) {
            return reply.code(404).send({ error: 'No rows updated. Check RLS or ID.' });
        }
        return reply.send(data);
    });
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { id } = request.body;
        if (!id) {
            return reply.code(400).send({ error: 'ID is required' });
        }
        const { error } = await supabase
            .from('credit_packages')
            .delete()
            .eq('id', id);
        if (error) {
            return reply.code(500).send({ error: error.message });
        }
        return reply.send({ success: true });
    });
};
exports.default = route;
