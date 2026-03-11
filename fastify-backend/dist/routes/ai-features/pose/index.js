"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../../../lib/supabase");
const replicate_1 = __importDefault(require("replicate"));
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
const POSE_MODEL = 'sdxl-based/consistent-character';
const POSE_VERSION = '9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772';
function getOutputUrls(output) {
    if (!Array.isArray(output))
        return [];
    return output.map((item) => {
        if (typeof item === 'string')
            return item;
        if (item?.url)
            return typeof item.url === 'function' ? item.url() : item.url;
        return '';
    }).filter(Boolean);
}
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            const supabase = (0, supabase_1.getSupabaseClient)(request);
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user)
                return reply.code(401).send({ ok: false, error: 'Unauthorized' });
            const { data: pricing } = await supabase.from('ai_feature_pricing').select('credits_per_use').eq('feature_slug', 'pose').maybeSingle();
            const creditsPerUse = pricing?.credits_per_use ?? 0;
            const { data: userRow } = await supabase.from('users').select('credits').eq('id', user.id).single();
            if (creditsPerUse > 0 && (userRow?.credits ?? 0) < creditsPerUse) {
                return reply.code(402).send({ ok: false, error: 'Credit tidak cukup' });
            }
            if (!REPLICATE_API_TOKEN)
                return reply.code(500).send({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' });
            const replicate = new replicate_1.default({ auth: REPLICATE_API_TOKEN });
            const body = request.body || {};
            if (!body.subject)
                return reply.code(400).send({ ok: false, error: 'File foto karakter wajib' });
            const output = await replicate.run(`${POSE_MODEL}:${POSE_VERSION}`, {
                input: { prompt: body.prompt || 'A headshot photo', subject: body.subject, output_format: body.output_format || 'webp', output_quality: 80, number_of_outputs: Math.min(Math.max(body.number_of_outputs || 3, 1), 3), randomise_poses: body.randomise_poses !== false, number_of_images_per_pose: Math.min(Math.max(body.number_of_images_per_pose || 1, 1), 4) },
            });
            const results = getOutputUrls(output);
            if (!results.length)
                return reply.code(500).send({ ok: false, error: 'Tidak ada hasil' });
            if (creditsPerUse > 0) {
                const { data: latest } = await supabase.from('users').select('credits').eq('id', user.id).single();
                await supabase.from('users').update({ credits: Math.max((latest?.credits ?? 0) - creditsPerUse, 0) }).eq('id', user.id);
            }
            return reply.send({ ok: true, results });
        }
        catch (err) {
            console.error('Pose error:', err);
            return reply.code(500).send({ ok: false, error: err?.message || 'Gagal' });
        }
    });
};
exports.default = route;
