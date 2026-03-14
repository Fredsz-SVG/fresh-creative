import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import aiEditRoutes from './routes/admin/ai-edit'
import admintransactionsRoute from './routes/admin/transactions'
import adminusersoverviewRoute from './routes/admin/users/overview'
import aifeaturesphotogroupRoute from './routes/ai-features/photogroup'
import aifeaturesphototovideoRoute from './routes/ai-features/phototovideo'
import aifeaturesposeRoute from './routes/ai-features/pose'
import aifeaturestryonRoute from './routes/ai-features/tryon'
import albumschecknameRoute from './routes/albums/check-name'
import albumsInviteJoinRoute from './routes/albums/invite/[token]/join'
import albumsinvitetokenRoute from './routes/albums/invite/[token]'
import albumsRoute from './routes/albums'
import albumsidallclassmembersRoute from './routes/albums/[id]/all-class-members'
import albumsidcheckuserRoute from './routes/albums/[id]/check-user'
import albumsidcheckoutRoute from './routes/albums/[id]/checkout'
import albumsidclassesRoute from './routes/albums/[id]/classes'
import albumsidclassesclassIdjoinasownerRoute from './routes/albums/[id]/classes/[classId]/join-as-owner'
import albumsidclassesclassIdmembersRoute from './routes/albums/[id]/classes/[classId]/members'
import albumsidclassesclassIdmembersuserIdRoute from './routes/albums/[id]/classes/[classId]/members/[userId]'
import albumsidclassesclassIdmyaccessRoute from './routes/albums/[id]/classes/[classId]/my-access'
import albumsidclassesclassIdmyrequestRoute from './routes/albums/[id]/classes/[classId]/my-request'
import albumsidclassesclassIdphotoRoute from './routes/albums/[id]/classes/[classId]/photo'
import albumsidclassesclassIdrequestRoute from './routes/albums/[id]/classes/[classId]/request'
import albumsidclassesclassIdrequestsRoute from './routes/albums/[id]/classes/[classId]/requests'
import albumsidclassesclassIdrequestsrequestIdRoute from './routes/albums/[id]/classes/[classId]/requests/[requestId]'
import albumsidclassesclassIdRoute from './routes/albums/[id]/classes/[classId]'
import albumsidclassesclassIdstudentsRoute from './routes/albums/[id]/classes/[classId]/students'
import albumsidclassesclassIdvideoRoute from './routes/albums/[id]/classes/[classId]/video'
import albumsidcoverRoute from './routes/albums/[id]/cover'
import albumsidcovervideoRoute from './routes/albums/[id]/cover-video'
import albumsidflipbookRoute from './routes/albums/[id]/flipbook'
import albumsidinviteRoute from './routes/albums/[id]/invite'
import albumsidinvitetokenRoute from './routes/albums/[id]/invite-token'
import albumsidjoinrequestsRoute from './routes/albums/[id]/join-requests'
import albumsidjoinrequestsrequestIdRoute from './routes/albums/[id]/join-requests/[requestId]'
import albumsidjoinstatsRoute from './routes/albums/[id]/join-stats'
import albumsidmembersRoute from './routes/albums/[id]/members'
import albumsidmyaccessallRoute from './routes/albums/[id]/my-access-all'
import albumsidphotosRoute from './routes/albums/[id]/photos'
import albumsidphotosphotoIdRoute from './routes/albums/[id]/photos/[photoId]'
import albumsidpublicRoute from './routes/albums/[id]/public'
import albumsidRoute from './routes/albums/[id]'
import albumsidteachersRoute from './routes/albums/[id]/teachers'
import albumsidteachersteacherIdphotoRoute from './routes/albums/[id]/teachers/[teacherId]/photo'
import albumsidteachersteacherIdphotosRoute from './routes/albums/[id]/teachers/[teacherId]/photos'
import albumsidteachersteacherIdphotosphotoIdRoute from './routes/albums/[id]/teachers/[teacherId]/photos/[photoId]'
import albumsidteachersteacherIdRoute from './routes/albums/[id]/teachers/[teacherId]'
import albumsidteachersteacherIdvideoRoute from './routes/albums/[id]/teachers/[teacherId]/video'
import albumsidunlockfeatureRoute from './routes/albums/[id]/unlock-feature'
import albumsidvideoplayRoute from './routes/albums/[id]/video-play'
import authlogoutRoute from './routes/auth/logout'
import authotpstatusRoute from './routes/auth/otp-status'
import authsendloginotpRoute from './routes/auth/send-login-otp'
import authverifyloginotpRoute from './routes/auth/verify-login-otp'
import creditscheckoutRoute from './routes/credits/checkout'
import creditspackagesRoute from './routes/credits/packages'
import creditsredeemRoute from './routes/credits/redeem'
import creditssyncinvoiceRoute from './routes/credits/sync-invoice'
import pricingRoute from './routes/pricing'
import proxyimageRoute from './routes/proxy-image'
import showcaseRoute from './routes/showcase'
import adminshowcaseRoute from './routes/admin/showcase'
import selectareaRoute from './routes/select-area'
import userjoinrequestsRoute from './routes/user/join-requests'
import usermeRoute from './routes/user/me'
import usernotificationsRoute from './routes/user/notifications'
import usernotificationsidRoute from './routes/user/notifications/[id]'
import usertransactionsRoute from './routes/user/transactions'
import webhooksxenditRoute from './routes/webhooks/xendit'

if (!process.env.VERCEL) {
    dotenv.config()
}

export async function buildApp() {
    const isProduction = process.env.NODE_ENV === 'production'

    const server = Fastify({
        logger: isProduction ? false : {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        }
    })

    // Register Plugins
    server.register(cors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
    server.register(multipart)
    server.register(cookie)

    // Register Routes
    server.register(aiEditRoutes, { prefix: '/api/admin/ai-edit' })
    server.register(admintransactionsRoute, { prefix: '/api/admin/transactions' })
    server.register(adminusersoverviewRoute, { prefix: '/api/admin/users/overview' })
    server.register(aifeaturesphotogroupRoute, { prefix: '/api/ai-features/photogroup' })
    server.register(aifeaturesphototovideoRoute, { prefix: '/api/ai-features/phototovideo' })
    server.register(aifeaturesposeRoute, { prefix: '/api/ai-features/pose' })
    server.register(aifeaturestryonRoute, { prefix: '/api/ai-features/tryon' })
    server.register(albumschecknameRoute, { prefix: '/api/albums/check-name' })
    server.register(albumsInviteJoinRoute, { prefix: '/api/albums/invite/:token/join' })
    server.register(albumsRoute, { prefix: '/api/albums' })
    server.register(albumsinvitetokenRoute, { prefix: '/api/albums/invite/:token' })
    server.register(albumsidallclassmembersRoute, { prefix: '/api/albums/:id/all-class-members' })
    server.register(albumsidcheckuserRoute, { prefix: '/api/albums/:id/check-user' })
    server.register(albumsidcheckoutRoute, { prefix: '/api/albums/:id/checkout' })
    server.register(albumsidclassesRoute, { prefix: '/api/albums/:id/classes' })
    server.register(albumsidclassesclassIdjoinasownerRoute, { prefix: '/api/albums/:id/classes/:classId/join-as-owner' })
    server.register(albumsidclassesclassIdmembersRoute, { prefix: '/api/albums/:id/classes/:classId/members' })
    server.register(albumsidclassesclassIdmembersuserIdRoute, { prefix: '/api/albums/:id/classes/:classId/members/:userId' })
    server.register(albumsidclassesclassIdmyaccessRoute, { prefix: '/api/albums/:id/classes/:classId/my-access' })
    server.register(albumsidclassesclassIdmyrequestRoute, { prefix: '/api/albums/:id/classes/:classId/my-request' })
    server.register(albumsidclassesclassIdphotoRoute, { prefix: '/api/albums/:id/classes/:classId/photo' })
    server.register(albumsidclassesclassIdrequestRoute, { prefix: '/api/albums/:id/classes/:classId/request' })
    server.register(albumsidclassesclassIdrequestsRoute, { prefix: '/api/albums/:id/classes/:classId/requests' })
    server.register(albumsidclassesclassIdrequestsrequestIdRoute, { prefix: '/api/albums/:id/classes/:classId/requests/:requestId' })
    server.register(albumsidclassesclassIdRoute, { prefix: '/api/albums/:id/classes/:classId' })
    server.register(albumsidclassesclassIdstudentsRoute, { prefix: '/api/albums/:id/classes/:classId/students' })
    server.register(albumsidclassesclassIdvideoRoute, { prefix: '/api/albums/:id/classes/:classId/video' })
    server.register(albumsidcoverRoute, { prefix: '/api/albums/:id/cover' })
    server.register(albumsidcovervideoRoute, { prefix: '/api/albums/:id/cover-video' })
    server.register(albumsidflipbookRoute, { prefix: '/api/albums/:id/flipbook' })
    server.register(albumsidinviteRoute, { prefix: '/api/albums/:id/invite' })
    server.register(albumsidinvitetokenRoute, { prefix: '/api/albums/:id/invite-token' })
    server.register(albumsidjoinrequestsRoute, { prefix: '/api/albums/:id/join-requests' })
    server.register(albumsidjoinrequestsrequestIdRoute, { prefix: '/api/albums/:id/join-requests/:requestId' })
    server.register(albumsidjoinstatsRoute, { prefix: '/api/albums/:id/join-stats' })
    server.register(albumsidmembersRoute, { prefix: '/api/albums/:id/members' })
    server.register(albumsidmyaccessallRoute, { prefix: '/api/albums/:id/my-access-all' })
    server.register(albumsidphotosRoute, { prefix: '/api/albums/:id/photos' })
    server.register(albumsidphotosphotoIdRoute, { prefix: '/api/albums/:id/photos/:photoId' })
    server.register(albumsidpublicRoute, { prefix: '/api/albums/:id/public' })
    server.register(albumsidRoute, { prefix: '/api/albums/:id' })
    server.register(albumsidteachersRoute, { prefix: '/api/albums/:id/teachers' })
    server.register(albumsidteachersteacherIdphotoRoute, { prefix: '/api/albums/:id/teachers/:teacherId/photo' })
    server.register(albumsidteachersteacherIdphotosRoute, { prefix: '/api/albums/:id/teachers/:teacherId/photos' })
    server.register(albumsidteachersteacherIdphotosphotoIdRoute, { prefix: '/api/albums/:id/teachers/:teacherId/photos/:photoId' })
    server.register(albumsidteachersteacherIdRoute, { prefix: '/api/albums/:id/teachers/:teacherId' })
    server.register(albumsidteachersteacherIdvideoRoute, { prefix: '/api/albums/:id/teachers/:teacherId/video' })
    server.register(albumsidunlockfeatureRoute, { prefix: '/api/albums/:id/unlock-feature' })
    server.register(albumsidvideoplayRoute, { prefix: '/api/albums/:id/video-play' })
    server.register(authlogoutRoute, { prefix: '/api/auth/logout' })
    server.register(authotpstatusRoute, { prefix: '/api/auth/otp-status' })
    server.register(authsendloginotpRoute, { prefix: '/api/auth/send-login-otp' })
    server.register(authverifyloginotpRoute, { prefix: '/api/auth/verify-login-otp' })
    server.register(creditscheckoutRoute, { prefix: '/api/credits/checkout' })
    server.register(creditspackagesRoute, { prefix: '/api/credits/packages' })
    server.register(creditsredeemRoute, { prefix: '/api/credits/redeem' })
    server.register(creditssyncinvoiceRoute, { prefix: '/api/credits/sync-invoice' })
    server.register(pricingRoute, { prefix: '/api/pricing' })
    server.register(proxyimageRoute, { prefix: '/api/proxy-image' })
    server.register(showcaseRoute, { prefix: '/api/showcase' })
    server.register(adminshowcaseRoute, { prefix: '/api/admin/showcase' })
    server.register(selectareaRoute, { prefix: '/api/select-area' })
    server.register(userjoinrequestsRoute, { prefix: '/api/user/join-requests' })
    server.register(usermeRoute, { prefix: '/api/user/me' })
    server.register(usernotificationsRoute, { prefix: '/api/user/notifications' })
    server.register(usernotificationsidRoute, { prefix: '/api/user/notifications/:id' })
    server.register(usertransactionsRoute, { prefix: '/api/user/transactions' })
    server.register(webhooksxenditRoute, { prefix: '/api/webhooks/xendit' })

    server.get('/', async () => {
        return { status: '🟢 API is running' }
    })

    return server
}
