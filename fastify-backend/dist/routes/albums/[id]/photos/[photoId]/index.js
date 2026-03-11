"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../lib/supabase");
const auth_1 = require("../../../../../lib/auth");
const route = async (server) => {
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, photoId } = request.params;
        if (!albumId || !photoId)
            return reply.code(400).send({ error: 'Album ID and photo ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin)
            return reply.code(500).send({ error: 'Server configuration error' });
        const { data: photo, error: photoErr } = await admin
            .from('album_photos')
            .select('id, album_id, class_id, student_name')
            .eq('id', photoId)
            .eq('album_id', albumId)
            .single();
        if (photoErr || !photo)
            return reply.code(404).send({ error: 'Foto tidak ditemukan' });
        const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        const isOwner = album.user_id === user.id || role === 'admin';
        if (!isOwner) {
            const { data: access } = await admin
                .from('album_class_access')
                .select('id')
                .eq('class_id', photo.class_id)
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .eq('student_name', photo.student_name)
                .maybeSingle();
            if (!access) {
                return reply.code(403).send({ error: 'Anda hanya dapat menghapus foto profil Anda sendiri' });
            }
        }
        const { error: delErr } = await admin
            .from('album_photos')
            .delete()
            .eq('id', photoId);
        if (delErr)
            return reply.code(500).send({ error: delErr.message });
        return reply.send({ message: 'Foto dihapus' });
    });
};
exports.default = route;
