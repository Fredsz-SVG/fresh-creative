"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { id: albumId, classId } = request.params;
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            // Check if user is global admin
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            const isGlobalAdmin = userData?.role === 'admin';
            if (!isGlobalAdmin) {
                // Verify user is album owner or album admin
                const { data: album, error: albumError } = await supabase
                    .from('albums')
                    .select('user_id')
                    .eq('id', albumId)
                    .maybeSingle();
                if (albumError || !album) {
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
            // Verify class exists
            const { data: classObj, error: classError } = await supabase
                .from('album_classes')
                .select('batch_photo_url')
                .eq('id', classId)
                .eq('album_id', albumId)
                .maybeSingle();
            if (classError || !classObj) {
                return reply.code(404).send({ error: 'Class not found' });
            }
            // Get file from form data
            const formData = request.body;
            const file = formData.get('file');
            if (!file) {
                return reply.code(400).send({ error: 'No file provided' });
            }
            // Validate file type
            if (!file.type.startsWith('image/')) {
                return reply.code(400).send({ error: 'File must be an image' });
            }
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                return reply.code(413).send({ error: 'Foto maksimal 10MB' });
            }
            const bucket = 'album-photos';
            // Delete old photo if exists
            if (classObj.batch_photo_url) {
                try {
                    const urlParts = classObj.batch_photo_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    await supabase.storage
                        .from(bucket)
                        .remove([`classes/${classId}/${oldFileName}`]);
                }
                catch (error) {
                    console.error('Error deleting old photo:', error);
                    // Continue with upload even if old photo deletion fails
                }
            }
            // Upload new photo
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `classes/${classId}/${fileName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
            if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                return reply.code(500).send({ error: uploadError.message });
            }
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            // Update class with new photo URL
            const { data: updatedClass, error: updateError } = await supabase
                .from('album_classes')
                .update({ batch_photo_url: publicUrl })
                .eq('id', classId)
                .eq('album_id', albumId)
                .select('id, name, sort_order, batch_photo_url')
                .single();
            if (updateError) {
                console.error('Error updating class photo URL:', updateError);
                // Try to delete uploaded file
                await supabase.storage.from(bucket).remove([filePath]);
                return reply.code(500).send({ error: updateError.message });
            }
            return reply.code(500).send(updatedClass);
        }
        catch (error) {
            console.error('Error in POST /api/albums/[id]/classes/[classId]/photo:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
    server.delete('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { id: albumId, classId } = request.params;
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            // Check if user is global admin
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            const isGlobalAdmin = userData?.role === 'admin';
            if (!isGlobalAdmin) {
                // Verify user is album owner or album admin
                const { data: album, error: albumError } = await supabase
                    .from('albums')
                    .select('user_id')
                    .eq('id', albumId)
                    .maybeSingle();
                if (albumError || !album) {
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
            // Get class info
            const { data: classObj, error: classError } = await supabase
                .from('album_classes')
                .select('batch_photo_url')
                .eq('id', classId)
                .eq('album_id', albumId)
                .maybeSingle();
            if (classError || !classObj) {
                return reply.code(404).send({ error: 'Class not found' });
            }
            if (!classObj.batch_photo_url) {
                return reply.code(400).send({ error: 'No photo to delete' });
            }
            // Delete photo from storage
            try {
                const urlParts = classObj.batch_photo_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const bucket = 'album-photos';
                const { error: storageError } = await supabase.storage
                    .from(bucket)
                    .remove([`classes/${classId}/${fileName}`]);
                if (storageError) {
                    console.error('Error deleting photo from storage:', storageError);
                    // Continue with database update even if storage deletion fails
                }
            }
            catch (error) {
                console.error('Error deleting photo:', error);
            }
            // Update class to remove photo URL
            const { error: updateError } = await supabase
                .from('album_classes')
                .update({ batch_photo_url: null })
                .eq('id', classId)
                .eq('album_id', albumId);
            if (updateError) {
                console.error('Error updating class:', updateError);
                return reply.code(500).send({ error: updateError.message });
            }
            return reply.code(500).send({ success: true });
        }
        catch (error) {
            console.error('Error in DELETE /api/albums/[id]/classes/[classId]/photo:', error);
            return reply.send({ error: error.message || 'Internal server error' });
        }
    });
};
exports.default = route;
