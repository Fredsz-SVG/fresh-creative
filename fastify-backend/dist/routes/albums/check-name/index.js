"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const school_name_utils_1 = require("../../../lib/school-name-utils");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const name = request.query?.name?.trim();
        if (!name) {
            return reply.send({ exists: false });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin) {
            return reply.code(500).send({ error: 'Admin client not configured' });
        }
        const { data: albums, error } = await admin
            .from('albums')
            .select('id, name, pic_name, wa_e164')
            .eq('type', 'yearbook');
        if (error) {
            console.error('[check-name] error:', error.message);
            return reply.send({ exists: false });
        }
        if (!albums || albums.length === 0) {
            return reply.send({ exists: false });
        }
        for (const album of albums) {
            if ((0, school_name_utils_1.isSimilarSchoolName)(name, album.name || '')) {
                return reply.send({
                    exists: true,
                    matched_name: album.name,
                    pic_name: album.pic_name || null,
                    wa_e164: album.wa_e164 || null,
                });
            }
        }
        return reply.send({ exists: false });
    });
};
exports.default = route;
