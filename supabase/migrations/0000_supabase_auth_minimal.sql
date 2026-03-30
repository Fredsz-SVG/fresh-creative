-- ============================================================================
-- Supabase — jalankan SATU FILE ini di SQL Editor (proyek baru / auth-only).
-- Data bisnis & referensi wilayah: D1 — lihat hono-backend/d1/migrations/
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profil publik (mirror auth.users) — dipakai Hono untuk role, kredit, suspend
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  full_name text,
  credits integer DEFAULT 0,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON public.users(is_suspended);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_is_global_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Users can read own row" ON public.users;
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.check_is_global_admin());

-- ----------------------------------------------------------------------------
-- 2. OTP login (email custom) — dipakai routes auth
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_otps (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON public.login_otps(expires_at);

ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own login OTP" ON public.login_otps;
CREATE POLICY "Users can manage own login OTP" ON public.login_otps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Trigger: user baru → baris public.users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    0,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'role'), ''), 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. RPC — dipanggil dari app/auth/callback/route.ts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _email text;
  _full_name text;
  _role text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    au.email,
    au.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'role'), ''), 'user')
  INTO _email, _full_name, _role
  FROM auth.users au
  WHERE au.id = _user_id;

  INSERT INTO public.users (id, email, full_name, role, credits)
  VALUES (_user_id, _email, _full_name, _role, 0)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    role = CASE WHEN public.users.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_from_auth() TO authenticated;

-- Selesai. (Tanpa tabel album, transaksi, ref wilayah — itu di D1.)
