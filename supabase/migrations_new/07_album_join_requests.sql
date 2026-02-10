-- ============================================================================
-- 07_album_join_requests.sql
-- Universal album join system with approval workflow
-- Tables: album_join_requests
-- Functions: check_album_capacity, get_album_join_stats
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALBUM_JOIN_REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Form data
  student_name text NOT NULL,
  class_name text,
  email text NOT NULL,
  phone text,
  
  -- Assignment (filled when approved)
  assigned_class_id uuid REFERENCES public.album_classes(id) ON DELETE SET NULL,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_reason text,
  
  -- Prevent duplicate requests per user
  CONSTRAINT unique_album_user UNIQUE(album_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_album_join_requests_album_id ON public.album_join_requests(album_id);
CREATE INDEX IF NOT EXISTS idx_album_join_requests_user_id ON public.album_join_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_album_join_requests_status ON public.album_join_requests(album_id, status);
ALTER TABLE public.album_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.album_join_requests;
CREATE POLICY "Users can view own requests" ON public.album_join_requests FOR SELECT USING (
  auth.uid() = user_id
);

-- Users can submit requests
DROP POLICY IF EXISTS "Users can submit join requests" ON public.album_join_requests;
CREATE POLICY "Users can submit join requests" ON public.album_join_requests FOR INSERT WITH CHECK (
  status = 'pending' AND auth.uid() = user_id
);

-- Album managers can view all requests
DROP POLICY IF EXISTS "Album managers view requests" ON public.album_join_requests;
CREATE POLICY "Album managers view requests" ON public.album_join_requests FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Album managers can approve/reject requests
DROP POLICY IF EXISTS "Album managers manage requests" ON public.album_join_requests;
CREATE POLICY "Album managers manage requests" ON public.album_join_requests FOR UPDATE USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Album managers can delete requests (cleanup after moving to album_class_access)
DROP POLICY IF EXISTS "Album managers delete requests" ON public.album_join_requests;
CREATE POLICY "Album managers delete requests" ON public.album_join_requests FOR DELETE USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- ----------------------------------------------------------------------------
-- FUNCTION: Check Album Capacity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_album_capacity(_album_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _students_count int;
  _total_users int;
BEGIN
  -- Get album limit
  SELECT students_count INTO _students_count
  FROM public.albums
  WHERE id = _album_id;
  
  -- If no limit set, allow unlimited
  IF _students_count IS NULL OR _students_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Count DISTINCT users from all sources (approved requests are moved to album_class_access)
  SELECT COUNT(DISTINCT user_id) INTO _total_users
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Approved students (moved from join_requests after approval)
    SELECT user_id FROM public.album_class_access 
    WHERE album_id = _album_id AND status = 'approved' AND user_id IS NOT NULL
  ) combined_users;
  
  -- Check if under limit
  RETURN _total_users < _students_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: Get Album Join Stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_album_join_stats(_album_id uuid)
RETURNS TABLE(
  limit_count int,
  approved_count bigint,
  pending_count bigint,
  rejected_count bigint,
  available_slots int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _limit int;
  _join_pending bigint := 0;
  _join_rejected bigint := 0;
  _total_approved bigint := 0;
BEGIN
  SELECT students_count INTO _limit FROM public.albums WHERE id = _album_id;
  
  -- Count pending and rejected from join_requests table only (temporary records)
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0)
  INTO _join_pending, _join_rejected
  FROM public.album_join_requests
  WHERE album_id = _album_id;
  
  -- Count DISTINCT approved users from all permanent sources
  SELECT COUNT(DISTINCT user_id) INTO _total_approved
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Approved students (permanent records after approval)
    SELECT user_id FROM public.album_class_access 
    WHERE album_id = _album_id AND status = 'approved' AND user_id IS NOT NULL
  ) combined_users;
  
  RETURN QUERY
  SELECT 
    _limit as limit_count,
    _total_approved as approved_count,
    _join_pending as pending_count,
    _join_rejected as rejected_count,
    CASE 
      WHEN _limit IS NULL OR _limit = 0 THEN 999999
      ELSE GREATEST(0, _limit - _total_approved::int)
    END as available_slots;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGER: Prevent approval when album is full
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_album_full_on_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only check when changing from pending to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NOT public.check_album_capacity(NEW.album_id) THEN
      RAISE EXCEPTION 'Album sudah penuh. Tidak bisa menerima siswa lagi.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_album_full ON public.album_join_requests;
CREATE TRIGGER trigger_check_album_full
  BEFORE UPDATE ON public.album_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_album_full_on_approve();
