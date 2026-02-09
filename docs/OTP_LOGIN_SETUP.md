# Konfirmasi OTP Sebelum Masuk Dashboard

Setelah login (email/password atau Google), user harus memasukkan OTP yang dikirim ke email sebelum bisa masuk ke dashboard.

**Dua mode:** Jika `RESEND_API_KEY` di-set → OTP dikirim via Resend.com (tidak kena limit 2/jam Supabase). Jika tidak → OTP dikirim via Supabase Auth (limit 2 email/jam per project).

---

## Alur

1. User login di `/login` (email/password atau Google).
2. Redirect ke `/auth/verify-otp`.
3. Aplikasi memanggil `POST /api/auth/send-login-otp`: dengan Resend = generate OTP + kirim via Resend; tanpa Resend = Supabase `signInWithOtp`.
4. User memasukkan kode 6 digit → verifikasi via API (cek `login_otps` atau Supabase `verifyOtp`) → set cookie `otp_verified` → redirect ke `/user` atau `/admin`.
5. Cookie `otp_verified` berlaku **7 hari**.

---

## Rate limit email (2 email/jam) dan solusi

Default Supabase: **2 emails per hour** untuk **seluruh project** (bukan per user atau per device). Jadi:
- Akun Google A dapat OTP (1 email), akun Google B minta OTP (2 email) → masih bisa.
- Request ketiga dalam jam yang sama (ke akun mana pun, device mana pun) → **429**, OTP tidak dikirim.
- **Hapus cookies/localStorage tidak menyelesaikan** – limit ada di sisi Supabase. Tunggu sampai 1 jam lewat dari pengiriman pertama, lalu klik "Kirim ulang".

**Solusi yang dipakai di aplikasi:**

1. **Cookie OTP 7 hari** – Setelah verifikasi OTP sekali, cookie `otp_verified` berlaku 7 hari. Jadi login → logout → login lagi dalam 7 hari **tidak** kirim email OTP lagi; user langsung masuk selama cookie masih ada. Ini sangat mengurangi jumlah email.
2. **Cooldown real-time** – Saat kena rate limit (60 detik per email atau 2/jam), tampil countdown dan tombol "Kirim ulang" dinonaktifkan sampai cooldown selesai.
3. **Resend.com (disarankan)** – Set `RESEND_API_KEY` di `.env`; OTP dikirim via Resend (tidak kena limit 2/jam Supabase). Lihat bagian **Setup Resend** di bawah.

---

## Setup Resend (agar tidak kena limit 2 email/jam)

1. Daftar di [resend.com](https://resend.com) dan buat **API Key**.
2. **Penting – alamat pengirim dan penerima:**
   - Jika pakai **`onboarding@resend.dev`** (default): Resend **hanya mengizinkan** mengirim ke **email akun Resend Anda**. Jadi kalau user login dengan email **lain** (beda dari email daftar Resend), OTP **tidak akan sampai**.
   - Agar OTP bisa dikirim ke **semua email** (email login apa saja): verifikasi **domain Anda** di Resend (Dashboard → Domains → Add Domain), lalu set `RESEND_FROM_EMAIL` ke alamat di domain itu, mis. `noreply@domainanda.com`.
3. Di `.env` tambah:
   ```
   RESEND_API_KEY=re_xxxx...
   RESEND_FROM_EMAIL=noreply@domainanda.com
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   - **SUPABASE_SERVICE_ROLE_KEY** wajib saat pakai Resend: agar verifikasi OTP bisa baca/hapus row di tabel `login_otps` (tanpa ini bisa muncul "OTP tidak valid" padahal kode benar). Ambil dari Supabase Dashboard → Project Settings → API → `service_role` (rahasia, jangan expose ke client).
   - Ganti `noreply@domainanda.com` dengan domain yang sudah diverifikasi di Resend. Untuk testing saja bisa pakai `onboarding@resend.dev` asal **email login = email akun Resend**.
4. Jalankan migration tabel OTP: **Supabase Dashboard** → SQL Editor → jalankan isi `supabase/migrations/003_login_otps.sql` (atau `supabase db push`).
5. Jalankan `npm install` (paket `resend` sudah di `package.json`).

Setelah itu, kirim OTP memakai Resend; limit mengikuti plan Resend (bukan 2/jam Supabase).

---

## Yang Perlu Di-setting di Supabase (jika tidak pakai Resend)

### 1. Email template agar kirim kode 6 digit (bukan magic link)

Supabase secara default mengirim **magic link**. Agar mengirim **kode OTP 6 digit**:

1. Buka **Supabase Dashboard** → project Anda → **Authentication** → **Email Templates**.
2. Pilih template **Magic Link** (digunakan juga untuk sign-in OTP).
3. Ubah isi email agar memakai **`{{ .Token }}`** (kode 6 digit), bukan `{{ .ConfirmationURL }}`.

Contoh isi template:

```html
<h2>Kode verifikasi masuk</h2>
<p>Masukkan kode berikut di halaman verifikasi:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Kode berlaku 1 jam.</p>
```

Simpan. Setelah itu, `signInWithOtp` akan mengirim email berisi kode 6 digit.

### 2. (Opsional) Rate limit & expiry

- Rate limit permintaan OTP: default Supabase (mis. 1x per 60 detik per email).
- Masa berlaku OTP: default 1 jam (konfigurasi di Auth settings jika perlu).

---

## Ringkasan

| Item | Keterangan |
|------|------------|
| Kirim OTP | `POST /api/auth/send-login-otp` – jika Resend: generate OTP + kirim via Resend; jika tidak: Supabase `signInWithOtp` |
| Verifikasi | `POST /api/auth/verify-login-otp` – cek tabel `login_otps` (Resend) atau Supabase `verifyOtp` |
| Cookie | `otp_verified` (httpOnly, 7 hari) setelah OTP benar |
| Tabel (Resend) | `public.login_otps` – migration `003_login_otps.sql` |
| API | `POST /api/auth/send-login-otp`, `POST /api/auth/verify-login-otp`, `GET /api/auth/otp-status`, `GET /api/auth/logout` |
| Halaman | `/auth/verify-otp` – input OTP, kirim ulang, link kembali ke login |

---

## Troubleshooting: OTP / magic link tidak masuk (akun Google lain, dll.)

1. **Error 429 (Too Many Requests)** – Artinya Supabase membatasi pengiriman (rate limit). Aplikasi mendeteksi 429 dan menampilkan cooldown 60 menit di tombol "Kirim ulang (60:00)". Tunggu hitungan mundur selesai lalu klik "Kirim ulang".
2. **Cooldown per email** – Cooldown “Kirim ulang” sekarang **per email**. Jadi ganti ke akun Google lain tetap akan dikirim OTP (kecuali email itu sendiri sedang dalam cooldown).
2. **Batas 2 email/jam (project)** – Kalau dalam 1 jam sudah 2 email OTP terkirim (ke siapa saja), email berikutnya tidak dikirim sampai jam berikutnya. Cek tombol “Kirim ulang (59:00)” = cooldown 1 jam.
4. **Folder spam** – Cek folder Spam/Junk di inbox email akun Google yang dipakai.
4. **Supabase Logs** – Di Dashboard → Logs → Auth, cek apakah permintaan OTP ada dan apakah ada error “rate limit” atau “email”.
6. **Pakai Resend** – Set `RESEND_API_KEY` dan jalankan migration `003_login_otps.sql`; OTP dikirim via Resend dan tidak kena 429 (limit ikut Resend).
7. **Resend: email daftar Resend beda dari email login** – Dengan `onboarding@resend.dev`, Resend hanya mengirim ke **email akun Resend** Anda. Kalau Anda login di web dengan email lain, OTP tidak sampai. **Solusi:** verifikasi domain di Resend dan set `RESEND_FROM_EMAIL=noreply@domainanda.com` (atau alamat lain di domain yang sama).
8. **Resend: "OTP tidak valid" padahal kode benar** – Pastikan `SUPABASE_SERVICE_ROLE_KEY` di-set di `.env`. Tanpa ini, verifikasi OTP bisa gagal karena RLS memblokir baca row di tabel `login_otps`. Ambil dari Supabase Dashboard → Project Settings → API → service_role.
