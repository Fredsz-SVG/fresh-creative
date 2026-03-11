"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const route = async (server) => {
    // GET /api/user/join-requests
    server.get('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return reply.code(401).send({ error: 'Unauthorized' });
            const adminClient = (0, supabase_1.getAdminSupabaseClient)();
            const { data: pendingRequests, error: pendingError } = await adminClient
                .from('album_join_requests')
                .select('id, album_id, student_name, class_name, email, status, requested_at')
                .eq('user_id', user.id).in('status', ['pending', 'rejected'])
                .order('requested_at', { ascending: false });
            if (pendingError)
                return reply.code(500).send({ error: 'Failed to fetch join requests' });
            const { data: approvedAccess } = await adminClient
                .from('album_class_access')
                .select('id, album_id, class_id, student_name, email, status, created_at')
                .eq('user_id', user.id).eq('status', 'approved')
                .order('created_at', { ascending: false });
            const allRequests = [
                ...(pendingRequests || []),
                ...(approvedAccess || []).map((acc) => ({ ...acc, requested_at: acc.created_at })),
            ];
            if (allRequests.length > 0) {
                const albumIds = [...new Set(allRequests.map(r => r.album_id))];
                const classIds = [...new Set(allRequests.map(r => r.class_id).filter(Boolean))];
                const { data: albums } = await adminClient.from('albums').select('id, name').in('id', albumIds);
                const { data: classes } = classIds.length > 0
                    ? await adminClient.from('album_classes').select('id, name').in('id', classIds)
                    : { data: null };
                const albumMap = new Map(albums?.map((a) => [a.id, a.name]) || []);
                const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);
                return reply.send(allRequests.map((req) => ({
                    ...req,
                    album_name: albumMap.get(req.album_id) || 'Unknown Album',
                    class_name: req.class_name || (req.class_id ? classMap.get(req.class_id) : null) || null,
                })));
            }
            return reply.send([]);
        }
        catch (error) {
            console.error('Error in user join-requests:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
};
exports.default = route;
