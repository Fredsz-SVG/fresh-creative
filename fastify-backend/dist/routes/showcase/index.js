"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../lib/supabase");
const SHOWCASE_KEY = 'showcase';
const defaultShowcase = {
    albumPreviews: [],
    flipbookPreviewUrl: '',
};
const route = async (server) => {
    // GET /api/showcase — public, no auth
    server.get('/', async (_request, reply) => {
        try {
            const admin = (0, supabase_1.getAdminSupabaseClient)();
            const { data, error } = await admin
                .from('site_settings')
                .select('value')
                .eq('key', SHOWCASE_KEY)
                .maybeSingle();
            if (error) {
                server.log.warn(error, 'showcase get');
                return reply.send(defaultShowcase);
            }
            const raw = data?.value;
            if (!raw || typeof raw !== 'object')
                return reply.send(defaultShowcase);
            const albumPreviews = Array.isArray(raw.albumPreviews) ? raw.albumPreviews : defaultShowcase.albumPreviews;
            const flipbookPreviewUrl = typeof raw.flipbookPreviewUrl === 'string' ? raw.flipbookPreviewUrl : defaultShowcase.flipbookPreviewUrl;
            // Automatically inject the actual album cover image if imageUrl is missing or for all of them
            const enrichedPreviews = await Promise.all(albumPreviews.map(async (preview) => {
                if (!preview.link)
                    return preview;
                const match = preview.link.match(/(?:album|yearbook)\/([^/?]+)/);
                if (match && match[1]) {
                    const { data: albumData } = await admin
                        .from('albums')
                        .select('cover_image_url')
                        .eq('id', match[1])
                        .maybeSingle();
                    if (albumData?.cover_image_url) {
                        return { ...preview, imageUrl: albumData.cover_image_url };
                    }
                }
                return preview;
            }));
            return reply.send({ albumPreviews: enrichedPreviews, flipbookPreviewUrl });
        }
        catch {
            return reply.send(defaultShowcase);
        }
    });
};
exports.default = route;
