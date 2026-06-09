-- ============================================================
-- 008: Atomic Document Number Sequences  
-- Menggantikan client-side number generation yang rentan race condition
-- ============================================================
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Fungsi generate nomor invoice secara atomic
-- Menggunakan advisory lock untuk mencegah duplikat
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_last TEXT;
  v_num  INT;
BEGIN
  -- Advisory lock to prevent concurrent generation
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number'));
  
  SELECT number INTO v_last
  FROM invoices
  WHERE number ILIKE 'Inv-%'
  ORDER BY number DESC
  LIMIT 1;

  IF v_last IS NULL THEN
    v_num := 1;
  ELSE
    v_num := COALESCE(
      NULLIF(regexp_replace(v_last, '^Inv-', ''), '')::INT,
      0
    ) + 1;
  END IF;

  RETURN 'Inv-' || LPAD(v_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Fungsi generate nomor Surat Jalan secara atomic
CREATE OR REPLACE FUNCTION generate_sj_number(p_prefix TEXT DEFAULT 'SJ')
RETURNS TEXT AS $$
DECLARE
  v_year  TEXT;
  v_last  TEXT;
  v_num   INT;
  v_pattern TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sj_number_' || p_prefix));
  
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  v_pattern := p_prefix || '-' || v_year || '-%';

  SELECT number INTO v_last
  FROM surat_jalan
  WHERE number ILIKE v_pattern
  ORDER BY number DESC
  LIMIT 1;

  IF v_last IS NULL THEN
    v_num := 1;
  ELSE
    v_num := COALESCE(
      NULLIF(split_part(v_last, '-', 3), '')::INT,
      0
    ) + 1;
  END IF;

  RETURN p_prefix || '-' || v_year || '-' || LPAD(v_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Fungsi generate nomor Surat Perjanjian secara atomic
CREATE OR REPLACE FUNCTION generate_sp_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_last TEXT;
  v_num  INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sp_number'));
  
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT number INTO v_last
  FROM surat_perjanjian
  WHERE number ILIKE 'SP-' || v_year || '-%'
  ORDER BY number DESC
  LIMIT 1;

  IF v_last IS NULL THEN
    v_num := 1;
  ELSE
    v_num := COALESCE(
      NULLIF(split_part(v_last, '-', 3), '')::INT,
      0
    ) + 1;
  END IF;

  RETURN 'SP-' || v_year || '-' || LPAD(v_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
