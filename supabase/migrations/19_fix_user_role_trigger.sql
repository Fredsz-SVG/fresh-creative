-- ============================================================================
-- 19_fix_user_role_trigger.sql
-- Fix: User role berubah jadi 'user' saat login karena trigger tidak preserve role
-- ============================================================================

BEGIN;

-- 1. Fix trigger handle_new_user() untuk include role =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    0,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'role'), ''), 'user')
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Buat RPC function sync_user_from_auth ====================================
-- Function ini dipanggil di auth callback untuk sync data dari auth.users ke public.users
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS void AS $$
DECLARE
  _user_id uuid;
  _email text;
  _full_name text;
  _role text;
BEGIN
  -- Get current authenticated user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user data from auth.users
  SELECT 
    au.email,
    au.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'role'), ''), 'user')
  INTO 
    _email,
    _full_name,
    _role
  FROM auth.users au
  WHERE au.id = _user_id;

  -- Insert or update public.users
  INSERT INTO public.users (id, email, full_name, role, credits)
  VALUES (_user_id, _email, _full_name, _role, 0)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    -- IMPORTANT: Don't overwrite role if it's already set to admin
    role = CASE 
      WHEN public.users.role = 'admin' THEN 'admin'
      ELSE EXCLUDED.role
    END,
    updated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission =================================================
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth() TO authenticated;

COMMIT;
