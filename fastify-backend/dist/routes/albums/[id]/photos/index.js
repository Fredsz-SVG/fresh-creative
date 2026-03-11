"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const auth_1 = require("../../../../lib/auth");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId } = request.params;
        if (!albumId)
            return reply.code(400).send({ error: 'Album ID required' });
        const searchParams = request.query;
        const classId = request.query?.class_id;
        const studentName = request.query?.student_name;
        if (!classId)
            return reply.code(400).send({ error: 'class_id required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const role = await (0, auth_1.getRole)(supabase, user);
        const { data: album } = await (admin ?? supabase).from('albums').select('id, user_id').eq('id', albumId).single();
        const isOwnerOrAdmin = album && (album.user_id === user.id || role === 'admin');
        const client = isOwnerOrAdmin && admin ? admin : supabase;
        const { data: cls } = await client
            .from('album_classes')
            .select('id, album_id')
            .eq('id', classId)
            .eq('album_id', albumId)
            .single();
        if (!cls)
            return reply.code(404).send({ error: 'Class not found' });
        let query = client
            .from('album_class_access')
            .select('student_name, photos, created_at')
            .eq('album_id', albumId)
            .eq('class_id', classId);
        if (studentName != null && studentName !== '') {
            query = query.eq('student_name', decodeURIComponent(studentName));
        }
        const { data: records, error } = await query;
        if (error)
            return reply.code(500).send({ error: error.message });
        // Transform records to flat photo list for compatibility
        const photos = (records || []).flatMap((r) => {
            const studentPhotos = r.photos || [];
            return studentPhotos.map((url, idx) => ({
                id: `${r.student_name}-${idx}`,
                file_url: url,
                student_name: r.student_name,
                created_at: r.created_at
            }));
        });
        return reply.send(photos);
    });
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
        let classId = '';
        let studentName = '';
        try {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'file') {
                    fileBuffer = await part.toBuffer();
                    filename = part.filename || 'photo.jpg';
                    mimetype = part.mimetype || 'image/jpeg';
                }
                else if (part.type === 'field') {
                    if (part.fieldname === 'class_id')
                        classId = String(part.value ?? '').trim();
                    if (part.fieldname === 'student_name')
                        studentName = String(part.value ?? '').trim();
                }
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return reply.code(400).send({ error: msg || 'Invalid multipart body' });
        }
        if (!fileBuffer || fileBuffer.length === 0 || !classId || !studentName) {
            return reply.code(400).send({ error: 'file, class_id, and student_name required' });
        }
        const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB
        if (fileBuffer.length > MAX_PHOTO_BYTES)
            return reply.code(413).send({ error: 'Foto maksimal 10MB' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: album } = await client.from('albums').select('id, user_id').eq('id', albumId).single();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const role = await (0, auth_1.getRole)(supabase, user);
        const isOwner = album.user_id === user.id || role === 'admin';
        if (!isOwner) {
            // Check if user is album member (admin/helper)
            const { data: member } = await client.from('album_members').select('album_id').eq('album_id', albumId).eq('user_id', user.id).maybeSingle();
            if (!member) {
                // Check if user has approved class access (student who was approved)
                const { data: classAccess } = await client
                    .from('album_class_access')
                    .select('id')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id)
                    .eq('status', 'approved')
                    .maybeSingle();
                if (!classAccess) {
                    return reply.code(403).send({ error: 'No access to album' });
                }
            }
        }
        const { data: cls } = await client.from('album_classes').select('id, album_id').eq('id', classId).eq('album_id', albumId).single();
        if (!cls)
            return reply.code(404).send({ error: 'Class not found' });
        if (!isOwner) {
            const { data: access } = await client
                .from('album_class_access')
                .select('id')
                .eq('class_id', classId)
                .eq('user_id', user.id)
                .eq('status', 'approved')
                .eq('student_name', studentName)
                .maybeSingle();
            if (!access) {
                return reply.code(403).send({ error: 'Anda harus punya akses disetujui untuk nama ini di kelas ini' });
            }
        }
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const path = `${albumId}/${classId}/${crypto.randomUUID()}.${safeExt}`;
        const { data: uploadData, error: uploadErr } = await (admin ?? supabase).storage
            .from('album-photos')
            .upload(path, fileBuffer, { contentType: mimetype, upsert: false });
        if (uploadErr) {
            return reply.code(500).send({ error: uploadErr.message || 'Upload gagal' });
        }
        const { data: urlData } = (admin ?? supabase).storage.from('album-photos').getPublicUrl(uploadData.path);
        const fileUrl = urlData.publicUrl;
        // Check current photos in album_class_access
        const { data: accessRecord } = await client
            .from('album_class_access')
            .select('photos')
            .eq('album_id', albumId)
            .eq('class_id', classId)
            .eq('student_name', studentName)
            .maybeSingle();
        if (!accessRecord) {
            return reply.code(404).send({ error: 'Access record not found' });
        }
        const currentPhotos = accessRecord.photos || [];
        // Check if already at max capacity
        if (currentPhotos.length >= 4) {
            return reply.code(400).send({ error: 'Maksimal 4 foto per siswa' });
        }
        // Append new photo to array
        const updatedPhotos = [...currentPhotos, fileUrl];
        const { error: updateErr } = await client
            .from('album_class_access')
            .update({ photos: updatedPhotos })
            .eq('album_id', albumId)
            .eq('class_id', classId)
            .eq('student_name', studentName);
        if (updateErr)
            return reply.code(500).send({ error: updateErr.message });
        return reply.send({
            id: crypto.randomUUID(),
            file_url: fileUrl,
            student_name: studentName,
            photo_index: updatedPhotos.length - 1,
            total_photos: updatedPhotos.length
        });
    });
};
exports.default = route;
