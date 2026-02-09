# RLS Policy Update Required

## Issue
Endpoint `GET /api/albums/[id]/classes/[classId]/requests?status=pending` returns 500 error.

## Root Cause
The RLS (Row Level Security) policy untuk `album_class_requests` table sudah di-update untuk allow owner melihat requests dengan lebih specific conditions.

## Solution
Jalankan SQL queries berikut di Supabase SQL Editor:

```sql
-- Update RLS policy untuk split SELECT policies
DROP POLICY IF EXISTS "Users can see own requests" ON public.album_class_requests;
CREATE POLICY "Users can see own requests" ON public.album_class_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can see class requests" ON public.album_class_requests;
CREATE POLICY "Owner can see class requests" ON public.album_class_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.album_classes c
      JOIN public.albums a ON a.id = c.album_id
      WHERE c.id = class_id AND a.user_id = auth.uid()
    )
  );
```

## Steps to Apply:
1. Buka Supabase dashboard
2. Pilih project Anda
3. Masuk ke SQL Editor
4. Copy-paste SQL queries di atas
5. Run queries
6. Test endpoint lagi

## Verified
- Migration file sudah di-update: `supabase/migrations/08_album_class_requests.sql`
- API endpoint sudah di-improve dengan better error logging
