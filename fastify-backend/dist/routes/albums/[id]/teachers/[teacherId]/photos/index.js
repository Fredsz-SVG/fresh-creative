"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { id: albumId, teacherId } = request.params;
            let fileBuffer = null;
            let filename = '';
            let mimetype = 'image/jpeg';
            try {
                const parts = request.parts();
                for await (const part of parts) {
                    if (part.type === 'file' && part.fieldname === 'file') {
                        fileBuffer = await part.toBuffer();
                        filename = part.filename || 'photo.jpg';
                        mimetype = part.mimetype || 'image/jpeg';
                        break;
                    }
                }
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return reply.code(400).send({ error: msg || 'Invalid multipart body' });
            }
            if (!fileBuffer || fileBuffer.length === 0) {
                return reply.code(400).send({ error: 'No file provided' });
            }
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            // Check permissions
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            const isGlobalAdmin = userData?.role === 'admin';
            if (!isGlobalAdmin) {
                const { data: album } = await supabase
                    .from('albums')
                    .select('user_id')
                    .eq('id', albumId)
                    .maybeSingle();
                if (!album) {
                    return reply.code(404).send({ error: 'Album not found' });
                }
                const isOwner = album.user_id === user.id;
                if (!isOwner) {
                    const { data: member } = await supabase
                        .from('album_members')
                        .select('role')
                        .eq('album_id', albumId)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    if (!member || !['admin', 'owner'].includes(member.role)) {
                        return reply.code(403).send({ error: 'Forbidden' });
                    }
                }
            }
            // Verify teacher exists
            const { data: teacher } = await supabase
                .from('album_teachers')
                .select('id')
                .eq('id', teacherId)
                .eq('album_id', albumId)
                .maybeSingle();
            if (!teacher) {
                return reply.code(404).send({ error: 'Teacher not found' });
            }
            // Upload file to storage
            const fileExt = filename.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `teachers/${teacherId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, fileBuffer, { contentType: mimetype });
            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                return reply.code(500).send({ error: uploadError.message });
            }
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('album-photos')
                .getPublicUrl(filePath);
            // Get max sort order
            const { data: maxSort } = await supabase
                .from('album_teacher_photos')
                .select('sort_order')
                .eq('teacher_id', teacherId)
                .order('sort_order', { ascending: false })
                .limit(1)
                .maybeSingle();
            const nextSort = (maxSort?.sort_order ?? -1) + 1;
            // Insert photo record
            const { data: newPhotos, error: insertError } = await supabase
                .from('album_teacher_photos')
                .insert({
                teacher_id: teacherId,
                file_url: publicUrl,
                sort_order: nextSort
            })
                .select();
            if (insertError) {
                console.error('DB insert error:', insertError);
                return reply.code(500).send({ error: insertError.message });
            }
            if (!newPhotos || newPhotos.length === 0) {
                return reply.code(500).send({ error: 'Failed to create photo record' });
            }
            return reply.code(201).send(newPhotos[0]);
        }
        catch (error) {
            console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/photos:', error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });
};
exports.default = route;
