# Production Performance Runbook (Cloudflare Workers + D1)

Dokumen ini untuk menjaga API tetap cepat saat concurrency naik (puluhan-ratusan user bersamaan).

## SLO dan Error Budget

- **API availability**: >= 99.9% (rolling 30 hari)
- **Latency p95**:
  - `GET /api/user/me` <= 250ms
  - `GET /api/user/bootstrap` <= 300ms
  - `GET /api/user/notifications` <= 300ms
  - `GET /api/albums` <= 500ms
  - Public read (`/api/showcase`, `/api/pricing`, `/api/select-area`) <= 200ms
- **Latency p99**:
  - endpoint auth/user <= 700ms
  - endpoint albums <= 1000ms
- **Error rate**: <= 1% (5xx + timeout)

## Alert Threshold (wajib)

Trigger alert jika salah satu kondisi terjadi selama >= 5 menit:

- p95 `/api/user/bootstrap` > 500ms
- p95 `/api/user/me` > 400ms
- p95 `/api/albums` > 900ms
- error rate endpoint mana pun > 2%
- lonjakan 401/403 mendadak (indikasi auth/cookie/JWT issue)

Severity:

- **SEV-2**: p95 > 2x target atau error rate > 5%
- **SEV-1**: API tidak bisa dipakai user (login/load utama gagal)

## Dashboard Minimal yang Harus Ada

- Request volume per endpoint (RPS)
- Latency p50/p95/p99 per endpoint
- Error count per endpoint + status code breakdown
- Top slow query pattern D1 (jika tersedia)
- HIT/MISS header sampling (`X-Cache`) untuk endpoint cached

## 15 Menit Pertama Saat Alert Menyala

1. **Konfirmasi dampak user**
   - cek endpoint mana paling naik latency
   - cek apakah hanya region tertentu
2. **Cek deployment terakhir**
   - rollback cepat jika issue muncul setelah release baru
3. **Cek cache behavior**
   - pastikan endpoint user/public masih mengirim `Cache-Control` yang benar
   - sampling response header `X-Cache` apakah dominan `MISS`
4. **Cek D1 pressure**
   - endpoint dengan query terbesar (`/api/albums`, notifications list)
   - pastikan migration index sudah terpasang
5. **Mitigasi cepat**
   - naikkan TTL cache user endpoint sementara (contoh 2s -> 5s)
   - throttle trigger refresh di frontend jika burst event

## Mitigasi Cepat (Playbook)

- **Case A: `/api/user/me` dan `/api/user/bootstrap` naik**
  - naikkan TTL cache in-worker singkat (2s -> 5s)
  - verifikasi JWT local auth tetap aktif (hindari fallback remote)
- **Case B: `/api/albums` naik**
  - cek query plan dan ukuran data user tertentu
  - batasi payload jika terlalu besar (pagination/limit)
- **Case C: `/api/user/notifications` naik**
  - pastikan index `notifications(user_id, created_at DESC)` aktif
  - pastikan invalidasi cache tidak terlalu agresif
- **Case D: endpoint publik naik**
  - tingkatkan cache TTL public endpoint sementara
  - cek lonjakan bot/scraper

## Checklist Release (Go/No-Go)

Sebelum deploy:

- [ ] `npm run lint` tanpa error
- [ ] migration D1 terbaru sudah applied (termasuk `0006_api_hot_indexes.sql`)
- [ ] smoke test endpoint utama:
  - [ ] `/api/user/bootstrap`
  - [ ] `/api/user/me`
  - [ ] `/api/albums`
  - [ ] `/api/user/notifications`
  - [ ] `/api/showcase`
- [ ] validasi response header cache pada endpoint cached
- [ ] pastikan tidak ada query `no-store` yang tidak perlu di frontend hot path

Sesudah deploy (15-30 menit):

- [ ] bandingkan p95 sebelum vs sesudah deploy
- [ ] pastikan error rate stabil
- [ ] cek trend `X-Cache` HIT tidak drop drastis

## Capacity Guideline (awal)

- Target awal aman: 100 concurrent active users tanpa degradasi UX mayor
- Jika mendekati p95 alert threshold secara konsisten:
  - naikkan efisiensi cache dulu (termurah)
  - baru optimasi query/payload berikutnya

## UX Guardrail

Walau backend cepat, UX bisa terasa lambat jika loading state buruk. Wajib:

- skeleton untuk list utama (`albums`, `notifications`)
- hindari spinner blocking full-screen berulang
- timeout UI dengan retry yang jelas (jangan diam tanpa feedback)
- tampilkan data stale cepat, lalu refresh background

## Catatan Operasional

- Jangan mengejar p50 saja. Fokus utama p95/p99.
- Untuk web dengan traffic burst, stabilitas lebih penting dari response paling cepat.
- Perubahan kecil TTL cache sering memberi impact besar tanpa ubah arsitektur.
