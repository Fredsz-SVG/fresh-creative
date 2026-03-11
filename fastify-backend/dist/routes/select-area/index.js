"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        try {
            const q = request.query;
            const type = (q?.type ?? '').trim().toLowerCase();
            const supabase = (0, supabase_1.getAdminSupabaseClient)();
            if (type === 'provinces') {
                const qRaw = (q?.q ?? '').trim().toLowerCase();
                let query = supabase.from('ref_provinces').select('id,name').order('name', { ascending: true }).limit(100);
                if (qRaw)
                    query = query.ilike('name_lower', `%${qRaw}%`);
                const { data, error } = await query;
                if (error)
                    return reply.code(500).send({ ok: false, error: error.message });
                return reply.send({ ok: true, data: data ?? [] });
            }
            if (type === 'cities') {
                const province_id = (q?.province_id ?? '').trim();
                if (!province_id)
                    return reply.code(400).send({ ok: false, error: 'province_id is required' });
                const qRaw = (q?.q ?? '').trim().toLowerCase();
                const kind = (q?.kind ?? '').trim().toLowerCase();
                const limit = Math.min(Number(q?.limit ?? '100') || 100, 300);
                const cleanQ = qRaw.replace(/^kota\s+/, '').replace(/^kabupaten\s+/, '').replace(/^kab\s+/, '').trim();
                let query = supabase.from('ref_cities').select('id, province_id, name, kind').eq('province_id', province_id);
                if (kind === 'kota' || kind === 'kabupaten')
                    query = query.eq('kind', kind);
                if (cleanQ) {
                    query = query.or(`name_lower.ilike.${cleanQ}%,name_lower.ilike.kota ${cleanQ}%,name_lower.ilike.kabupaten ${cleanQ}%,name_lower.ilike.kab ${cleanQ}%`);
                }
                const { data, error } = await query.order('name').limit(limit);
                if (error)
                    return reply.code(500).send({ ok: false, error: error.message });
                return reply.send({ ok: true, data: data ?? [] });
            }
            return reply.code(400).send({ ok: false, error: 'type parameter required: "provinces" or "cities"' });
        }
        catch (e) {
            return reply.code(500).send({ ok: false, error: e?.message ?? 'unknown error' });
        }
    });
};
exports.default = route;
