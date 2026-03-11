"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    // GET - list ai_feature_pricing
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data, error } = await supabase
            .from('ai_feature_pricing')
            .select('id, feature_slug, credits_per_use, credits_per_unlock')
            .order('feature_slug', { ascending: true });
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send(data ?? []);
    });
    // PUT - update pricing (admin only)
    server.put('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const adminClient = (0, supabase_1.getAdminSupabaseClient)();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin')
            return reply.code(403).send({ error: 'Forbidden' });
        const body = request.body || {};
        const { id, feature_slug, credits_per_use, credits_per_unlock } = body;
        const hasUse = typeof credits_per_use === 'number' && credits_per_use >= 0;
        const hasUnlock = typeof credits_per_unlock === 'number' && credits_per_unlock >= 0;
        if ((!id && !feature_slug) || (!hasUse && !hasUnlock)) {
            return reply.code(400).send({ error: 'Invalid payload' });
        }
        const updateObj = {};
        if (hasUse)
            updateObj.credits_per_use = credits_per_use;
        if (hasUnlock)
            updateObj.credits_per_unlock = credits_per_unlock;
        let query = adminClient.from('ai_feature_pricing').update(updateObj).select('id, feature_slug, credits_per_use, credits_per_unlock');
        if (id)
            query = query.eq('id', id);
        else if (feature_slug)
            query = query.eq('feature_slug', feature_slug);
        const { data, error } = await query;
        if (error)
            return reply.code(500).send({ error: error.message });
        if (!data || data.length === 0)
            return reply.code(404).send({ error: 'Pricing not found' });
        return reply.send(data[0]);
    });
    // POST - consume credits
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user)
            return reply.code(401).send({ ok: false, error: 'Unauthorized' });
        const body = request.body || {};
        const featureSlug = body.feature_slug?.trim();
        const units = typeof body.units === 'number' && body.units > 0 ? Math.floor(body.units) : 1;
        if (!featureSlug)
            return reply.code(400).send({ ok: false, error: 'feature_slug is required' });
        const { data: pricing, error: pe } = await supabase
            .from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', featureSlug).maybeSingle();
        if (pe)
            return reply.code(500).send({ ok: false, error: pe.message });
        const cost = (pricing?.credits_per_use ?? 0) * units;
        const { data: userRow, error: ue } = await supabase.from('users').select('credits').eq('id', user.id).single();
        if (ue)
            return reply.code(500).send({ ok: false, error: ue.message });
        const current = userRow?.credits ?? 0;
        if (cost > 0 && current < cost) {
            return reply.code(402).send({ ok: false, error: 'Credit kamu tidak cukup untuk generate fitur ini.', cost });
        }
        const newCredits = cost > 0 ? current - cost : current;
        if (cost > 0) {
            const { error: upErr } = await supabase.from('users').update({ credits: newCredits }).eq('id', user.id);
            if (upErr)
                return reply.code(500).send({ ok: false, error: upErr.message });
        }
        return reply.send({ ok: true, creditsLeft: newCredits, cost });
    });
};
exports.default = route;
