# D1 — struktur database (sumber kebenaran)

Proyek **greenfield**: tidak perlu impor data lama. Cukup jalankan migrasi berikut sampai selesai.

| Urutan | File                                     | Isi                                                                                                                   |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1      | `migrations/0001_schema_core.sql`        | Semua tabel aplikasi (SQLite), setara model bisnis yang dulu di Postgres.                                             |
| 2      | `migrations/0002_seed_minimal.sql`       | Seed `pricing_packages`, `ai_feature_pricing`, `credit_packages`.                                                     |
| 3      | `migrations/0003_seed_ref_indonesia.sql` | 34 provinsi + 514 kab/kota (`ref_*`). Dibangkitkan dari `supabase/migrations/_legacy/` via `npm run d1:seed-wilayah`. |
| 4      | `migrations/0004_site_settings.sql`      | `site_settings` — JSON showcase landing (key `showcase`).                                                             |

**Terapkan ke lokal & remote:**

```bash
npx wrangler d1 migrations apply fresh-creative --local
npx wrangler d1 migrations apply fresh-creative --remote
```

**Konvensi:** `user_id` di D1 = string UUID sama dengan `auth.users.id` (Supabase). Boolean disimpan sebagai `INTEGER` 0/1.
