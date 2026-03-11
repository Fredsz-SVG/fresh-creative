"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../lib/supabase");
const auth_1 = require("../../lib/auth");
const school_name_utils_1 = require("../../lib/school-name-utils");
const route = async (server) => {
    server.get('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return reply.code(200).send([]);
            }
            let role = 'user';
            try {
                role = await (0, auth_1.getRole)(supabase, user);
            }
            catch {
                // ignore
            }
            const isAdmin = role === 'admin';
            const scope = request.query?.scope;
            const shouldUseAdminScope = isAdmin && scope !== 'mine';
            // Admin: Fetch ALL albums
            if (shouldUseAdminScope) {
                const adminClient = (0, supabase_1.getAdminSupabaseClient)();
                if (!adminClient) {
                    return reply.code(500).send({ error: 'Admin client not configured' });
                }
                const { data: albums, error } = await adminClient
                    .from('albums')
                    .select(`
            id, name, type, status, created_at, 
            pricing_package_id, 
            pricing_packages(name), 
            school_city, kab_kota, wa_e164, province_id, province_name, pic_name, students_count, source, total_estimated_price,
            payment_status, payment_url
          `)
                    .order('created_at', { ascending: false });
                if (error) {
                    console.error('[GET /api/albums] admin error:', error.message);
                    return reply.code(500).send({ error: error.message });
                }
                // Map to frontend expected format
                const result = (albums ?? []).map((a) => {
                    const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages;
                    return {
                        ...a,
                        pricing_packages: pkg,
                        isOwner: false // Admin view
                    };
                });
                return reply.send(result);
            }
            const albumColumns = 'id, name, type, status, user_id, created_at, cover_image_url, pricing_package_id, pricing_packages(name), payment_status, payment_url, total_estimated_price';
            const [ownedRes, memberRowsRes] = await Promise.all([
                supabase.from('albums').select(albumColumns).eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('album_members').select('album_id').eq('user_id', user.id)
            ]);
            if (ownedRes.error)
                return reply.send({ error: ownedRes.error.message });
            const ownedAlbums = ownedRes.data ?? [];
            const memberAlbumIds = (memberRowsRes.data ?? []).map((r) => r.album_id).filter(Boolean);
            const adminClient = (0, supabase_1.getAdminSupabaseClient)();
            const [memberAlbumsRes, approvedRowsRes] = await Promise.all([
                memberAlbumIds.length > 0 ? supabase.from('albums').select(albumColumns).in('id', memberAlbumIds) : Promise.resolve({ data: [] }),
                adminClient
                    ? adminClient.from('album_class_access').select('album_id').eq('user_id', user.id).eq('status', 'approved')
                    : Promise.resolve({ data: [] })
            ]);
            const memberAlbums = memberAlbumsRes.data ?? [];
            const approvedAlbumIds = (approvedRowsRes.data ?? []).map((r) => r.album_id).filter(Boolean);
            let approvedClassAccessAlbums = [];
            if (adminClient && approvedAlbumIds.length > 0) {
                const { data } = await adminClient.from('albums').select(albumColumns).in('id', approvedAlbumIds);
                approvedClassAccessAlbums = data ?? [];
            }
            const ownedSet = new Set((ownedAlbums ?? []).map(a => a.id));
            const memberSet = new Set(memberAlbums.map(a => a.id));
            const finalAlbums = [
                ...(ownedAlbums ?? []).map(a => ({ ...a, isOwner: true })),
                ...memberAlbums.filter(a => !ownedSet.has(a.id)).map(a => ({ ...a, isOwner: false })),
                ...approvedClassAccessAlbums.filter(a => !ownedSet.has(a.id) && !memberSet.has(a.id)).map(a => ({ ...a, isOwner: false, status: 'approved' }))
            ];
            // Sort combined
            finalAlbums.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            // Normalize pricing_packages
            const normalized = finalAlbums.map((a) => {
                const pkg = Array.isArray(a.pricing_packages) ? a.pricing_packages[0] : a.pricing_packages;
                return { ...a, pricing_packages: pkg };
            });
            return reply.send(normalized);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[GET /api/albums]', err);
            return reply.send({ error: message });
        }
        finally {
        }
    });
    server.post('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return reply.code(401).send({ error: 'Unauthorized. Please login.' });
        }
        let body;
        try {
            body = request.body;
        }
        catch {
            return reply.code(400).send({ error: 'Invalid JSON' });
        }
        const { type = 'yearbook', name, school_name } = body;
        // Data to insert
        const dataToInsert = {
            user_id: user.id,
            type: type,
            status: 'pending', // Default pending
        };
        if (type === 'yearbook') {
            // Expect detailed lead data
            // Use school_name if provided, else name
            const finalName = (school_name || name || '').trim();
            if (!finalName) {
                return reply.code(400).send({ error: 'Nama sekolah wajib.' });
            }
            // Validate school name format
            const SCHOOL_NAME_REGEX = /^(SMAN|SMKN|SMK|SMA|MAN|MA|SMPN|SMP|MTsN|MTs|SDN|SD|MIN|MI)\s+\d+\s+.{2,}$/i;
            if (!SCHOOL_NAME_REGEX.test(finalName)) {
                return reply.code(400).send({ error: 'Format nama sekolah harus seperti: SMAN 1 Salatiga, SMKN 2 Bandung, dst.' });
            }
            // Check for duplicate school name (fuzzy)
            const adminClient = (0, supabase_1.getAdminSupabaseClient)();
            if (adminClient) {
                const { data: albums } = await adminClient
                    .from('albums')
                    .select('id, name, pic_name, wa_e164')
                    .eq('type', 'yearbook');
                if (albums && albums.length > 0) {
                    for (const album of albums) {
                        if ((0, school_name_utils_1.isSimilarSchoolName)(finalName, album.name || '')) {
                            const contact = [album.pic_name, album.wa_e164].filter(Boolean).join(' - ');
                            return reply.code(409).send({
                                error: `Nama sekolah "${finalName}" mirip dengan "${album.name}" yang sudah terdaftar.${contact ? ` Hubungi ${contact} untuk informasi lebih lanjut.` : ''}`
                            });
                        }
                    }
                }
            }
            dataToInsert.name = finalName;
            dataToInsert.school_city = body.school_city;
            dataToInsert.kab_kota = body.kab_kota;
            dataToInsert.wa_e164 = body.wa_e164;
            dataToInsert.province_id = body.province_id;
            dataToInsert.province_name = body.province_name;
            dataToInsert.pic_name = body.pic_name;
            dataToInsert.students_count = body.students_count;
            dataToInsert.source = body.source || 'showroom';
            dataToInsert.pricing_package_id = body.pricing_package_id;
            dataToInsert.total_estimated_price = body.total_estimated_price;
        }
        else if (type === 'public') {
            if (!name) {
                return reply.code(400).send({ error: 'Nama album wajib.' });
            }
            dataToInsert.name = name;
            dataToInsert.status = 'approved';
        }
        else {
            return reply.code(400).send({ error: 'Invalid type' });
        }
        const { data, error } = await supabase
            .from('albums')
            .insert(dataToInsert)
            .select()
            .single();
        if (error) {
            return reply.code(500).send({ error: error.message });
        }
        // Invalidate user albums cache so the list page shows the new album immediately
        return reply.send(data);
    });
    server.delete('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const body = (request.body || {});
        const { id } = body;
        if (!id)
            return reply.code(400).send({ error: 'Album ID is required' });
        const role = await (0, auth_1.getRole)(supabase, user);
        if (role === 'admin') {
            const admin = (0, supabase_1.getAdminSupabaseClient)();
            if (!admin)
                return reply.code(500).send({ error: 'Admin client not configured' });
            // Fetch album owner before deleting to invalidate their cache
            const { data: albumData } = await admin.from('albums').select('user_id').eq('id', id).single();
            const { error } = await admin.from('albums').delete().eq('id', id);
            if (error)
                return reply.code(500).send({ error: error.message });
            /* cache removed */
        }
        else {
            // User can only delete OWN albums
            const { error } = await supabase.from('albums').delete().eq('id', id).eq('user_id', user.id);
            if (error)
                return reply.code(500).send({ error: error.message });
        }
        return reply.send({ message: 'Album deleted successfully' });
    });
};
exports.default = route;
