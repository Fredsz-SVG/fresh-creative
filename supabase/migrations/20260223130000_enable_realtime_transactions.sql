-- Enable Realtime untuk tabel transactions (riwayat user & admin).
-- Jalankan migrasi ini ATAU aktifkan manual: Dashboard → Database → Replication → supabase_realtime → centang "transactions".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
END $$;
