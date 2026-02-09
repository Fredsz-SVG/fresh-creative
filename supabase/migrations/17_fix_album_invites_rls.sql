-- Fix album_invites RLS policy to allow global admins
DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;
CREATE POLICY "Owners manage invites" ON public.album_invites FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
);

-- Fix album_members policies to allow global admins
DROP POLICY IF EXISTS "Members read access" ON public.album_members;
CREATE POLICY "Members read access" ON public.album_members FOR SELECT USING (
  public.check_is_global_admin()
  OR auth.uid() = user_id
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.album_members;
CREATE POLICY "Owner/Admin manage members" ON public.album_members FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix albums SELECT policy to allow global admins to view all albums
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (
  public.check_is_global_admin()
  OR EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = albums.id AND m.user_id = auth.uid())
  OR (visibility = 'public')
);

-- Fix albums UPDATE/DELETE policy to allow global admins
DROP POLICY IF EXISTS "Users can manage own albums" ON public.albums;
CREATE POLICY "Users can manage own albums" ON public.albums FOR ALL USING (
  public.check_is_global_admin()
  OR auth.uid() = user_id
) WITH CHECK (
  public.check_is_global_admin()
  OR auth.uid() = user_id
);

-- Fix album_classes policies to allow global admins
DROP POLICY IF EXISTS "Album owner and members can read classes" ON public.album_classes;
CREATE POLICY "Album owner and members can read classes" ON public.album_classes FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_classes.album_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Album owner/admin can manage classes" ON public.album_classes;
CREATE POLICY "Album owner/admin can manage classes" ON public.album_classes FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix album_class_access policies to allow global admins
DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR (status = 'approved' AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()))
  OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Owner/Admin Manage Access" ON public.album_class_access;
CREATE POLICY "Owner/Admin Manage Access" ON public.album_class_access FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix album_class_requests policies to allow global admins
DROP POLICY IF EXISTS "Read requests" ON public.album_class_requests;
CREATE POLICY "Read requests" ON public.album_class_requests FOR SELECT USING (
  public.check_is_global_admin()
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.album_classes c
    JOIN public.albums a ON a.id = c.album_id
    WHERE c.id = album_class_requests.class_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.album_classes c
    JOIN public.album_members m ON m.album_id = c.album_id
    WHERE c.id = album_class_requests.class_id AND m.user_id = auth.uid() AND m.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Owner/Admin manage requests" ON public.album_class_requests;
CREATE POLICY "Owner/Admin manage requests" ON public.album_class_requests FOR UPDATE USING (
  public.check_is_global_admin()
  OR EXISTS (
    SELECT 1 FROM public.album_classes c
    JOIN public.albums a ON a.id = c.album_id
    WHERE c.id = album_class_requests.class_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.album_classes c
    JOIN public.album_members m ON m.album_id = c.album_id
    WHERE c.id = album_class_requests.class_id AND m.user_id = auth.uid() AND m.role = 'admin'
  )
);
