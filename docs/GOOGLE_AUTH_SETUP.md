# Setup Login & Sign Up dengan Google (Firebase Auth)

Aplikasi sudah mendukung tombol **Login dengan Google** dan **Daftar dengan Google** lewat **Firebase Auth**.

---

## 1. Firebase Console / Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih atau buat project.
3. Pastikan **OAuth consent screen** sudah di-set (kalau diminta):
   - Pilih **External** (atau Internal untuk workspace saja).
   - Isi **App name**, **User support email**, **Developer contact**.
   - Tambah **Scopes** jika perlu (untuk login dasar, default cukup).
   - Simpan.
4. Aktifkan **Google** provider di Firebase:
   - Firebase Console → **Authentication** → **Sign-in method** → **Google** → Enable.
5. Tambahkan authorized domains:
   - Firebase Console → **Authentication** → **Settings** → **Authorized domains**
   - Tambahkan domain aplikasi (mis. `localhost`, domain production).

---

## 2. Next.js env

Set env berikut di `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## 3. Ringkasan yang Perlu Di-setting

Firebase:
- Enable Google provider
- Authorized domains
Next.js:
- Firebase client env vars

Setelah itu, tombol **Login dengan Google** dan **Daftar dengan Google** di `/login` dan `/signup` akan mengarahkan user ke Google dan setelah login kembali ke aplikasi.
