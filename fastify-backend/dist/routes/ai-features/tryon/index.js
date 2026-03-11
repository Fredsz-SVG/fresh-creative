"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const replicate_1 = __importDefault(require("replicate"));
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
const IDM_VTON_MODEL = 'cuuupid/idm-vton';
const IDM_VTON_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
function getOutputUrl(output) {
    if (typeof output === 'string')
        return output;
    if (output && typeof output === 'object' && 'url' in output) {
        const u = output.url;
        return typeof u === 'function' ? u() : typeof u === 'string' ? u : '';
    }
    throw new Error('Invalid try-on output');
}
async function processSingleGarment(replicate, humanImg, garmImg, garmentDes = '', category = 'upper_body', steps = 30, crop = false, seed = 42, forceDc = false, maskOnly = false) {
    const output = await replicate.run(`${IDM_VTON_MODEL}:${IDM_VTON_VERSION}`, {
        input: { human_img: humanImg, garm_img: garmImg, garment_des: garmentDes, category, steps, crop, seed, force_dc: forceDc, mask_only: maskOnly },
    });
    return getOutputUrl(output);
}
const route = async (server) => {
    server.post('/', async (request, reply) => {
        try {
            if (!REPLICATE_API_TOKEN)
                return reply.code(500).send({ ok: false, error: 'REPLICATE_API_TOKEN tidak dikonfigurasi' });
            const replicate = new replicate_1.default({ auth: REPLICATE_API_TOKEN });
            const body = request.body || {};
            if (!body.human_img)
                return reply.code(400).send({ ok: false, error: 'File manusia tidak valid' });
            if (body.garm_img) {
                const result = await processSingleGarment(replicate, body.human_img, body.garm_img, body.garment_des || '', body.category || 'upper_body', Math.min(Math.max(body.steps || 30, 1), 40), body.crop === true, body.seed ?? 42, body.force_dc === true, body.mask_only === true);
                return reply.send({ ok: true, results: [result] });
            }
            const garments = body.garments;
            if (!garments?.length)
                return reply.code(400).send({ ok: false, error: 'Minimal 1 garment' });
            if (garments.length > 2)
                return reply.code(400).send({ ok: false, error: 'Maksimal 2 garments' });
            const results = [];
            if (body.mode === 'chain') {
                let cur = body.human_img;
                for (let i = 0; i < garments.length; i++) {
                    const r = await processSingleGarment(replicate, cur, garments[i], `Garment ${i + 1}`, body[`category_${i}`] || 'upper_body');
                    if (i < garments.length - 1) {
                        const res = await fetch(r);
                        cur = 'data:image/jpeg;base64,' + Buffer.from(await res.arrayBuffer()).toString('base64');
                    }
                    else
                        results.push(r);
                }
            }
            else {
                results.push(...(await Promise.all(garments.map((g, i) => processSingleGarment(replicate, body.human_img, g, `Garment ${i + 1}`, body[`category_${i}`] || 'upper_body')))));
            }
            return reply.send({ ok: true, results });
        }
        catch (err) {
            console.error('Try-on error:', err);
            return reply.code(err?.status === 402 ? 402 : 500).send({ ok: false, error: err?.message || 'Gagal' });
        }
    });
};
exports.default = route;
