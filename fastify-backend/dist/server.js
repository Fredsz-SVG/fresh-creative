"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const dotenv_1 = __importDefault(require("dotenv"));
const ai_edit_1 = __importDefault(require("./routes/admin/ai-edit"));
const transactions_1 = __importDefault(require("./routes/admin/transactions"));
const overview_1 = __importDefault(require("./routes/admin/users/overview"));
const photogroup_1 = __importDefault(require("./routes/ai-features/photogroup"));
const phototovideo_1 = __importDefault(require("./routes/ai-features/phototovideo"));
const pose_1 = __importDefault(require("./routes/ai-features/pose"));
const tryon_1 = __importDefault(require("./routes/ai-features/tryon"));
const check_name_1 = __importDefault(require("./routes/albums/check-name"));
const join_1 = __importDefault(require("./routes/albums/invite/[token]/join"));
const _token_1 = __importDefault(require("./routes/albums/invite/[token]"));
const albums_1 = __importDefault(require("./routes/albums"));
const all_class_members_1 = __importDefault(require("./routes/albums/[id]/all-class-members"));
const check_user_1 = __importDefault(require("./routes/albums/[id]/check-user"));
const checkout_1 = __importDefault(require("./routes/albums/[id]/checkout"));
const classes_1 = __importDefault(require("./routes/albums/[id]/classes"));
const join_as_owner_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/join-as-owner"));
const members_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/members"));
const _userId_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/members/[userId]"));
const my_access_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/my-access"));
const my_request_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/my-request"));
const photo_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/photo"));
const request_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/request"));
const requests_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/requests"));
const _requestId_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/requests/[requestId]"));
const _classId_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]"));
const students_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/students"));
const video_1 = __importDefault(require("./routes/albums/[id]/classes/[classId]/video"));
const cover_1 = __importDefault(require("./routes/albums/[id]/cover"));
const cover_video_1 = __importDefault(require("./routes/albums/[id]/cover-video"));
const flipbook_1 = __importDefault(require("./routes/albums/[id]/flipbook"));
const invite_1 = __importDefault(require("./routes/albums/[id]/invite"));
const invite_token_1 = __importDefault(require("./routes/albums/[id]/invite-token"));
const join_requests_1 = __importDefault(require("./routes/albums/[id]/join-requests"));
const _requestId_2 = __importDefault(require("./routes/albums/[id]/join-requests/[requestId]"));
const join_stats_1 = __importDefault(require("./routes/albums/[id]/join-stats"));
const members_2 = __importDefault(require("./routes/albums/[id]/members"));
const my_access_all_1 = __importDefault(require("./routes/albums/[id]/my-access-all"));
const photos_1 = __importDefault(require("./routes/albums/[id]/photos"));
const _photoId_1 = __importDefault(require("./routes/albums/[id]/photos/[photoId]"));
const public_1 = __importDefault(require("./routes/albums/[id]/public"));
const _id_1 = __importDefault(require("./routes/albums/[id]"));
const teachers_1 = __importDefault(require("./routes/albums/[id]/teachers"));
const photo_2 = __importDefault(require("./routes/albums/[id]/teachers/[teacherId]/photo"));
const photos_2 = __importDefault(require("./routes/albums/[id]/teachers/[teacherId]/photos"));
const _photoId_2 = __importDefault(require("./routes/albums/[id]/teachers/[teacherId]/photos/[photoId]"));
const _teacherId_1 = __importDefault(require("./routes/albums/[id]/teachers/[teacherId]"));
const video_2 = __importDefault(require("./routes/albums/[id]/teachers/[teacherId]/video"));
const unlock_feature_1 = __importDefault(require("./routes/albums/[id]/unlock-feature"));
const video_play_1 = __importDefault(require("./routes/albums/[id]/video-play"));
const logout_1 = __importDefault(require("./routes/auth/logout"));
const otp_status_1 = __importDefault(require("./routes/auth/otp-status"));
const send_login_otp_1 = __importDefault(require("./routes/auth/send-login-otp"));
const verify_login_otp_1 = __importDefault(require("./routes/auth/verify-login-otp"));
const checkout_2 = __importDefault(require("./routes/credits/checkout"));
const packages_1 = __importDefault(require("./routes/credits/packages"));
const redeem_1 = __importDefault(require("./routes/credits/redeem"));
const sync_invoice_1 = __importDefault(require("./routes/credits/sync-invoice"));
const pricing_1 = __importDefault(require("./routes/pricing"));
const proxy_image_1 = __importDefault(require("./routes/proxy-image"));
const showcase_1 = __importDefault(require("./routes/showcase"));
const showcase_2 = __importDefault(require("./routes/admin/showcase"));
const select_area_1 = __importDefault(require("./routes/select-area"));
const join_requests_2 = __importDefault(require("./routes/user/join-requests"));
const me_1 = __importDefault(require("./routes/user/me"));
const notifications_1 = __importDefault(require("./routes/user/notifications"));
const _id_2 = __importDefault(require("./routes/user/notifications/[id]"));
const transactions_2 = __importDefault(require("./routes/user/transactions"));
const xendit_1 = __importDefault(require("./routes/webhooks/xendit"));
dotenv_1.default.config();
const envToLogger = {
    development: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
    production: true,
    test: false,
};
const server = (0, fastify_1.default)({
    logger: envToLogger[process.env.NODE_ENV] ?? true
});
// Register Plugins
server.register(cors_1.default, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}); // Update this for production
server.register(multipart_1.default);
server.register(cookie_1.default);
// Register Routes
server.register(ai_edit_1.default, { prefix: '/api/admin/ai-edit' });
server.register(transactions_1.default, { prefix: '/api/admin/transactions' });
server.register(overview_1.default, { prefix: '/api/admin/users/overview' });
server.register(photogroup_1.default, { prefix: '/api/ai-features/photogroup' });
server.register(phototovideo_1.default, { prefix: '/api/ai-features/phototovideo' });
server.register(pose_1.default, { prefix: '/api/ai-features/pose' });
server.register(tryon_1.default, { prefix: '/api/ai-features/tryon' });
server.register(check_name_1.default, { prefix: '/api/albums/check-name' });
// Must be before other /api/albums routes so POST /api/albums/invite/:token/join is matched
server.register(join_1.default, { prefix: '/api/albums/invite/:token/join' });
server.register(albums_1.default, { prefix: '/api/albums' });
server.register(_token_1.default, { prefix: '/api/albums/invite/:token' });
server.register(all_class_members_1.default, { prefix: '/api/albums/:id/all-class-members' });
server.register(check_user_1.default, { prefix: '/api/albums/:id/check-user' });
server.register(checkout_1.default, { prefix: '/api/albums/:id/checkout' });
server.register(classes_1.default, { prefix: '/api/albums/:id/classes' });
server.register(join_as_owner_1.default, { prefix: '/api/albums/:id/classes/:classId/join-as-owner' });
server.register(members_1.default, { prefix: '/api/albums/:id/classes/:classId/members' });
server.register(_userId_1.default, { prefix: '/api/albums/:id/classes/:classId/members/:userId' });
server.register(my_access_1.default, { prefix: '/api/albums/:id/classes/:classId/my-access' });
server.register(my_request_1.default, { prefix: '/api/albums/:id/classes/:classId/my-request' });
server.register(photo_1.default, { prefix: '/api/albums/:id/classes/:classId/photo' });
server.register(request_1.default, { prefix: '/api/albums/:id/classes/:classId/request' });
server.register(requests_1.default, { prefix: '/api/albums/:id/classes/:classId/requests' });
server.register(_requestId_1.default, { prefix: '/api/albums/:id/classes/:classId/requests/:requestId' });
server.register(_classId_1.default, { prefix: '/api/albums/:id/classes/:classId' });
server.register(students_1.default, { prefix: '/api/albums/:id/classes/:classId/students' });
server.register(video_1.default, { prefix: '/api/albums/:id/classes/:classId/video' });
server.register(cover_1.default, { prefix: '/api/albums/:id/cover' });
server.register(cover_video_1.default, { prefix: '/api/albums/:id/cover-video' });
server.register(flipbook_1.default, { prefix: '/api/albums/:id/flipbook' });
server.register(invite_1.default, { prefix: '/api/albums/:id/invite' });
server.register(invite_token_1.default, { prefix: '/api/albums/:id/invite-token' });
server.register(join_requests_1.default, { prefix: '/api/albums/:id/join-requests' });
server.register(_requestId_2.default, { prefix: '/api/albums/:id/join-requests/:requestId' });
server.register(join_stats_1.default, { prefix: '/api/albums/:id/join-stats' });
server.register(members_2.default, { prefix: '/api/albums/:id/members' });
server.register(my_access_all_1.default, { prefix: '/api/albums/:id/my-access-all' });
server.register(photos_1.default, { prefix: '/api/albums/:id/photos' });
server.register(_photoId_1.default, { prefix: '/api/albums/:id/photos/:photoId' });
server.register(public_1.default, { prefix: '/api/albums/:id/public' });
server.register(_id_1.default, { prefix: '/api/albums/:id' });
server.register(teachers_1.default, { prefix: '/api/albums/:id/teachers' });
server.register(photo_2.default, { prefix: '/api/albums/:id/teachers/:teacherId/photo' });
server.register(photos_2.default, { prefix: '/api/albums/:id/teachers/:teacherId/photos' });
server.register(_photoId_2.default, { prefix: '/api/albums/:id/teachers/:teacherId/photos/:photoId' });
server.register(_teacherId_1.default, { prefix: '/api/albums/:id/teachers/:teacherId' });
server.register(video_2.default, { prefix: '/api/albums/:id/teachers/:teacherId/video' });
server.register(unlock_feature_1.default, { prefix: '/api/albums/:id/unlock-feature' });
server.register(video_play_1.default, { prefix: '/api/albums/:id/video-play' });
server.register(logout_1.default, { prefix: '/api/auth/logout' });
server.register(otp_status_1.default, { prefix: '/api/auth/otp-status' });
server.register(send_login_otp_1.default, { prefix: '/api/auth/send-login-otp' });
server.register(verify_login_otp_1.default, { prefix: '/api/auth/verify-login-otp' });
server.register(checkout_2.default, { prefix: '/api/credits/checkout' });
server.register(packages_1.default, { prefix: '/api/credits/packages' });
server.register(redeem_1.default, { prefix: '/api/credits/redeem' });
server.register(sync_invoice_1.default, { prefix: '/api/credits/sync-invoice' });
server.register(pricing_1.default, { prefix: '/api/pricing' });
server.register(proxy_image_1.default, { prefix: '/api/proxy-image' });
server.register(showcase_1.default, { prefix: '/api/showcase' });
server.register(showcase_2.default, { prefix: '/api/admin/showcase' });
server.register(select_area_1.default, { prefix: '/api/select-area' });
server.register(join_requests_2.default, { prefix: '/api/user/join-requests' });
server.register(me_1.default, { prefix: '/api/user/me' });
server.register(notifications_1.default, { prefix: '/api/user/notifications' });
server.register(_id_2.default, { prefix: '/api/user/notifications/:id' });
server.register(transactions_2.default, { prefix: '/api/user/transactions' });
server.register(xendit_1.default, { prefix: '/api/webhooks/xendit' });
server.get('/', async (request, reply) => {
    return { status: '🟢 API is running' };
});
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '8000', 10);
        await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`Server listening on port ${port}`);
        // Graceful shutdown for nodemon/tsx watch
        const closeServer = async () => {
            await server.close();
            process.exit(0);
        };
        process.on('SIGINT', closeServer);
        process.on('SIGTERM', closeServer);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
