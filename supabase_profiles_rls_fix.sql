-- ============================================================
-- FIX: Infinite Recursion di RLS Policy pada tabel profiles
-- 
-- MASALAH: Policy "Admins can view all profiles" menggunakan
--   EXISTS (SELECT 1 FROM public.profiles WHERE ...)
--   yang menyebabkan query profiles di dalam policy profiles
--   → infinite recursion!
--
-- SOLUSI: Gunakan SECURITY DEFINER function yang bypass RLS,
--   atau gunakan JWT claims. Cara paling aman: gunakan
--   security definer function untuk cek role.
--
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Step 1: Hapus semua policy lama yang mungkin rekursif ───
DROP POLICY IF EXISTS "Users can view own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy"         ON public.profiles;

-- ─── Step 2: Buat SECURITY DEFINER function untuk get role ───
-- Function ini bypass RLS sehingga tidak menyebabkan rekursi
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER  -- ← Kunci: bypass RLS, tidak rekursif
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ─── Step 3: Buat policy baru yang TIDAK rekursif ─────────────

-- SELECT: user bisa lihat profil sendiri
CREATE POLICY "profiles_own_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: admin bisa lihat semua profil (via security definer, tidak rekursif!)
CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

-- SELECT: manager bisa lihat semua profil
CREATE POLICY "profiles_manager_select"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- UPDATE: user bisa update profil sendiri
CREATE POLICY "profiles_own_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: admin bisa update semua profil
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- INSERT: hanya via trigger (service_role) atau admin
CREATE POLICY "profiles_admin_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

-- DELETE: hanya admin
CREATE POLICY "profiles_admin_delete"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ─── Step 4: Pastikan RLS aktif ──────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─── Step 5: Grant execute ke authenticated users ─────────────
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ─── Verifikasi: lihat policy aktif ───────────────────────────
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'profiles'
-- ORDER BY policyname;
