"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId, classId } = request.params;
        if (!albumId || !classId)
            return reply.code(400).send({ error: 'Album ID and class ID required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const client = admin ?? supabase;
        const { data: cls, error: classErr } = await client
            .from('album_classes')
            .select('id, album_id')
            .eq('id', classId)
            .eq('album_id', albumId)
            .single();
        if (classErr || !cls)
            return reply.code(404).send({ error: 'Class not found' });
        const { data: accessList, error } = await client
            .from('album_class_access')
            .select('student_name, photos')
            .eq('class_id', classId);
        if (error)
            return reply.code(500).send({ error: error.message });
        const students = (accessList || [])
            .map((r) => ({
            student_name: r.student_name,
            photo_count: Array.isArray(r.photos) ? r.photos.length : 0
        }))
            .filter((s) => s.photo_count > 0);
        students.sort((a, b) => a.student_name.localeCompare(b.student_name));
        return reply.send(students);
    });
};
exports.default = route;
