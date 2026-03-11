"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../../lib/supabase");
function tryDecodeURIComponent(str) {
    try {
        return decodeURIComponent(str);
    }
    catch {
        return str;
    }
}
const route = async (server) => {
    // GET /api/albums/:id/video-play/public — no auth, for public flipbook video hotspots
    server.get('/public', async (request, reply) => {
        const { id: albumId } = request.params;
        const urlParam = request.query?.url;
        if (!urlParam || !albumId)
            return reply.code(400).send({ error: 'url required' });
        let videoUrl;
        try {
            videoUrl = decodeURIComponent(urlParam);
        }
        catch {
            return reply.code(400).send({ error: 'Invalid url' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin)
            return reply.code(500).send({ error: 'Server error' });
        const { data: album } = await admin.from('albums').select('id').eq('id', albumId).maybeSingle();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const match = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (!match)
            return reply.code(400).send({ error: 'Invalid video URL' });
        const pathEncoded = match[1];
        const pathDecoded = tryDecodeURIComponent(pathEncoded);
        let data = null;
        let contentType = 'video/mp4';
        for (const path of [pathDecoded, pathEncoded]) {
            const { data: fileData, error } = await admin.storage.from('album-photos').download(path);
            if (!error && fileData) {
                data = await fileData.arrayBuffer();
                contentType = fileData.type || 'video/mp4';
                break;
            }
        }
        if (!data)
            return reply.code(404).send({ error: 'Video tidak ditemukan' });
        const totalLength = data.byteLength;
        const rangeHeader = request.headers['range'];
        if (rangeHeader?.startsWith('bytes=')) {
            const parts = rangeHeader.slice(6).split('-');
            const start = parts[0] ? parseInt(parts[0], 10) : 0;
            const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
            const safeStart = Math.min(Math.max(0, start), totalLength - 1);
            const safeEnd = Math.min(Math.max(safeStart, end), totalLength - 1);
            const chunk = data.slice(safeStart, safeEnd + 1);
            return reply.code(206).headers({
                'Content-Type': contentType,
                'Content-Range': `bytes ${safeStart}-${safeEnd}/${totalLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunk.byteLength),
                'Cache-Control': 'private, max-age=3600',
            }).send(Buffer.from(chunk));
        }
        return reply.headers({
            'Content-Type': contentType,
            'Content-Length': String(totalLength),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=3600',
        }).send(Buffer.from(data));
    });
    server.get('/', async (request, reply) => {
        const supabase = (0, supabase_1.getSupabaseClient)(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return reply.code(401).send({ error: 'Unauthorized' });
        const { id: albumId } = request.params;
        const urlParam = request.query?.url;
        if (!urlParam || !albumId) {
            return reply.code(400).send({ error: 'url required' });
        }
        let videoUrl;
        try {
            videoUrl = decodeURIComponent(urlParam);
        }
        catch {
            return reply.code(400).send({ error: 'Invalid url' });
        }
        const admin = (0, supabase_1.getAdminSupabaseClient)();
        if (!admin)
            return reply.code(500).send({ error: 'Server error' });
        const { data: album } = await admin.from('albums').select('id, user_id').eq('id', albumId).single();
        if (!album)
            return reply.code(404).send({ error: 'Album not found' });
        const match = videoUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (!match)
            return reply.code(400).send({ error: 'Invalid video URL' });
        const pathEncoded = match[1];
        const pathDecoded = tryDecodeURIComponent(pathEncoded);
        let data = null;
        let contentType = 'video/mp4';
        for (const path of [pathDecoded, pathEncoded]) {
            const { data: fileData, error } = await admin.storage.from('album-photos').download(path);
            if (!error && fileData) {
                data = await fileData.arrayBuffer();
                contentType = fileData.type || 'video/mp4';
                break;
            }
        }
        if (!data) {
            return reply.code(404).send({ error: 'Video tidak ditemukan' });
        }
        const totalLength = data.byteLength;
        const rangeHeader = request.headers['range'];
        if (rangeHeader?.startsWith('bytes=')) {
            const parts = rangeHeader.slice(6).split('-');
            const start = parts[0] ? parseInt(parts[0], 10) : 0;
            const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
            const safeStart = Math.min(Math.max(0, start), totalLength - 1);
            const safeEnd = Math.min(Math.max(safeStart, end), totalLength - 1);
            const chunk = data.slice(safeStart, safeEnd + 1);
            return reply.code(206).headers({
                'Content-Type': contentType,
                'Content-Range': `bytes ${safeStart}-${safeEnd}/${totalLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunk.byteLength),
                'Cache-Control': 'private, max-age=3600',
            }).send(Buffer.from(chunk));
        }
        return reply.headers({
            'Content-Type': contentType,
            'Content-Length': String(totalLength),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=3600',
        }).send(Buffer.from(data));
    });
};
exports.default = route;
