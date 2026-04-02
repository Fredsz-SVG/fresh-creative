-- Performance indexes for yearbook-heavy endpoints.

-- Frequent filters in /api/albums/:id and /api/albums/:id/all-class-members
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_id ON album_class_access(album_id);
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_class ON album_class_access(album_id, class_id);
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_status ON album_class_access(album_id, status);
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_user_status ON album_class_access(album_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_class_student ON album_class_access(album_id, class_id, student_name);

-- Frequent lookups in /api/albums/:id/unlock-feature
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_user_album_feature ON feature_unlocks(user_id, album_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_album_feature ON feature_unlocks(album_id, feature_type);

-- Frequent lookups in /api/albums/:id/flipbook
CREATE INDEX IF NOT EXISTS idx_manual_flipbook_pages_album_page ON manual_flipbook_pages(album_id, page_number);
CREATE INDEX IF NOT EXISTS idx_flipbook_video_hotspots_page_id ON flipbook_video_hotspots(page_id);

-- Access checks used in multiple album admin endpoints
CREATE INDEX IF NOT EXISTS idx_album_members_album_user ON album_members(album_id, user_id);
CREATE INDEX IF NOT EXISTS idx_album_members_album_user_role ON album_members(album_id, user_id, role);
