import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAuth, logger } from './middleware';

// ── Admin ──
import adminAiEdit from './routes/admin/ai-edit';
import adminShowcase from './routes/admin/showcase';
import adminTransactions from './routes/admin/transactions';
import adminUsersOverview from './routes/admin/users-overview';

// ── AI Features ──
import aiFeaturesPhotogroup from './routes/ai-features/photogroup';
import aiFeaturesPhototovideo from './routes/ai-features/phototovideo';
import aiFeaturesPose from './routes/ai-features/pose';
import aiFeaturesTryon from './routes/ai-features/tryon';

// ── Albums (root) ──
import albums from './routes/albums/albums';
import albumsCheckName from './routes/albums/check-name';
import albumsInviteToken from './routes/albums/invite-token';
import albumsInviteTokenGet from './routes/albums/invite-token-get';
import albumsInviteTokenJoin from './routes/albums/invite-token-join';

// ── Albums/:id ──
import albumsId from './routes/albums/id/index';
import albumsIdAllClassMembers from './routes/albums/id/all-class-members';
import albumsIdCheckUser from './routes/albums/id/check-user';
import albumsIdCheckout from './routes/albums/id/checkout';
import albumsIdCover from './routes/albums/id/cover';
import albumsIdCoverVideo from './routes/albums/id/cover-video';
import albumsIdFlipbook from './routes/albums/id/flipbook';
import albumsIdInvite from './routes/albums/id/invite';
import albumsIdInviteToken from './routes/albums/id/invite-token';
import albumsIdJoinRequests from './routes/albums/id/join-requests';
import albumsIdJoinRequestsRequestId from './routes/albums/id/join-requests-requestId';
import albumsIdJoinStats from './routes/albums/id/join-stats';
import albumsIdMembers from './routes/albums/id/members';
import albumsIdMyAccessAll from './routes/albums/id/my-access-all';
import albumsIdPhotos from './routes/albums/id/photos/index';
import albumsIdPhotosPhotoId from './routes/albums/id/photos/photoId';
import albumsIdPublic from './routes/albums/id/public';
import albumsIdUnlockFeature from './routes/albums/id/unlock-feature';
import albumsIdVideoPlay from './routes/albums/id/video-play';

// ── Albums/:id/classes ──
import albumsIdClasses from './routes/albums/id/classes/index';
import albumsIdClassesClassId from './routes/albums/id/classes/classId';
import albumsIdClassesClassIdJoinAsOwner from './routes/albums/id/classes/classId-join-as-owner';
import albumsIdClassesClassIdMembers from './routes/albums/id/classes/classId-members';
import albumsIdClassesClassIdMembersUserId from './routes/albums/id/classes/classId-members-userId';
import albumsIdClassesClassIdMyAccess from './routes/albums/id/classes/classId-my-access';
import albumsIdClassesClassIdMyRequest from './routes/albums/id/classes/classId-my-request';
import albumsIdClassesClassIdPhoto from './routes/albums/id/classes/classId-photo';
import albumsIdClassesClassIdRequest from './routes/albums/id/classes/classId-request';
import albumsIdClassesClassIdRequests from './routes/albums/id/classes/requests/index';
import albumsIdClassesClassIdRequestsRequestId from './routes/albums/id/classes/requests/requestId';
import albumsIdClassesClassIdStudents from './routes/albums/id/classes/classId-students';
import albumsIdClassesClassIdVideo from './routes/albums/id/classes/classId-video';

// ── Albums/:id/teachers ──
import albumsIdTeachers from './routes/albums/id/teachers/index';
import albumsIdTeachersTeacherId from './routes/albums/id/teachers/teacherId';
import albumsIdTeachersTeacherIdPhoto from './routes/albums/id/teachers/teacherId-photo';
import albumsIdTeachersTeacherIdPhotos from './routes/albums/id/teachers/teacherId-photos';
import albumsIdTeachersTeacherIdPhotosPhotoId from './routes/albums/id/teachers/teacherId-photos-photoId';
import albumsIdTeachersTeacherIdVideo from './routes/albums/id/teachers/teacherId-video';

// ── Auth ──
import authLogout from './routes/auth/logout';
import authOtpStatus from './routes/auth/otp-status';
import authSendLoginOtp from './routes/auth/send-login-otp';
import authVerifyLoginOtp from './routes/auth/verify-login-otp';

// ── Credits ──
import creditsCheckout from './routes/credits/checkout';
import creditsPackages from './routes/credits/packages';
import creditsRedeem from './routes/credits/redeem';
import creditsSyncInvoice from './routes/credits/sync-invoice';

// ── Misc ──
import pricing from './routes/pricing';
import proxyImage from './routes/proxy-image';
import selectArea from './routes/select-area';
import showcase from './routes/showcase';

// ── User ──
import userJoinRequests from './routes/user/join-requests';
import userMe from './routes/user/me';
import userNotifications from './routes/user/notifications/index';
import userNotificationsId from './routes/user/notifications/[id]';
import userTransactions from './routes/user/transactions/index';

// ── Webhooks ──
import webhooksXendit from './routes/webhooks/xendit';

// ══════════════════════════════════════════════════════
// App setup
// ══════════════════════════════════════════════════════
const app = new Hono();

// Global middleware
app.use('*', logger)
app.use('*', async (c, next) => {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).env = c.env;
  }
  await next();
});

// CORS — izinkan frontend (Vercel) mengakses backend (Cloudflare Workers)
app.use('*', cors({
  origin: (origin, c) => {
    const appUrl = (c.env as any)?.NEXT_PUBLIC_APP_URL || ''
    const allowed = [
      appUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ].filter(Boolean)
    if (allowed.includes(origin)) return origin
    if (origin && origin.endsWith('.vercel.app')) return origin
    return undefined as unknown as string
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}))

// ══════════════════════════════════════════════════════
// Register ALL routes
// ══════════════════════════════════════════════════════

// Admin
app.route('/api/admin/ai-edit', adminAiEdit);
app.route('/api/admin/showcase', adminShowcase);
app.route('/api/admin/transactions', adminTransactions);
app.route('/api/admin/users/overview', adminUsersOverview);

// AI Features
app.route('/api/ai-features/photogroup', aiFeaturesPhotogroup);
app.route('/api/ai-features/phototovideo', aiFeaturesPhototovideo);
app.route('/api/ai-features/pose', aiFeaturesPose);
app.route('/api/ai-features/tryon', aiFeaturesTryon);

// Albums root
app.route('/api/albums', albums);
app.route('/api/albums/check-name', albumsCheckName);
app.route('/api/albums/invite', albumsInviteTokenGet);
app.route('/api/albums/invite', albumsInviteTokenJoin);
app.route('/api/albums/invite-token', albumsInviteToken);

// Albums/:id - order matters: more specific paths first
app.route('/api/albums/:id/all-class-members', albumsIdAllClassMembers);
app.route('/api/albums/:id/check-user', albumsIdCheckUser);
app.route('/api/albums/:id/checkout', albumsIdCheckout);
app.route('/api/albums/:id/cover-video', albumsIdCoverVideo);
app.route('/api/albums/:id/cover', albumsIdCover);
app.route('/api/albums/:id/flipbook', albumsIdFlipbook);
app.route('/api/albums/:id/invite-token', albumsIdInviteToken);
app.route('/api/albums/:id/invite', albumsIdInvite);
app.route('/api/albums/:id/join-requests/:requestId', albumsIdJoinRequestsRequestId);
app.route('/api/albums/:id/join-requests', albumsIdJoinRequests);
app.route('/api/albums/:id/join-stats', albumsIdJoinStats);
app.route('/api/albums/:id/members', albumsIdMembers);
app.route('/api/albums/:id/my-access-all', albumsIdMyAccessAll);
app.route('/api/albums/:id/photos/:photoId', albumsIdPhotosPhotoId);
app.route('/api/albums/:id/photos', albumsIdPhotos);
app.route('/api/albums/:id/public', albumsIdPublic);
app.route('/api/albums/:id/unlock-feature', albumsIdUnlockFeature);
app.route('/api/albums/:id/video-play', albumsIdVideoPlay);

// Albums/:id/classes
app.route('/api/albums/:id/classes/:classId/join-as-owner', albumsIdClassesClassIdJoinAsOwner);
app.route('/api/albums/:id/classes/:classId/members/:userId', albumsIdClassesClassIdMembersUserId);
app.route('/api/albums/:id/classes/:classId/members', albumsIdClassesClassIdMembers);
app.route('/api/albums/:id/classes/:classId/my-access', albumsIdClassesClassIdMyAccess);
app.route('/api/albums/:id/classes/:classId/my-request', albumsIdClassesClassIdMyRequest);
app.route('/api/albums/:id/classes/:classId/photo', albumsIdClassesClassIdPhoto);
app.route('/api/albums/:id/classes/:classId/request', albumsIdClassesClassIdRequest);
app.route('/api/albums/:id/classes/:classId/requests/:requestId', albumsIdClassesClassIdRequestsRequestId);
app.route('/api/albums/:id/classes/:classId/requests', albumsIdClassesClassIdRequests);
app.route('/api/albums/:id/classes/:classId/students', albumsIdClassesClassIdStudents);
app.route('/api/albums/:id/classes/:classId/video', albumsIdClassesClassIdVideo);
app.route('/api/albums/:id/classes/:classId', albumsIdClassesClassId);
app.route('/api/albums/:id/classes', albumsIdClasses);

// Albums/:id/teachers
app.route('/api/albums/:id/teachers/:teacherId/photo', albumsIdTeachersTeacherIdPhoto);
app.route('/api/albums/:id/teachers/:teacherId/photos/:photoId', albumsIdTeachersTeacherIdPhotosPhotoId);
app.route('/api/albums/:id/teachers/:teacherId/photos', albumsIdTeachersTeacherIdPhotos);
app.route('/api/albums/:id/teachers/:teacherId/video', albumsIdTeachersTeacherIdVideo);
app.route('/api/albums/:id/teachers/:teacherId', albumsIdTeachersTeacherId);
app.route('/api/albums/:id/teachers', albumsIdTeachers);

// Albums/:id (catch-all for album by id — MUST be last in album group)
app.route('/api/albums/:id', albumsId);

// Auth
app.route('/api/auth/logout', authLogout);
app.route('/api/auth/otp-status', authOtpStatus);
app.route('/api/auth/send-login-otp', authSendLoginOtp);
app.route('/api/auth/verify-login-otp', authVerifyLoginOtp);

// Credits
app.route('/api/credits/checkout', creditsCheckout);
app.route('/api/credits/packages', creditsPackages);
app.route('/api/credits/redeem', creditsRedeem);
app.route('/api/credits/sync-invoice', creditsSyncInvoice);

// Misc
app.route('/api/pricing', pricing);
app.route('/api/proxy-image', proxyImage);
app.route('/api/select-area', selectArea);
app.route('/api/showcase', showcase);

// User
app.route('/api/user/join-requests', userJoinRequests);
app.route('/api/user/me', userMe);
app.route('/api/user/notifications/:id', userNotificationsId);
app.route('/api/user/notifications', userNotifications);
app.route('/api/user/transactions', userTransactions);

// Webhooks
app.route('/api/webhooks/xendit', webhooksXendit);

// Health check
app.get('/', (c) => c.json({ status: '🟢 API is running (Hono)' }));

export default app;
