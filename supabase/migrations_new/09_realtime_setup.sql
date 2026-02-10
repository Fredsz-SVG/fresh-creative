-- ============================================================================
-- 09_realtime_setup.sql
-- Realtime publication configuration for live updates
-- Tables: albums, users, credit_packages, album_classes, album_class_access, album_join_requests
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REPLICA IDENTITY CONFIGURATION
-- Set FULL replica identity for tables that need complete payload on updates/deletes
-- ----------------------------------------------------------------------------

-- Albums: Full replica identity for real-time album updates
ALTER TABLE public.albums REPLICA IDENTITY FULL;

-- Album Class Access: Full replica identity so DELETE/UPDATE payload includes class_id
-- This enables efficient refetching of members after approve/delete operations
ALTER TABLE public.album_class_access REPLICA IDENTITY FULL;

-- ----------------------------------------------------------------------------
-- REALTIME PUBLICATION
-- Add tables to supabase_realtime publication for live subscriptions
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Albums: Real-time album list updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'albums'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.albums;
  END IF;

  -- Users: Real-time credit balance updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  -- Credit Packages: Real-time pricing updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_packages;
  END IF;

  -- Album Classes: Real-time class list updates (add/edit/delete without refresh)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'album_classes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_classes;
  END IF;

  -- Album Class Access: Real-time approved student profile updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'album_class_access'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_class_access;
  END IF;

  -- Album Join Requests: Real-time registration approval flow
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'album_join_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_join_requests;
  END IF;
END $$;
