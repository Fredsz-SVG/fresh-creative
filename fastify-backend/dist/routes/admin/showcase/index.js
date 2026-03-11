"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const SHOWCASE_KEY = 'showcase';
const defaultShowcase = {
    albumPreviews: [],
    flipbookPreviewUrl: '',
};
const route = async (server) => {
    const getShowcase = async () => {
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const { data, error } = await admin
            .from('site_settings')
            .select('value')
            .eq('key', SHOWCASE_KEY)
            .maybeSingle();
        if (error || !data?.value)
            return defaultShowcase;
        const raw = data.value;
        return {
            albumPreviews: Array.isArray(raw.albumPreviews) ? raw.albumPreviews : defaultShowcase.albumPreviews,
            flipbookPreviewUrl: typeof raw.flipbookPreviewUrl === 'string' ? raw.flipbookPreviewUrl : defaultShowcase.flipbookPreviewUrl,
        };
    };
    // GET /api/admin/showcase
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin')
            return reply.code(403).send({ error: 'Forbidden' });
        try {
            const payload = await getShowcase();
            return reply.send(payload);
        }
        catch (e) {
            return reply.code(500).send({ error: 'Failed to load showcase' });
        }
    });
    // PUT /api/admin/showcase
    server.put('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin')
            return reply.code(403).send({ error: 'Forbidden' });
        const body = request.body;
        const albumPreviews = Array.isArray(body?.albumPreviews)
            ? body.albumPreviews
                .filter((x) => x && typeof x.title === 'string' && typeof x.link === 'string')
                .map((x) => ({ title: x.title, imageUrl: typeof x.imageUrl === 'string' ? x.imageUrl : '', link: x.link }))
            : [];
        const flipbookPreviewUrl = typeof body?.flipbookPreviewUrl === 'string' ? body.flipbookPreviewUrl : '';
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const { error } = await admin
            .from('site_settings')
            .upsert({ key: SHOWCASE_KEY, value: { albumPreviews, flipbookPreviewUrl } }, { onConflict: 'key' });
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send({ albumPreviews, flipbookPreviewUrl });
    });
};
exports.default = route;
