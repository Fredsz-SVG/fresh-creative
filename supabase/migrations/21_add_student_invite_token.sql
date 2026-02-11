-- Add student invite token fields to albums table
-- Note: This is for STUDENT registration only, not for co-owner/admin invites
-- Admin/member management now works through ROLE PROMOTION:
--   1. Student registers via student invite token
--   2. Owner approves → becomes member in album_members
--   3. Owner can promote to admin via UI button (updates album_members.role)
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS student_invite_token text,
  ADD COLUMN IF NOT EXISTS student_invite_expires_at timestamptz;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_albums_student_invite_token 
  ON public.albums(student_invite_token) 
  WHERE student_invite_token IS NOT NULL;

-- Note: Token will be used for student registration via /invite/[token] route
-- Expired tokens should be checked in the application layer

-- DEPRECATED SYSTEM: album_invites table is no longer used
-- Old flow: Generate invite token → User clicks link → Joins as admin/member
-- New flow: User joins as student → Owner promotes to admin if needed
-- Migration to drop album_invites can be created separately if cleanup is needed
