# Route backend — status D1 / R2 / edge

Worker = **edge** (Cloudflare). **Tanpa** hop ke Postgres Supabase = lebih cepat untuk read/write lokal D1.

## Helper (gunakan di route baru)

| File                                                     | Fungsi                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `lib/edge-env.ts`                                        | `getD1(c)`, `getAssets(c)`, `hasJwtSecret(c)`               |
| `lib/showcase-d1.ts`                                     | Showcase `site_settings`                                    |
| `lib/storage-layout.ts`                                  | Key R2 = `album-photos/...` (mirror Supabase bucket + path) |
| `lib/r2-assets.ts`                                       | `putAlbumPhoto`, `getAlbumObject`, `deleteAlbumObject`      |
| `lib/get-access-token.ts` + `lib/verify-supabase-jwt.ts` | Verifikasi JWT di edge tanpa `getUser()`                    |

**Saran:** set `SUPABASE_JWT_SECRET` di Worker; untuk route berat auth panggil `getAuthUserId` dari `middleware.ts` setelah `requireAuthJwt` (opsional).

---

## Sudah memakai D1 (tanpa Supabase Postgres untuk data tersebut)

| Route                                       | Keterangan                                  |
| ------------------------------------------- | ------------------------------------------- |
| `GET /api/select-area`                      | `ref_*` di D1                               |
| `GET /api/showcase`, admin showcase         | `site_settings` + enrichment `albums` di D1 |
| `GET/POST/PUT/DELETE /api/pricing`          | `pricing_packages`                          |
| `GET/POST/PUT/DELETE /api/credits/packages` | `credit_packages`                           |

---

## Masih Supabase Postgres (`supabase.from`) — migrasi bertahap ke D1

Hampir semua **`routes/albums/**`**, **`user/**`**, **`admin/**`** (kecuali showcase), **`auth/**`** (kecuali baca `users`/`login_otps`), **`credits/**`** (checkout, redeem, sync-invoice), **`webhooks/**`**, **`ai-features/**`**, **`proxy-image`\*\*, dll.

Untuk memindahkan: ganti query dengan `c.env.DB.prepare(...)` sesuai skema `d1/migrations/0001_schema_core.sql`, pertahankan auth lewat Supabase JWT + cek `users` (Supabase atau D1).

---

## Masih Supabase Storage (`storage.from('album-photos')`) — bisa ke R2

Gunakan `lib/r2-assets.ts` + binding `ASSETS`. URL publik perlu **route proxy** Worker atau domain R2 publik; simpan URL yang konsisten di kolom DB.

File yang mengunggah/unduh storage (grep `storage.from`):

- `albums/id/cover.ts`, `cover-video.ts`
- `albums/id/photos/index.ts`, `photos/photoId.ts`
- `albums/id/classes/classId-photo.ts`, `classId-video.ts`
- `albums/id/teachers/teacherId-photo.ts`, `teacherId-photos.ts`, `teacherId-video.ts`
- `albums/id/video-play.ts` (download)

---

## Ringkas

| Layer                                                | Status                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Auth session                                         | Supabase (wajib)                                                       |
| Data pricing / kredit paket / ref wilayah / showcase | **D1** pada route di atas                                              |
| Album, transaksi, notifikasi, …                      | Masih **Supabase** → rencanakan ke **D1**                              |
| File foto/video                                      | Masih **Supabase Storage** → **R2** dengan key `lib/storage-layout.ts` |

Setelah semua data di D1, Supabase hanya dipakai untuk **Auth** + opsional mirror **`public.users`** sampai profil penuh pindah ke D1.
