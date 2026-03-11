"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const replicate_1 = __importDefault(require("replicate"));
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
const PHOTO_TO_VIDEO_MODEL = 'wan-video/wan-2.2-i2v-fast';
function getOutputUrl(output) {
    if (typeof output === 'string')
        return output;
    if (output && typeof output === 'object' && 'url' in output) {
        const u = output.url;
        return typeof u === 'function' ? u() : typeof u === 'string' ? u : '';
    }
    return '';
}
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user)
                return reply.code(401).send({ ok: false, error: 'Unauthorized' });
            const { data: pricing } = await supabase.from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', 'phototovideo').maybeSingle();
            const creditsPerUse = pricing?.credits_per_use ?? 0;
            const { data: userRow } = await supabase.from('users').select('credits').eq('id', user.id).single();
            if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
                return reply.code(402).send({ ok: false, error: 'Credit tidak cukup' });
            }
            if (!REPLICATE_API_TOKEN)
                return reply.code(500).send({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' });
            const replicate = new replicate_1.default({ auth: REPLICATE_API_TOKEN });
            const body = request.body || {};
            if (!body.image)
                return reply.code(400).send({ ok: false, error: 'File foto tidak valid' });
            const output = await replicate.run(PHOTO_TO_VIDEO_MODEL, { input: { image: body.image, prompt: body.prompt || 'A cinematic video', go_fast: true, num_frames: 81, resolution: '480p', sample_shift: 12, frames_per_second: 16 } });
            const videoUrl = getOutputUrl(output);
            if (!videoUrl)
                return reply.code(500).send({ ok: false, error: 'Tidak ada hasil video' });
            if (creditsPerUse > 0) {
                const { data: latest } = await supabase.from('users').select('credits').eq('id', user.id).single();
                await supabase.from('users').update({ credits: Math.max((latest?.credits ?? 0) - creditsPerUse, 0) }).eq('id', user.id);
            }
            return reply.send({ ok: true, video: videoUrl });
        }
        catch (err) {
            console.error('Photo to Video error:', err);
            return reply.code(500).send({ ok: false, error: err?.message || 'Gagal' });
        }
    });
};
exports.default = route;
