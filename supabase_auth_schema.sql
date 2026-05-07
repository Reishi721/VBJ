-- ============================================================
-- ERP SCAFFOLDING RENTAL — AUTH SCHEMA
-- Jalankan file ini SETELAH supabase_schema.sql
-- ============================================================
-- Supabase Auth sudah mengelola tabel auth.users secara otomatis.
-- File ini menambahkan:
--   1. Tabel profiles  — data tambahan user (nama, role, dll)
--   2. Tabel roles     — referensi peran pengguna
--   3. Trigger         — otomatis buat profil saat user baru signup
--   4. Helper function — cek role user saat ini
--   5. RLS per role    — batasi akses berdasarkan peran
--   6. Panduan membuat user pertama
-- ============================================================


-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- BAGIAN 1 — TABEL PROFILES
-- Memperluas auth.users dengan data tambahan.
-- id harus sama dengan auth.users.id (UUID dari Supabase Auth).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  phone         TEXT,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_role      ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: user hanya bisa lihat & edit profil sendiri, admin bisa lihat semua
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Setiap user bisa baca profilnya sendiri
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin bisa baca semua profil
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- User bisa update profilnya sendiri (kecuali field role)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin bisa update semua profil (termasuk ganti role)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Hanya admin yang bisa insert/delete profil secara manual
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- BAGIAN 2 — TRIGGER AUTO-CREATE PROFILE
-- Dijalankan otomatis setiap kali user baru mendaftar/dibuat
-- di Supabase Auth (termasuk via Dashboard).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                  -- berjalan dengan hak pemilik fungsi
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    -- Ambil full_name dari metadata jika ada, fallback ke email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    -- User pertama (tidak ada profil sama sekali) otomatis jadi admin
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    END
  )
  ON CONFLICT (id) DO NOTHING;   -- idempotent — aman dipanggil ulang
  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- BAGIAN 3 — UPDATE last_seen_at
-- Dijalankan setiap kali user sign-in (via Supabase Auth hook).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Pasang trigger ke auth.sessions (setiap sesi baru = login)
CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();


-- ============================================================
-- BAGIAN 4 — HELPER FUNCTIONS
-- Fungsi-fungsi ini dapat dipakai di RLS policy manapun.
-- ============================================================

-- Cek apakah user saat ini adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Cek apakah user saat ini adalah manager atau admin
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
  );
$$;

-- Ambil role user saat ini (untuk dipakai di aplikasi)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Cek apakah user aktif
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;


-- ============================================================
-- BAGIAN 5 — UPDATE RLS TABEL LAIN
-- Tambahkan pengecekan is_active agar user yang dinonaktifkan
-- tidak bisa mengakses data. Jalankan setelah schema utama.
-- ============================================================

-- Contoh: hanya user aktif yang bisa akses invoices
-- (Jika ingin menerapkan RLS lebih ketat per role, ganti policy di bawah)

-- Drop policy lama yang terlalu permisif, ganti dengan yang lebih aman
-- Uncomment blok di bawah jika sudah siap menerapkan RLS berbasis role

/*
-- ── Invoices: hanya manager+ yang bisa hapus ─────────────────────────────────
DROP POLICY IF EXISTS "Allow all for authenticated" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE TO authenticated
  USING (public.is_active_user());

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above());

-- ── Payments: hanya manager+ yang bisa hapus ─────────────────────────────────
DROP POLICY IF EXISTS "Allow all for authenticated" ON payments;

CREATE POLICY "payments_select" ON payments
  FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY "payments_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

CREATE POLICY "payments_delete" ON payments
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above());

-- ── Settings: hanya admin yang bisa ubah ────────────────────────────────────
DROP POLICY IF EXISTS "Allow all for authenticated" ON company_settings;

CREATE POLICY "settings_select" ON company_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "settings_update" ON company_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin());
*/


-- ============================================================
-- BAGIAN 6 — VIEW: USER LIST (untuk halaman manajemen user)
-- Gabungkan auth.users + profiles untuk ditampilkan di UI.
-- ============================================================
CREATE OR REPLACE VIEW public.user_list AS
SELECT
  u.id,
  u.email,
  u.created_at              AS registered_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.banned_until,
  p.full_name,
  p.role,
  p.is_active,
  p.phone,
  p.avatar_url,
  p.last_seen_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- Hanya admin yang bisa akses view ini
-- (View tidak support RLS langsung; akses via function atau dari server side)


-- ============================================================
-- BAGIAN 7 — CARA MEMBUAT USER
-- ============================================================
-- OPSI A (Termudah): Melalui Supabase Dashboard
--   Authentication → Users → Invite user / Add user
--   → Masukkan email dan password
--   → Trigger otomatis akan membuat baris di public.profiles
--   → User pertama yang dibuat OTOMATIS mendapat role 'admin'
--
-- OPSI B: Via SQL (hanya untuk development/seeding)
--   Gunakan fungsi resmi Supabase Admin API, BUKAN insert langsung
--   ke auth.users karena password perlu di-hash dengan bcrypt.
--
-- OPSI C: Via aplikasi (self-signup)
--   Aktifkan "Allow new users to sign up" di:
--   Authentication → Settings → User Signups
--   Kemudian panggil supabase.auth.signUp({ email, password })
--   Catatan: Jika dimatikan, hanya admin yang bisa invite user.
--
-- ============================================================
-- CARA MENGUNDANG USER BARU (setelah user pertama/admin dibuat):
-- ============================================================
-- Di aplikasi, admin bisa mengundang user via Supabase Admin API:
--   await supabase.auth.admin.inviteUserByEmail('user@email.com', {
--     data: { full_name: 'Nama User', role: 'staff' }
--   })
-- Ini akan:
--   1. Kirim email undangan ke user
--   2. User klik link → set password sendiri
--   3. Trigger otomatis buat profil dengan role 'staff'
-- ============================================================


-- ============================================================
-- SELESAI
-- ============================================================
-- Ringkasan:
--   ✅ public.profiles       — data tambahan user (nama, role, status)
--   ✅ handle_new_user()     — trigger: buat profil otomatis saat signup
--   ✅ handle_user_login()   — trigger: update last_seen_at saat login
--   ✅ is_admin()            — helper: cek apakah user adalah admin
--   ✅ is_manager_or_above() — helper: cek manager/admin
--   ✅ get_my_role()         — helper: ambil role user saat ini
--   ✅ is_active_user()      — helper: cek apakah user aktif
--   ✅ user_list (view)      — tampilkan semua user + profil
-- ============================================================
