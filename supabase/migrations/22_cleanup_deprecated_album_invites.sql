-- OPTIONAL: Cleanup deprecated album_invites system
-- This migration removes the old invite token system for admin/member invites
-- 
-- CURRENT SYSTEM (Correct Flow):
-- 1. Student registers via token → album_join_requests (pending)
-- 2. Owner approves → inserts to BOTH:
--    - album_class_access (for class membership)
--    - album_members (role='member' for team management)
-- 3. Owner can promote to admin in Team sidebar via "Jadikan Admin" button
--    - Updates album_members.role via PATCH /api/albums/[id]/members
-- 
-- Owner automatically has owner permissions from albums.user_id (no need for album_members entry)

-- WARNING: Only run this if you're sure you don't have any active admin/member invite links
-- Student invites use albums.student_invite_token (separate system)

-- Drop policies first
DROP POLICY IF EXISTS "Public read invites" ON public.album_invites;
DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;

-- Drop indexes
DROP INDEX IF EXISTS idx_album_invites_token;

-- Drop table
DROP TABLE IF EXISTS public.album_invites;

-- Note: The following API endpoints can also be removed:
-- - /api/albums/[id]/invite/route.ts (POST - create admin/member invite)
-- - /api/albums/invite/[token]/join/route.ts (POST - join via invite token)
-- These endpoints are no longer called from the UI
