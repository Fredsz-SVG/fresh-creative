-- Fix album join stats to count existing approved users from album_class_access
-- This ensures owner and existing members are counted in the statistics

-- Update check_album_capacity to count from album_class_access (approved records are moved here after approval)
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
  
  -- Count DISTINCT users from all sources (join_requests removed after approval)
  SELECT COUNT(DISTINCT user_id) INTO _total_users
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper, dll)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Users yang sudah approved di class access (moved here after approval)
    SELECT user_id FROM public.album_class_access 
    WHERE album_id = _album_id AND status = 'approved' AND user_id IS NOT NULL
  ) combined_users;
  
  -- Check if under limit
  RETURN _total_users < _students_count;
END;
$$;

-- Update get_album_join_stats to count from real tables
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
  
  -- Count pending and rejected from join requests table only
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0)
  INTO _join_pending, _join_rejected
  FROM public.album_join_requests
  WHERE album_id = _album_id;
  
  -- Count DISTINCT approved users from all sources (approved requests are deleted from join_requests)
  SELECT COUNT(DISTINCT user_id) INTO _total_approved
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper, dll)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Users yang sudah approved di class access
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
