-- -----------------------------------------------------------------------------
-- FIXED ADMIN REALTIME USERS
-- Izinkan Administrator untuk membaca/SELECT semua row di tabel users
-- Ini wajib ada agar Supabase Realtime bisa mendeteksi perubahan tabel 
-- dan mengirimkan datanya (webhook) ke halaman Admin.
-- -----------------------------------------------------------------------------

CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (
  public.check_is_global_admin()
);
