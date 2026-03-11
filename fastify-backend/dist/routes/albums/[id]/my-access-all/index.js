"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return reply.send({ access: {}, requests: {} });
            }
            const { id: albumId } = request.params;
            if (!albumId) {
                return reply.code(400).send({ error: 'Album ID required' });
            }
            const [accessRes, requestsRes] = await Promise.all([
                supabase
                    .from('album_class_access')
                    .select('id, class_id, album_id, user_id, student_name, email, status, date_of_birth, instagram, message, video_url, photos, created_at')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id),
                supabase
                    .from('album_join_requests')
                    .select('id, album_id, user_id, student_name, email, phone, class_name, status, assigned_class_id, requested_at')
                    .eq('album_id', albumId)
                    .eq('user_id', user.id)
            ]);
            if (accessRes.error)
                throw accessRes.error;
            if (requestsRes.error)
                throw requestsRes.error;
            const accessByClass = {};
            accessRes.data?.forEach((item) => {
                if (item.class_id)
                    accessByClass[item.class_id] = item;
            });
            const requestsByClassMap = {};
            requestsRes.data?.forEach((item) => {
                if (item.assigned_class_id)
                    requestsByClassMap[item.assigned_class_id] = item;
            });
            return reply.send({ access: accessByClass, requests: requestsByClassMap });
        }
        catch (err) {
            console.error('Error in my-access-all:', err);
            return reply.code(500).send({ error: err.message || 'Internal Server Error' });
        }
    });
};
exports.default = route;
