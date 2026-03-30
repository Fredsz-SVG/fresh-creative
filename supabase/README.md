# Supabase — hanya auth

## SQL Editor (proyek baru)

Jalankan **`migrations/0000_supabase_auth_minimal.sql`** sekali:

- `public.users` — role, kredit, suspend (sinkron dengan auth)
- `login_otps` — OTP email custom
- Trigger `handle_new_user` + RPC `sync_user_from_auth` (auth callback)

**Showcase landing** (`/api/showcase`, admin) disimpan di **D1** (`site_settings`) — lihat `hono-backend/d1/migrations/0004_site_settings.sql`.

**Data bisnis** lain (album, transaksi, wilayah, dll.) ada di **D1**. Lihat `hono-backend/d1/README.md`.

## Arsip

Folder **`migrations/_legacy/`** — skema Postgres monolit + seed wilayah lama; **tidak** dijalankan untuk setup baru. Seed wilayah aktif memakai migrasi D1 `0003_seed_ref_indonesia.sql`.
