-- Add suspension flag to users table so admin can block login
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON public.users(is_suspended);

COMMIT;

