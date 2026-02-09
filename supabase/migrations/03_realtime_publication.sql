-- Enable Realtime: approval flow + daftar group + profil card
-- album_class_access / album_class_requests: approve/disapprove + hapus profil langsung muncul
-- album_classes: tambah/edit/hapus group tanpa refresh
-- REPLICA IDENTITY FULL agar payload.old pada DELETE/UPDATE berisi class_id (untuk refetch member)
ALTER TABLE public.album_class_access REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_class_access') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_class_access;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_class_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_class_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_classes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_classes;
  END IF;
END $$;
