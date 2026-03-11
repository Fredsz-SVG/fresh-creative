"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: access, error } = await client
            .from('album_class_access')
            .select('id, student_name, email, status, created_at, date_of_birth, instagram, message, video_url')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (error)
            return reply.code(500).send({ error: error.message });
        if (!access)
            return reply.send({ access: null });
        return reply.send(access);
    });
    server.patch('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: access, error: fetchErr } = await client
            .from('album_class_access')
            .select('id, user_id, status')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (fetchErr)
            return reply.code(500).send({ error: fetchErr.message });
        if (!access)
            return reply.code(404).send({ error: 'Akses tidak ditemukan' });
        if (access.status !== 'approved')
            return reply.code(403).send({ error: 'Hanya bisa menyunting setelah akses disetujui' });
        const body = (request.body || {});
        const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined;
        const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined;
        const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined;
        const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined;
        const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined;
        const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined;
        if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
            return reply.code(400).send({ error: 'Minimal satu field required (student_name, email, date_of_birth, instagram, message, video_url)' });
        }
        const updates = { updated_at: new Date().toISOString() };
        if (student_name !== undefined)
            updates.student_name = student_name;
        if (email !== undefined)
            updates.email = email;
        if (date_of_birth !== undefined)
            updates.date_of_birth = date_of_birth;
        if (instagram !== undefined)
            updates.instagram = instagram;
        if (message !== undefined)
            updates.message = message;
        if (video_url !== undefined)
            updates.video_url = video_url;
        const { data: updated, error } = await client
            .from('album_class_access')
            .update(updates)
            .eq('id', access.id)
            .select()
            .single();
        if (error)
            return reply.code(500).send({ error: error.message });
        // Invalidate cache
        return reply.send(updated);
    });
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: access, error: fetchErr } = await client
            .from('album_class_access')
            .select('id, status')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (fetchErr)
            return reply.code(500).send({ error: fetchErr.message });
        if (!access)
            return reply.code(404).send({ error: 'Akses tidak ditemukan' });
        const { error: deleteErr } = await client
            .from('album_class_access')
            .delete()
            .eq('id', access.id);
        if (deleteErr)
            return reply.code(500).send({ error: deleteErr.message });
        // Also delete from album_join_requests so user can re-register
        await client
            .from('album_join_requests')
            .delete()
            .eq('album_id', albumId)
            .eq('user_id', user.id);
        // Invalidate cache
        return reply.send({ success: true });
    });
};
exports.default = route;
