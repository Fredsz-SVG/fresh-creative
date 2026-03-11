"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const auth_1 = require("../../../../lib/auth");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId } = request.params;
        if (!albumId)
            return reply.code(400).send({ error: 'Album ID required' });
        let fileBuffer = null;
        let filename = '';
        let mimetype = 'image/jpeg';
        let positionX = null;
        let positionY = null;
        try {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'file') {
                    fileBuffer = await part.toBuffer();
                    filename = part.filename || 'cover.jpg';
                    mimetype = part.mimetype || 'image/jpeg';
                }
                else if (part.type === 'field') {
                    if (part.fieldname === 'position_x')
                        positionX = part.value;
                    if (part.fieldname === 'position_y')
                        positionY = part.value;
                }
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return reply.code(400).send({ error: msg || 'Invalid multipart body' });
        }
        if (!fileBuffer || fileBuffer.length === 0)
            return reply.code(400).send({ error: 'file required' });
        const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB
        if (fileBuffer.length > MAX_PHOTO_BYTES)
            return reply.code(413).send({ error: 'Foto maksimal 10MB' });
        const coverPosition = positionX != null && positionY != null && positionX !== '' && positionY !== ''
            ? `${positionX}% ${positionY}%`
            : null;
        const { data: album, error: albumErr } = await supabase
            .from('albums')
            .select('id, user_id')
            .eq('id', albumId)
            .single();
        if (albumErr || !album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        if (album.user_id !== user.id && role !== 'admin') {
            return reply.code(403).send({ error: 'Hanya pemilik album yang dapat mengubah sampul' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin)
            return reply.code(500).send({ error: 'Server configuration error' });
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const path = `${albumId}/cover.${safeExt}`;
        const { data: uploadData, error: uploadErr } = await admin.storage
            .from('album-photos')
            .upload(path, fileBuffer, { contentType: mimetype, upsert: true });
        if (uploadErr) {
            return reply.code(500).send({ error: uploadErr.message || 'Upload gagal' });
        }
        const { data: urlData } = admin.storage.from('album-photos').getPublicUrl(uploadData.path);
        const coverUrl = urlData.publicUrl;
        const updatePayload = { cover_image_url: coverUrl };
        if (coverPosition != null)
            updatePayload.cover_image_position = coverPosition;
        const { error: updateErr } = await admin
            .from('albums')
            .update(updatePayload)
            .eq('id', albumId);
        if (updateErr)
            return reply.code(500).send({ error: updateErr.message });
        return reply.send({ cover_image_url: coverUrl, cover_image_position: coverPosition ?? undefined });
    });
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId } = request.params;
        if (!albumId)
            return reply.code(400).send({ error: 'Album ID required' });
        const { data: album, error: albumErr } = await supabase
            .from('albums')
            .select('id, user_id')
            .eq('id', albumId)
            .single();
        if (albumErr || !album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        if (album.user_id !== user.id && role !== 'admin') {
            return reply.code(403).send({ error: 'Hanya pemilik album yang dapat menghapus sampul' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin)
            return reply.code(500).send({ error: 'Server configuration error' });
        const { error: updateErr } = await admin
            .from('albums')
            .update({ cover_image_url: null, cover_image_position: null, updated_at: new Date().toISOString() })
            .eq('id', albumId);
        if (updateErr)
            return reply.code(500).send({ error: updateErr.message });
        return reply.send({ message: 'Sampul dihapus' });
    });
};
exports.default = route;
