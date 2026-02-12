-- ============================================================================
-- 10_performance_indexes.sql
-- Performance optimization: composite indexes for frequently queried patterns
-- Run this migration to speed up API response times
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALBUM_CLASS_ACCESS — Most queried table
-- ----------------------------------------------------------------------------

-- Pattern: .eq('album_id', x).eq('status', 'approved')
-- Used in: GET /albums/[id] (student counts), GET /albums/[id]/members,
--          check_album_capacity(), get_album_join_stats(), RLS policies
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_status
  ON public.album_class_access(album_id, status);

-- Pattern: .eq('class_id', x).in('status', ['approved','pending'])
-- Used in: GET /albums/[id]/classes/[classId]/members
CREATE INDEX IF NOT EXISTS idx_album_class_access_class_status
  ON public.album_class_access(class_id, status);

-- Pattern: .eq('album_id', x).eq('user_id', y).eq('status', 'approved')
-- Used in: Auth checks (RLS policies, check-user, my-access)
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_user_status
  ON public.album_class_access(album_id, user_id, status);

-- ----------------------------------------------------------------------------
-- ALBUM_MEMBERS — Queried on every authenticated request for role checks
-- ----------------------------------------------------------------------------

-- Pattern: .eq('album_id', x).eq('user_id', y) — auth/role lookups
-- Note: PK is (album_id, user_id) so this is already covered, but adding
-- a covering index with `role` avoids heap lookups for admin checks
CREATE INDEX IF NOT EXISTS idx_album_members_album_user_role
  ON public.album_members(album_id, user_id, role);

-- ----------------------------------------------------------------------------
-- ALBUM_CLASSES — Sorted class listing
-- ----------------------------------------------------------------------------

-- Pattern: .eq('album_id', x).order('sort_order', asc)
-- Used in: GET /albums/[id] (class list with sort)
CREATE INDEX IF NOT EXISTS idx_album_classes_album_sort
  ON public.album_classes(album_id, sort_order);

-- ----------------------------------------------------------------------------
-- ALBUMS — Ownership + status checks
-- ----------------------------------------------------------------------------

-- Pattern: .eq('id', x) then check user_id (ownership check on every request)
-- The PK covers .eq('id'), but a partial index for status helps listing queries
CREATE INDEX IF NOT EXISTS idx_albums_status
  ON public.albums(status) WHERE status IS NOT NULL;

-- Pattern: .eq('user_id', x).eq('type', y) — user album listing
CREATE INDEX IF NOT EXISTS idx_albums_user_type
  ON public.albums(user_id, type);

-- ----------------------------------------------------------------------------
-- ALBUM_JOIN_REQUESTS — Filtered listing
-- ----------------------------------------------------------------------------

-- Pattern: .eq('album_id', x).eq('user_id', y) — duplicate check
CREATE INDEX IF NOT EXISTS idx_album_join_requests_album_user
  ON public.album_join_requests(album_id, user_id);

-- ----------------------------------------------------------------------------
-- ANALYZE tables to update query planner statistics
-- ----------------------------------------------------------------------------
ANALYZE public.albums;
ANALYZE public.album_members;
ANALYZE public.album_classes;
ANALYZE public.album_class_access;
ANALYZE public.album_teachers;
ANALYZE public.album_teacher_photos;
ANALYZE public.album_join_requests;
