-- Menghapus skema tabel user_assets (File Saya) karena fitur sudah tidak digunakan
BEGIN;
  -- 1. Hapus Tabel relasi dan indeksnya
  DROP TABLE IF EXISTS public.user_assets CASCADE;

  -- 2. Hapus referensi dari Realtime Publication
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_assets') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.user_assets;
    END IF;
  END $$;

  -- CATATAN PENTING: 
  -- Error "Direct deletion from storage tables is not allowed" terjadi karena Supabase melarang 
  -- penghapusan bucket via SQL (DELETE FROM storage.buckets) demi keamanan data.
  
  -- CARA MENGHAPUS BUCKET:
  -- Silakan buka Dashboard Supabase Anda -> Menu 'Storage' -> Klik titik tiga di sebelah 'user_files' -> Pilih 'Delete bucket'.
COMMIT;
