# Fresh Creative SaaS

Phygital yearbook platform dengan AI Virtual Try-On untuk sekolah di Indonesia.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI Processing**: Replicate API
- **Payment**: Xendit (Indonesia)
- **Deployment**: Vercel

## Getting Started

Install dependencies:
```bash
npm install
```## Supabase Auth (Signup & Email Konfirmasi)- **Redirect URL**: Di Supabase Dashboard → Authentication → URL Configuration, tambahkan **Redirect URL**: `http://localhost:3001/auth/callback` (dan URL production bila ada). Link konfirmasi email akan mengarah ke `/auth/callback`, lalu app mengarahkan user ke `/user` atau `/admin`.
- **Link kadaluarsa (otp_expired)**: Jika user klik link konfirmasi yang sudah kadaluarsa, mereka akan diarahkan ke halaman login dengan pesan jelas. Bisa daftar ulang atau minta kirim ulang email konfirmasi dari Supabase (Resend).
- **Mode development (tanpa konfirmasi email)**: Supabase Dashboard → Authentication → Providers → Email → **Confirm email** matikan (OFF). Setelah signup, user langsung dianggap terkonfirmasi dan bisa login tanpa klik link di email. Berguna untuk development lokal.## Migrasi DB (tabel `public.users`)Kalau pakai **Supabase hosted** (bukan `supabase start` lokal), CLI `supabase db push` butuh project dilink dulu. Cara paling simpel: jalankan SQL migrasi lewat Dashboard.1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project.
2. **SQL Editor** → **New query**.
3. Salin isi file `supabase/migrations/002_public_users_and_trigger.sql`, paste, lalu **Run**.Setelah itu tabel `public.users` dan trigger/sync user siap. Untuk pakai CLI: jalankan `npx supabase link` (masukkan project ref dan database password dari Dashboard → Settings → General), lalu `npx supabase db push`.
