"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../../lib/supabase");
const route = async (server) => {
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized. Please log in to join.' });
        }
        const { token } = request.params;
        if (!token) {
            return reply.code(400).send({ error: 'Token required' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin) {
            return reply.code(500).send({ error: 'Server error' });
        }
        const { data: invite, error: inviteErr } = await admin
            .from('album_invites')
            .select('id, album_id, expires_at, role')
            .eq('token', token)
            .single();
        if (inviteErr || !invite) {
            // Token might be student_invite_token (registration page) instead of album_invites
            const { data: albumByStudentToken } = await admin
                .from('albums')
                .select('id')
                .eq('student_invite_token', token)
                .maybeSingle();
            if (albumByStudentToken) {
                return reply.code(200).send({
                    redirectTo: `/invite/${token}`,
                    message: 'Gunakan halaman pendaftaran untuk kode ini.',
                });
            }
            return reply.code(404).send({ error: 'Invite not found or invalid' });
        }
        const expiresAt = new Date(invite.expires_at);
        if (expiresAt < new Date()) {
            return reply.code(410).send({ error: 'Invite expired' });
        }
        const albumId = invite.album_id;
        const inviteRole = invite.role || 'member';
        const { data: existing } = await supabase
            .from('album_members')
            .select('album_id, role')
            .eq('album_id', albumId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (existing) {
            // Already member. Option: Update role if invite is higher privilege?
            // For now, just return success. If they want to upgrade, they should leave and rejoin or be promoted.
            // Or we can simple update valid role if invite says admin and current is member.
            if (inviteRole === 'admin' && existing.role !== 'admin') {
                await supabase
                    .from('album_members')
                    .update({ role: 'admin' })
                    .eq('album_id', albumId)
                    .eq('user_id', user.id);
                return reply.code(200).send({ message: 'Role upgraded to admin', albumId });
            }
            return reply.code(200).send({ message: 'Already a member', albumId });
        }
        const { error: insertErr } = await supabase
            .from('album_members')
            .insert({
            album_id: albumId,
            user_id: user.id,
            role: inviteRole
        });
        if (insertErr) {
            return reply.code(500).send({ error: insertErr.message });
        }
        return reply.code(200).send({ message: `Joined album as ${inviteRole}`, albumId });
    });
};
exports.default = route;
