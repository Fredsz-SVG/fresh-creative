-- Global admin harus bisa terima event Realtime untuk album_class_access (supaya profil card realtime)
-- Supabase Realtime mengirim event hanya ke client yang lulus RLS SELECT. Tanpa ini, admin website tidak dapat event.

CREATE OR REPLACE FUNCTION public.check_is_global_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR public.check_is_global_admin()
  OR (status = 'approved' AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()))
  OR (user_id = auth.uid())
);
