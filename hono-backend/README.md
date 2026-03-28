# hono-backend

Backend API for Fresh-web using [Hono](https://hono.dev/).

## Struktur
- `index.ts` — Entry point, mounting semua route.
- `routes/` — Modular folder per fitur (albums, user, credits, admin, dsb).
- `lib/` — Helper dan client Supabase.
- `types.ts` — TypeScript interface utama.
- `middleware.ts` — Contoh middleware global (auth, logging).

## Pengembangan
- Lint: `npx eslint . --ext .ts`
- Format: `npx prettier --write .`
- Testing: (lihat instruksi di bawah)

## Best Practices
- Hindari controller-style, gunakan langsung handler per route.
- Gunakan type/interface untuk data utama.
- Middleware untuk logic global (auth, logging, dsb).
- Error handling konsisten.
- Modularisasi per fitur.

## Linting & Formatting
- ESLint & Prettier sudah disiapkan.

## Testing
- (Akan ditambahkan: contoh setup Vitest)
