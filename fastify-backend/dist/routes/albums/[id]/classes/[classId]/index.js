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
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: album, error: albumErr } = await client
            .from('albums')
            .select('id, user_id')
            .eq('id', albumId)
            .single();
        if (albumErr || !album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        if (album.user_id !== user.id && role !== 'admin') {
            return reply.code(403).send({ error: 'Only owner can delete class' });
        }
        const { data: cls } = await client
            .from('album_classes')
            .select('id')
            .eq('id', classId)
            .eq('album_id', albumId)
            .single();
        if (!cls)
            return reply.code(404).send({ error: 'Class not found' });
        const { error: delErr } = await client.from('album_classes').delete().eq('id', classId);
        if (delErr)
            return reply.code(500).send({ error: delErr.message });
        return reply.send({ message: 'Class deleted' });
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
        const { data: album, error: albumErr } = await client
            .from('albums')
            .select('id, user_id')
            .eq('id', albumId)
            .single();
        if (albumErr || !album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        if (album.user_id !== user.id && role !== 'admin') {
            return reply.code(403).send({ error: 'Only owner can update class' });
        }
        const { data: cls } = await client
            .from('album_classes')
            .select('id, album_id')
            .eq('id', classId)
            .eq('album_id', albumId)
            .maybeSingle();
        if (!cls)
            return reply.code(404).send({ error: 'Class not found' });
        const body = (request.body || {});
        const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
        const sort_order = body?.sort_order !== undefined ? Number(body.sort_order) : undefined;
        const batch_photo_url = typeof body?.batch_photo_url === 'string' ? body.batch_photo_url : undefined;
        const updates = {};
        if (name !== undefined) {
            if (!name)
                return reply.code(400).send({ error: 'Class name is required' });
            // ensure unique name within album
            const { data: existing } = await client
                .from('album_classes')
                .select('id')
                .eq('album_id', albumId)
                .eq('name', name)
                .maybeSingle();
            if (existing && existing.id !== classId)
                return reply.code(400).send({ error: 'Class with this name already exists' });
            updates.name = name;
        }
        if (sort_order !== undefined && !Number.isNaN(sort_order))
            updates.sort_order = sort_order;
        if (batch_photo_url !== undefined)
            updates.batch_photo_url = batch_photo_url;
        if (Object.keys(updates).length === 0) {
            const { data: current } = await client.from('album_classes').select('id, name, sort_order, batch_photo_url').eq('id', classId).maybeSingle();
            return reply.code(500).send(current ?? {});
        }
        const { data: updated, error } = await client
            .from('album_classes')
            .update(updates)
            .eq('id', classId)
            .select('id, name, sort_order, batch_photo_url')
            .single();
        if (error)
            return reply.send({ error: error.message });
        return reply.send(updated);
    });
};
exports.default = route;
