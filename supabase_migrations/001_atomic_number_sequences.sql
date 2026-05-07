-- ============================================================
-- FIX: Atomic Number Generation untuk Invoice & Surat Jalan
-- Jalankan di Supabase SQL Editor sebelum deploy aplikasi
-- ============================================================
-- Menggantikan logika "SELECT last number + 1" di frontend
-- yang rentan race condition jika 2 user submit bersamaan.
-- ============================================================

-- ── 1. Sequences ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS surat_jalan_seq START WITH 1 INCREMENT BY 1;

-- Sync sequence ke nilai tertinggi yang sudah ada (idempotent)
SELECT setval(
  'invoice_seq',
  COALESCE(
    (SELECT MAX(CAST(SPLIT_PART(number, '-', 3) AS INTEGER))
     FROM invoices
     WHERE number ~ '^INV-[0-9]{4}-[0-9]+$'),
    0
  )
);

SELECT setval(
  'surat_jalan_seq',
  COALESCE(
    (SELECT MAX(CAST(SPLIT_PART(number, '-', 3) AS INTEGER))
     FROM surat_jalan
     WHERE number ~ '^SJ-[0-9]{4}-[0-9]+$'),
    0
  )
);

-- ── 2. Functions ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq  BIGINT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_seq  := NEXTVAL('invoice_seq');
  RETURN 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_surat_jalan_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq  BIGINT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_seq  := NEXTVAL('surat_jalan_seq');
  RETURN 'SJ-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Grant execute to authenticated users ───────────────────
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_surat_jalan_number() TO authenticated;

-- ── 4. (Opsional) Auto-apply on insert via trigger ───────────
-- Berguna jika ingin number auto-generated di server side:
-- CREATE OR REPLACE FUNCTION set_invoice_number()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.number IS NULL OR NEW.number = '' THEN
--     NEW.number := generate_invoice_number();
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER before_insert_invoice
--   BEFORE INSERT ON invoices
--   FOR EACH ROW EXECUTE FUNCTION set_invoice_number();
-- ============================================================
