# Arsip migrasi Postgres (lama)

File di folder ini **tidak** perlu dijalankan untuk setup baru.

| File | Isi |
|------|-----|
| `0000_freshcreative_full_schema.sql` | Skema monolit Postgres (album, transaksi, RLS, realtime, …) — digabung ke **D1** (`hono-backend/d1/migrations/`). |
| `0001_ref_indonesia_wilayah.sql` | Seed provinsi/kab-kota — seed setara ada di D1; API `/api/select-area` membaca **D1** jika binding `DB` aktif. |

Jika proyek Supabase Anda **sudah** memakai skema lama, **jangan** drop tabel production tanpa backup. Untuk proyek fresh: cukup jalankan `../0000_supabase_auth_minimal.sql` di SQL Editor.
