"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../../lib/supabase");
const auth_1 = require("../../../../../../../lib/auth");
const route = async (server) => {
    server.delete('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return reply.code(401).send({ error: 'Unauthorized' });
            const { id: albumId, classId, userId } = request.params;
            if (!albumId || !classId || !userId) {
                return reply.code(400).send({ error: 'Album ID, class ID, and user ID required' });
            }
            const admin = (0, supabase_1.getAdminSupabaseClient)();
            const client = admin ?? supabase;
            const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single();
            if (!album)
                return reply.code(404).send({ error: 'Album not found' });
            const role = await (0, auth_1.getRole)(supabase, user);
            const isOwner = album.user_id === user.id || role === 'admin';
            const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle();
            const isAlbumAdmin = memberRow?.role === 'admin';
            const canManage = isOwner || isAlbumAdmin;
            if (!canManage && user.id !== userId) {
                return reply.code(403).send({ error: 'Hanya owner/admin album atau diri sendiri yang bisa menghapus profil' });
            }
            const { data: cls } = await client
                .from('album_classes')
                .select('id, album_id')
                .eq('id', classId)
                .eq('album_id', albumId)
                .single();
            if (!cls)
                return reply.code(404).send({ error: 'Class not found' });
            // Find the access record
            const { data: access, error: findErr } = await client
                .from('album_class_access')
                .select('id')
                .eq('class_id', classId)
                .eq('user_id', userId)
                .maybeSingle();
            if (findErr)
                return reply.code(500).send({ error: findErr.message });
            if (!access)
                return reply.code(404).send({ error: 'Member not found' });
            // Delete the access record
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
                .eq('user_id', userId);
            // If user has no other class access in this album, remove from album_members so they disappear from "tim"
            const { data: otherAccess } = await client
                .from('album_class_access')
                .select('id')
                .eq('album_id', albumId)
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle();
            if (!otherAccess) {
                await client
                    .from('album_members')
                    .delete()
                    .eq('album_id', albumId)
                    .eq('user_id', userId);
            }
            return reply.code(200).send({ success: true });
        }
        catch (err) {
            console.error('Error deleting member:', err);
            return reply.code(500).send({ error: 'Server error' });
        }
    });
    server.patch('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId, userId } = request.params;
        if (!albumId || !classId || !userId) {
            return reply.code(400).send({ error: 'Album ID, class ID, and user ID required' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const isOwner = album.user_id === user.id;
        const { data: memberRow } = await client.from('album_members').select('role').eq('album_id', albumId).eq('user_id', user.id).maybeSingle();
        const isAlbumAdmin = memberRow?.role === 'admin';
        const canManage = isOwner || isAlbumAdmin;
        const isEditingSelf = user.id === userId;
        if (!isEditingSelf && !canManage)
            return reply.code(403).send({ error: 'Hanya owner atau admin album yang bisa menyunting profil orang lain' });
        const { data: access, error: findErr } = await client
            .from('album_class_access')
            .select('id, status')
            .eq('class_id', classId)
            .eq('user_id', userId)
            .maybeSingle();
        if (findErr)
            return reply.code(500).send({ error: findErr.message });
        if (!access)
            return reply.code(404).send({ error: 'Profil tidak ditemukan' });
        const body = (request.body || {});
        const student_name = typeof body?.student_name === 'string' ? body.student_name.trim() : undefined;
        const email = body?.email !== undefined ? (typeof body.email === 'string' ? body.email.trim() || null : null) : undefined;
        const date_of_birth = body?.date_of_birth !== undefined ? (typeof body.date_of_birth === 'string' ? body.date_of_birth.trim() || null : null) : undefined;
        const instagram = body?.instagram !== undefined ? (typeof body.instagram === 'string' ? body.instagram.trim() || null : null) : undefined;
        const message = body?.message !== undefined ? (typeof body.message === 'string' ? body.message.trim() || null : null) : undefined;
        const video_url = body?.video_url !== undefined ? (typeof body.video_url === 'string' ? body.video_url.trim() || null : null) : undefined;
        if (student_name === undefined && email === undefined && date_of_birth === undefined && instagram === undefined && message === undefined && video_url === undefined) {
            return reply.code(400).send({ error: 'Minimal satu field required' });
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
};
exports.default = route;
