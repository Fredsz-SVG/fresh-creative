# Setup Login & Sign Up dengan Google

Aplikasi sudah mendukung tombol **Login dengan Google** dan **Daftar dengan Google**. Agar berfungsi, Anda perlu mengatur **Google Cloud Console** dan **Supabase Dashboard**.

---

## 1. Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih atau buat project.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. Jika diminta, set **OAuth consent screen**:
   - Pilih **External** (atau Internal untuk workspace saja).
   - Isi **App name**, **User support email**, **Developer contact**.
   - Tambah **Scopes** jika perlu (untuk login dasar, default cukup).
   - Simpan.
5. Buat **OAuth 2.0 Client ID**:
   - Application type: **Web application**.
   - Name: misalnya `Fresh Creative SaaS`.
   - **Authorized redirect URIs** — tambahkan **persis**:
     ```
     https://<PROJECT_REF>.supabase.co/auth/v1/callback
     ```
     https://fiunsbydamkllpdaueog.supabase.co/auth/v1/callback
     Ganti `<PROJECT_REF>` dengan **Project Reference ID** dari Supabase (lihat di Supabase: Project Settings → General → Reference ID).
6. Klik **Create**. Catat **Client ID** dan **Client Secret** (untuk langkah Supabase).

---

## 2. Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project Anda.
2. **Authentication** → **Providers** → **Google**.
3. **Enable** Google provider.
4. Isi:
   - **Client ID**: dari Google Cloud Console.
   - **Client Secret**: dari Google Cloud Console.
5. **URL Configuration** (Authentication → URL Configuration):
   - **Site URL**: URL aplikasi Anda, misalnya:
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
   - **Redirect URLs**: tambahkan URL callback aplikasi Anda, misalnya:
     - Development: `http://localhost:3000/auth/callback`
     - Production: `https://yourdomain.com/auth/callback`
6. Simpan.

---

## 3. Ringkasan yang Perlu Di-setting

| Di mana | Yang di-setting |
|--------|------------------|
| **Google Cloud** | OAuth consent screen (nama app, email). OAuth Client ID tipe Web, **Authorized redirect URI** = `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. |
| **Supabase** | Provider Google: Enable, isi Client ID & Client Secret. Site URL & Redirect URLs (termasuk `/auth/callback`). |

Setelah itu, tombol **Login dengan Google** dan **Daftar dengan Google** di `/login` dan `/signup` akan mengarahkan user ke Google dan setelah login kembali ke aplikasi (callback sudah handle redirect ke `/admin` atau `/user` dan sinkronisasi `sync_user_from_auth`).
