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
            let mimetype = 'video/mp4';
            try {
                const parts = request.parts();
                for await (const part of parts) {
                    if (part.type === 'file' && part.fieldname === 'file') {
                        fileBuffer = await part.toBuffer();
                        filename = part.filename || 'video.mp4';
                        mimetype = part.mimetype || 'video/mp4';
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
            const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20MB
            if (fileBuffer.length > MAX_VIDEO_BYTES) {
                return reply.code(413).send({ error: 'Video maksimal 20MB' });
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
                .select('id, video_url')
                .eq('id', teacherId)
                .eq('album_id', albumId)
                .maybeSingle();
            if (!teacher) {
                return reply.code(404).send({ error: 'Teacher not found' });
            }
            const admin = (0, supabase_1.getAdminSupabaseClient)();
            if (!admin)
                return reply.code(500).send({ error: 'Server configuration error' });
            // Delete old video if exists
            if (teacher.video_url) {
                try {
                    const urlParts = teacher.video_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    await admin.storage
                        .from('album-photos')
                        .remove([`teachers/${teacherId}/videos/${fileName}`]);
                }
                catch (error) {
                    console.error('Error deleting old video:', error);
                }
            }
            // Upload new video to storage
            const fileExt = filename.split('.').pop() || 'mp4';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `teachers/${teacherId}/videos/${fileName}`;
            const { error: uploadError } = await admin.storage
                .from('album-photos')
                .upload(filePath, fileBuffer, { contentType: mimetype, upsert: true });
            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                return reply.code(500).send({ error: uploadError.message });
            }
            // Get public URL
            const { data: { publicUrl } } = admin.storage
                .from('album-photos')
                .getPublicUrl(filePath);
            // Update teacher with new video URL
            const { data: updatedTeachers, error: updateError } = await admin
                .from('album_teachers')
                .update({ video_url: publicUrl })
                .eq('id', teacherId)
                .eq('album_id', albumId)
                .select();
            if (updateError) {
                console.error('DB update error:', updateError);
                return reply.code(500).send({ error: updateError.message });
            }
            if (!updatedTeachers || updatedTeachers.length === 0) {
                return reply.code(500).send({ error: 'Failed to update teacher' });
            }
            return reply.code(200).send({ video_url: publicUrl });
        }
        catch (error) {
            console.error('Error in POST /api/albums/[id]/teachers/[teacherId]/video:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
    server.delete('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { id: albumId, teacherId } = request.params;
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
            // Get teacher info
            const { data: teacher } = await supabase
                .from('album_teachers')
                .select('video_url')
                .eq('id', teacherId)
                .eq('album_id', albumId)
                .maybeSingle();
            if (!teacher) {
                return reply.code(404).send({ error: 'Teacher not found' });
            }
            // Delete video from storage
            if (teacher.video_url) {
                try {
                    const urlParts = teacher.video_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    await supabase.storage
                        .from('album-photos')
                        .remove([`teachers/${teacherId}/videos/${fileName}`]);
                }
                catch (error) {
                    console.error('Error deleting video from storage:', error);
                }
            }
            // Update teacher to remove video URL
            const { error: updateError } = await supabase
                .from('album_teachers')
                .update({ video_url: null })
                .eq('id', teacherId)
                .eq('album_id', albumId);
            if (updateError) {
                console.error('Error updating teacher:', updateError);
                return reply.code(500).send({ error: updateError.message });
            }
            return reply.code(200).send({ success: true });
        }
        catch (error) {
            console.error('Error in DELETE video:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
};
exports.default = route;
