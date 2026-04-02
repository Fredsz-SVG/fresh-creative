-- Hot-path indexes for frequently hit API endpoints.
-- Target endpoints:
-- - /api/user/notifications
-- - /api/albums (member and approved access lookups)

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_album_members_user_album
ON album_members(user_id, album_id);

CREATE INDEX IF NOT EXISTS idx_album_class_access_user_status_album
ON album_class_access(user_id, status, album_id);
