-- ============================================================
-- Supabase Storage: Bucket untuk aset perusahaan
-- Jalankan di SQL Editor Supabase Anda
-- ============================================================

-- 1. Buat bucket "company-assets" yang bersifat PUBLIC
--    (logo harus bisa diakses tanpa login)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,                                     -- public = URL bisa diakses siapapun
  2097152,                                  -- max 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

-- ============================================================
-- 2. RLS Policies untuk bucket "company-assets"
-- ============================================================

-- Siapapun (termasuk anonymous) bisa READ file (karena bucket public)
CREATE POLICY "Public read company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

-- Hanya user yang sudah login (authenticated) bisa UPLOAD
CREATE POLICY "Authenticated users can upload company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

-- Hanya user yang sudah login bisa UPDATE (overwrite)
CREATE POLICY "Authenticated users can update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets');

-- Hanya user yang sudah login bisa DELETE
CREATE POLICY "Authenticated users can delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets');
