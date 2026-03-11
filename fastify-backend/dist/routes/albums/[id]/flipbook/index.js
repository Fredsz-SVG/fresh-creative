"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const auth_1 = require("../../../../lib/auth");
const route = async (server) => {
    // GET /api/albums/:id/flipbook/public — no auth, for public showcase
    server.get('/public', async (request, reply) => {
        const { id: albumId } = request.params;
        if (!albumId)
            return reply.code(400).send({ error: 'Album ID required' });
        try {
            const admin = (0, supabase_1.getAdminSupabaseClient)();
            const { data: album } = await admin.from('albums').select('id').eq('id', albumId).maybeSingle();
            if (!album)
                return reply.code(404).send({ error: 'Album not found' });
            const { data: pages, error } = await admin
                .from('manual_flipbook_pages')
                .select('*, flipbook_video_hotspots(*)')
                .eq('album_id', albumId)
                .order('page_number', { ascending: true });
            if (error)
                return reply.code(500).send({ error: error.message });
            return reply.send(pages || []);
        }
        catch (e) {
            return reply.code(500).send({ error: 'Failed to load flipbook' });
        }
    });
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId } = request.params;
        if (!albumId)
            return reply.code(400).send({ error: 'Album ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        // 1. Permission Check
        const { data: album, error: albumErr } = await client
            .from('albums')
            .select('id, user_id')
            .eq('id', albumId)
            .single();
        if (albumErr || !album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        const isOwner = album.user_id === user.id || role === 'admin';
        if (!isOwner) {
            // Check album_members for album admin
            const { data: member } = await client
                .from('album_members')
                .select('role')
                .eq('album_id', albumId)
                .eq('user_id', user.id)
                .maybeSingle();
            if (!member || member.role !== 'admin') {
                return reply.code(403).send({ error: 'Only administrators can clean flipbook' });
            }
        }
        try {
            // 2. Clear Database (using RPC)
            const { error: dbError } = await client.rpc('cleanup_manual_flipbook', { target_album_id: albumId });
            if (dbError)
                throw dbError;
            // 3. Clear Storage
            const flipbookPath = `albums/${albumId}/flipbook`;
            const subfolders = ['pages', 'hotspots', 'backgrounds'];
            for (const sub of subfolders) {
                const subPath = `${flipbookPath}/${sub}`;
                const { data: files } = await client.storage.from('album-photos').list(subPath);
                if (files && files.length > 0) {
                    const paths = files.map(f => `${subPath}/${f.name}`);
                    await client.storage.from('album-photos').remove(paths);
                }
            }
            // Cleanup legacy hotspots
            const legacyPath = `albums/${albumId}/hotspots`;
            const { data: legacyFiles } = await client.storage.from('album-photos').list(legacyPath);
            if (legacyFiles && legacyFiles.length > 0) {
                const paths = legacyFiles.map(f => `${legacyPath}/${f.name}`);
                await client.storage.from('album-photos').remove(paths);
            }
            return reply.code(500).send({ message: 'Flipbook assets cleaned successfully' });
        }
        catch (error) {
            console.error('Flipbook cleanup error:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { id: albumId } = request.params;
        const { data: pages, error } = await supabase
            .from('manual_flipbook_pages')
            .select('*, flipbook_video_hotspots(*)')
            .eq('album_id', albumId)
            .order('page_number', { ascending: true });
        if (error)
            return reply.code(500).send({ error: error.message });
        return reply.send(pages);
    });
};
exports.default = route;
