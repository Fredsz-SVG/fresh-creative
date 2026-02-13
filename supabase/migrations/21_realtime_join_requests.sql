-- Enable Realtime for the new join requests table
-- This allows the server to broadcast changes to all connected devices instantly

ALTER TABLE public.album_join_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_join_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_join_requests;
  END IF;
END $$;
