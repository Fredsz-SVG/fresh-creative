-- Mengaktifkan Realtime Supabase untuk SEMUA tabel di public schema (transactions, albums, users, dll)
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Buat publication jika belum ada (opsional, Supabase biasa sudah punya)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Loop melalui semua tabel yang ada di skema 'public' dan tambahkan ke realtime
  FOR rec IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rec.tablename);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Abaikan secara diam-diam jika tabel sudah pernah didaftarkan
      WHEN OTHERS THEN
        RAISE NOTICE 'Gagal mendaftarkan tabel %: %', rec.tablename, SQLERRM;
    END;
  END LOOP;
END $$;
