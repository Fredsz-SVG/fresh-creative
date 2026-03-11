"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route = async (server) => {
    server.get('/', async (request, reply) => {
        const url = request.query?.url;
        /* cache invalidation removed */ return reply.code(400).send({ error: 'Invalid or disallowed URL' });
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'FreshCreative/1.0' } });
            if (!res.ok)
                return reply.code(502).send({ error: 'Failed to fetch image' });
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            const buffer = Buffer.from(await res.arrayBuffer());
            return reply.header('Content-Type', contentType).header('Cache-Control', 'private, max-age=3600').send(buffer);
        }
        catch (e) {
            console.error('proxy-image error:', e);
            return reply.code(502).send({ error: 'Proxy error' });
        }
    });
};
exports.default = route;
