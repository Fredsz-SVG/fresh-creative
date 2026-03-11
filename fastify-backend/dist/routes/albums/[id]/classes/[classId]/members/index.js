"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const auth_1 = require("../../../../../../lib/auth");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        try {
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
                        return reply.code(403).send({ error: 'Tidak punya akses ke album ini' });
                    }
                }
            }
            const { data: cls } = await client
                .from('album_classes')
                .select('id, album_id')
                .eq('id', classId)
                .eq('album_id', albumId)
                .single();
            if (!cls)
                return reply.code(404).send({ error: 'Class not found' });
            const { data: list, error } = await client
                .from('album_class_access')
                .select('user_id, student_name, email, date_of_birth, instagram, message, video_url, photos, status')
                .eq('class_id', classId)
                .in('status', ['approved', 'pending'])
                .order('student_name', { ascending: true });
            if (error) {
                console.error('Supabase query error:', error);
                return reply.code(500).send({ error: error.message });
            }
            const members = (list ?? [])
                .filter((r) => isOwner || r.status === 'approved')
                .map((r) => ({
                user_id: r.user_id,
                student_name: r.student_name,
                email: r.email ?? null,
                date_of_birth: r.date_of_birth ?? null,
                instagram: r.instagram ?? null,
                message: r.message ?? null,
                video_url: r.video_url ?? null,
                photos: r.photos ?? [],
                is_me: r.user_id === user.id,
                status: r.status,
            }));
            return reply.code(500).send(members);
        }
        catch (err) {
            console.error('Error fetching members:', err);
            return reply.send({ error: 'Internal server error' });
        }
    });
};
exports.default = route;
