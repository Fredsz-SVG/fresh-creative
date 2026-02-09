-- New album join request system
-- Users join album via universal link, then admin assigns to class

CREATE TABLE IF NOT EXISTS public.album_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- nullable if not registered yet
  
  -- Form data from join link
  student_name text NOT NULL,
  class_name text, -- What user inputs (e.g., "XII IPA 1")
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
  
  -- Prevent duplicate requests
  CONSTRAINT unique_album_email UNIQUE(album_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_album_join_requests_album_id ON public.album_join_requests(album_id);
CREATE INDEX IF NOT EXISTS idx_album_join_requests_user_id ON public.album_join_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_album_join_requests_status ON public.album_join_requests(album_id, status);
CREATE INDEX IF NOT EXISTS idx_album_join_requests_email ON public.album_join_requests(album_id, email);

-- Enable RLS
ALTER TABLE public.album_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can read their own request
DROP POLICY IF EXISTS "Users can view own requests" ON public.album_join_requests;
CREATE POLICY "Users can view own requests" ON public.album_join_requests FOR SELECT USING (
  auth.uid() = user_id
  OR (user_id IS NULL AND email = auth.jwt()->>'email')
);

-- Authenticated users can insert requests (if album not full)
DROP POLICY IF EXISTS "Users can submit join requests" ON public.album_join_requests;
CREATE POLICY "Users can submit join requests" ON public.album_join_requests FOR INSERT WITH CHECK (
  status = 'pending'
  AND (
    -- Either authenticated and user_id matches
    (user_id IS NOT NULL AND auth.uid() = user_id)
    -- Or unauthenticated with email
    OR (user_id IS NULL AND email IS NOT NULL)
  )
);

-- Album owners/admins/global admins can view all requests for their albums
DROP POLICY IF EXISTS "Album managers view requests" ON public.album_join_requests;
CREATE POLICY "Album managers view requests" ON public.album_join_requests FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (
    SELECT 1 FROM public.album_members m 
    WHERE m.album_id = album_join_requests.album_id 
    AND m.user_id = auth.uid() 
    AND m.role = 'admin'
  )
);

-- Album owners/admins/global admins can approve/reject requests
DROP POLICY IF EXISTS "Album managers manage requests" ON public.album_join_requests;
CREATE POLICY "Album managers manage requests" ON public.album_join_requests FOR UPDATE USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (
    SELECT 1 FROM public.album_members m 
    WHERE m.album_id = album_join_requests.album_id 
    AND m.user_id = auth.uid() 
    AND m.role = 'admin'
  )
);

-- Function to check album capacity
CREATE OR REPLACE FUNCTION public.check_album_capacity(_album_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _students_count int;
  _approved_count int;
BEGIN
  -- Get album limit
  SELECT students_count INTO _students_count
  FROM public.albums
  WHERE id = _album_id;
  
  -- If no limit set, allow unlimited
  IF _students_count IS NULL OR _students_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Count approved requests
  SELECT COUNT(*) INTO _approved_count
  FROM public.album_join_requests
  WHERE album_id = _album_id AND status = 'approved';
  
  -- Check if under limit
  RETURN _approved_count < _students_count;
END;
$$;

-- Function to get album join stats
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
BEGIN
  SELECT students_count INTO _limit FROM public.albums WHERE id = _album_id;
  
  RETURN QUERY
  SELECT 
    _limit as limit_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    CASE 
      WHEN _limit IS NULL OR _limit = 0 THEN 999999
      ELSE GREATEST(0, _limit - COUNT(*) FILTER (WHERE status = 'approved')::int)
    END as available_slots
  FROM public.album_join_requests
  WHERE album_id = _album_id;
END;
$$;

-- Trigger to prevent approval when album is full
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
