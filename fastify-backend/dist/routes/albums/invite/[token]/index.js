"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const { token } = request.params;
        if (!token)
            return reply.code(400).send({ error: 'Token required' });
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        const { data: album } = await admin
            .from('albums')
            .select('id, name, type, student_invite_expires_at, description, cover_image_url')
            .eq('student_invite_token', token)
            .maybeSingle();
        if (!album)
            return reply.code(404).send({ error: 'Invite not found or invalid' });
        const expiresAt = album.student_invite_expires_at ? new Date(album.student_invite_expires_at) : null;
        if (expiresAt && expiresAt < new Date()) {
            return reply.code(410).send({ error: 'Invite expired' });
        }
        return reply.send({
            inviteType: 'student', albumId: album.id, name: album.name, type: album.type,
            description: album.description, coverImageUrl: album.cover_image_url,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
        });
    });
};
exports.default = route;
