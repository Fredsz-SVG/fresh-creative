# Konfirmasi OTP Sebelum Masuk Dashboard

Setelah login (email/password atau Google), user harus memasukkan OTP yang dikirim ke email sebelum bisa masuk ke dashboard.

**Mode:** OTP selalu dikirim via Resend (jika `RESEND_API_KEY` di-set). Jika tidak di-set, endpoint OTP akan mengembalikan 503.

---

## Alur

1. User login di `/login` (email/password atau Google).
2. Redirect ke `/auth/verify-otp`.
3. Aplikasi memanggil `POST /api/auth/send-login-otp`: generate OTP + kirim via Resend.
4. User memasukkan kode 6 digit → verifikasi via API (cek tabel `login_otps`) → set cookie `otp_verified` → redirect ke `/user` atau `/admin`.
5. Cookie `otp_verified` berlaku **7 hari**.

---

## Catatan rate limit

Limit pengiriman email OTP mengikuti provider email (Resend) dan konfigurasi domain pengirim.

---

## Setup Resend (agar tidak kena limit 2 email/jam)

1. Daftar di [resend.com](https://resend.com) dan buat **API Key**.
2. **Penting – alamat pengirim dan penerima:**
   - Jika pakai **`onboarding@resend.dev`** (default): Resend **hanya mengizinkan** mengirim ke **email akun Resend Anda**. Jadi kalau user login dengan email **lain** (beda dari email daftar Resend), OTP **tidak akan sampai**.
   - Agar OTP bisa dikirim ke **semua email** (email login apa saja): verifikasi **domain Anda** di Resend (Dashboard → Domains → Add Domain), lalu set `RESEND_FROM_EMAIL` ke alamat di domain itu, mis. `noreply@domainanda.com`.
3. Di `.dev.vars` (hono-backend) tambah:
   ```
   RESEND_API_KEY=re_xxxx...
   RESEND_FROM_EMAIL=noreply@domainanda.com
   ```
   - Ganti `noreply@domainanda.com` dengan domain yang sudah diverifikasi di Resend. Untuk testing saja bisa pakai `onboarding@resend.dev` asal **email login = email akun Resend**.
4. Jalankan migration tabel OTP ke D1: `hono-backend/d1/migrations/0001_schema_core.sql` sudah memuat tabel `login_otps`.
5. Jalankan `npm install` (paket `resend` sudah di `package.json`).

Setelah itu, kirim OTP memakai Resend; limit mengikuti plan Resend (bukan 2/jam Supabase).

---

## Ringkasan

| Item | Keterangan |
|------|------------|
| Kirim OTP | `POST /api/auth/send-login-otp` – generate OTP + kirim via Resend |
| Verifikasi | `POST /api/auth/verify-login-otp` – cek tabel `login_otps` |
| Cookie | `otp_verified` (httpOnly, 7 hari) setelah OTP benar |
| Tabel (Resend) | `public.login_otps` – migration `003_login_otps.sql` |
| API | `POST /api/auth/send-login-otp`, `POST /api/auth/verify-login-otp`, `GET /api/auth/otp-status`, `GET /api/auth/logout` |
| Halaman | `/auth/verify-otp` – input OTP, kirim ulang, link kembali ke login |

---

## Troubleshooting: OTP tidak masuk

1. **Provider tidak dikonfigurasi** – Pastikan `RESEND_API_KEY` dan `RESEND_FROM_EMAIL` terisi di `.dev.vars` (hono-backend).
2. **Folder spam** – Cek folder Spam/Junk.
3. **Resend sender domain** – Pastikan domain pengirim sudah diverifikasi di Resend.
