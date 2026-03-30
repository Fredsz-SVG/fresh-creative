# Cloudflare D1 + R2 (hono-backend) — struktur, tanpa data lama

Fokus: **skema konsisten** di repo; **tidak** wajib migrasi data dari Postgres/Storage lama.

## Arsitektur

| Supabase (`supabase/migrations`) | Hono + Cloudflare |
|-----------------------------------|-------------------|
| Auth: `0000_supabase_auth_minimal.sql` → `public.users`, `login_otps`, RPC/trigger | **D1** (`d1/migrations/`) — semua data aplikasi |
| | **R2** — file (`wrangler.toml` → `ASSETS`) |

Detail urutan file D1: **[`d1/README.md`](d1/README.md)**.

**`user_id` di D1** = UUID string sama dengan `auth.users.id` / JWT `sub`.

---

## Setup sekali (Wrangler)

```bash
# D1 + R2 sudah dibuat → sesuaikan database_id di wrangler.toml jika perlu
npx wrangler d1 migrations apply fresh-creative --local
npx wrangler d1 migrations apply fresh-creative --remote

npx wrangler secret put SUPABASE_JWT_SECRET
```

Binding di `wrangler.toml`: `DB` (D1), `ASSETS` (R2).

### R2 = struktur sama dengan Supabase Storage

Di Supabase: **bucket** `album-photos`, **object path** mis. `uuid-album/cover.jpg`.

Di R2 (satu bucket, mis. `fresh-creative-assets`): **object key** = `album-photos/` + path yang sama persis seperti object path Supabase, mis. `album-photos/uuid-album/cover.jpg`.

Helper: `lib/storage-layout.ts` (`r2ObjectKeyFromAlbumPath`, konstanta bucket).

Upload di route masih bisa memakai Supabase sampai diganti ke `c.env.ASSETS.put(key, ...)` dengan key di atas.

---

## Kode aplikasi

Route masih bisa memanggil **Supabase** (`supabase.from` / Storage) sampai diganti bertahap ke **`c.env.DB`** dan **`c.env.ASSETS`**. Realtime Supabase diganti sesuai kebutuhan (polling, channel lain, dll.).

---

## File acuan

| Lokasi | Fungsi |
|--------|--------|
| `supabase/migrations/0000_supabase_auth_minimal.sql` | SQL Editor — auth + profil minimal |
| `hono-backend/d1/migrations/*.sql` | Skema + seed aplikasi |
| `supabase/migrations/_legacy/` | Arsip Postgres lama (referensi saja) |
| `lib/verify-supabase-jwt.ts` | Verifikasi JWT di Worker |
| **`ROUTES_EDGE.md`** | Audit route: mana yang sudah D1/R2, mana yang masih Supabase |
