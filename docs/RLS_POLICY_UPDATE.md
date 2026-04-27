# (Legacy) RLS Policy Update

## Issue
Endpoint `GET /api/albums/[id]/classes/[classId]/requests?status=pending` returns 500 error.

## Root Cause
Dokumen ini dulu berlaku saat data layer masih memakai Postgres + RLS.

## Status
Repo ini sekarang sudah pindah ke **D1** (tanpa RLS di database). Dokumen ini disimpan sebagai arsip historis.
