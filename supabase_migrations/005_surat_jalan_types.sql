-- ====================================================================
-- MIGRATION: 005_surat_jalan_types
-- Deskripsi: Membuat tabel untuk mengelola tipe surat jalan dan prefix
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.surat_jalan_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default types
INSERT INTO public.surat_jalan_types (id, name, prefix)
VALUES 
  ('pengiriman', 'Pengiriman', '2'),
  ('pengembalian', 'Pengembalian', '3')
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
ALTER TABLE public.surat_jalan_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all authenticated users on surat_jalan_types" 
ON public.surat_jalan_types FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Allow insert access for authenticated users on surat_jalan_types" 
ON public.surat_jalan_types FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users on surat_jalan_types" 
ON public.surat_jalan_types FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Allow delete access for authenticated users on surat_jalan_types" 
ON public.surat_jalan_types FOR DELETE 
TO authenticated USING (true);
