"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const isOwner = album.user_id === user.id;
        if (!isOwner) {
            const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle();
            if (!member)
                return reply.code(403).send({ error: 'Anda harus bergabung ke album dulu via link undangan' });
        }
        const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single();
        if (!cls)
            return reply.code(404).send({ error: 'Kelas tidak ditemukan' });
        const body = (request.body || {});
        const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim() : (user.email ?? '');
        if (!student_name)
            return reply.code(400).send({ error: 'Nama siswa wajib' });
        // Check album_class_access untuk approved access
        const { data: existingAccess } = await client
            .from('album_class_access')
            .select('id, status')
            .eq('class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        // Check album_join_requests untuk pending request
        const { data: existingRequest } = await client
            .from('album_join_requests')
            .select('id, status')
            .eq('assigned_class_id', classId)
            .eq('user_id', user.id)
            .maybeSingle();
        // Jika sudah approved di album_class_access, return approved data
        if (existingAccess) {
            const row = existingAccess;
            if (row.status === 'approved') {
                const { data: fullAccess } = await client.from('album_class_access').select().eq('id', existingAccess.id).single();
                return reply.code(500).send(fullAccess ?? existingAccess);
            }
            // Jika rejected, update ke request baru
            if (row.status === 'rejected') {
                // Delete dari access dan create request baru
                await client.from('album_class_access').delete().eq('id', existingAccess.id);
            }
        }
        // Jika sudah pending di album_join_requests, return pending data
        const existingReq = existingRequest;
        if (existingReq?.status === 'pending') {
            const { data: fullRequest } = await client.from('album_join_requests').select().eq('id', existingReq.id).single();
            return reply.send(fullRequest ?? existingRequest);
        }
        // Jika rejected, update jadi pending dengan nama/email baru (ajukan ulang)
        if (existingReq?.status === 'rejected') {
            const { data: updated, error: updateErr } = await client
                .from('album_join_requests')
                .update({ student_name, email: email || null, status: 'pending' })
                .eq('id', existingReq.id)
                .select()
                .single();
            if (updateErr)
                return reply.send({ error: updateErr.message });
            return reply.code(500).send(updated);
        }
        // Create new pending request di album_join_requests
        const { data: created, error } = await client
            .from('album_join_requests')
            .insert({
            album_id: albumId,
            assigned_class_id: classId,
            user_id: user.id,
            student_name,
            email: email || null,
            status: 'pending',
        })
            .select()
            .single();
        if (error)
            return reply.send({ error: error.message });
        return reply.send(created);
    });
};
exports.default = route;
