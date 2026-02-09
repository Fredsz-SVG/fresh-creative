-- 11_album_lead_realtime.sql
-- Enable Realtime for albums and leads tables to support cross-device updates.

BEGIN;

-- 1. Set REPLICA IDENTITY to FULL so all columns are included in the update payload
ALTER TABLE public.albums REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'albums') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.albums;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    END IF;
END $$;

-- 3. Ensure Admins can SELECT all rows (required for Realtime events to be delivered to Admin)
DROP POLICY IF EXISTS "Admins can view all albums" ON public.albums;
CREATE POLICY "Admins can view all albums" ON public.albums 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads" ON public.leads 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Allow users to view their own leads (so they get realtime updates when status changes)
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads" ON public.leads 
FOR SELECT USING (auth.uid() = created_by);

COMMIT;
