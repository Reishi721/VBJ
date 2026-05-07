-- ============================================================
-- MIGRATION 002: PO Number Sequence + Auto-Overdue Detection
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── 1. PO Number Sequence ────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS po_seq START WITH 1 INCREMENT BY 1;

SELECT setval(
  'po_seq',
  COALESCE(
    (SELECT MAX(CAST(SPLIT_PART(number, '-', 3) AS INTEGER))
     FROM purchase_orders
     WHERE number ~ '^PO-[0-9]{4}-[0-9]+$'),
    0
  )
);

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq  BIGINT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_seq  := NEXTVAL('po_seq');
  RETURN 'PO-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_po_number() TO authenticated;

-- ── 2. purchase_orders table (jika belum ada) ────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number           TEXT NOT NULL UNIQUE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name    TEXT NOT NULL,
  supplier_phone   TEXT,
  supplier_address TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','ordered','partial','completed','cancelled')),
  subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total            NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  received_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. po_items table (jika belum ada) ───────────────────────
CREATE TABLE IF NOT EXISTS po_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id          UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id   UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_code TEXT NOT NULL,
  inventory_name TEXT NOT NULL,
  unit           TEXT NOT NULL,
  qty_ordered    NUMERIC(12,2) NOT NULL DEFAULT 0,
  qty_received   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price     NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal       NUMERIC(15,2) NOT NULL DEFAULT 0,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. RLS for purchase_orders ───────────────────────────────
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read POs" ON purchase_orders;
CREATE POLICY "Authenticated users can read POs"
  ON purchase_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage POs" ON purchase_orders;
CREATE POLICY "Authenticated users can manage POs"
  ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read PO items" ON po_items;
CREATE POLICY "Authenticated users can read PO items"
  ON po_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage PO items" ON po_items;
CREATE POLICY "Authenticated users can manage PO items"
  ON po_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 5. Auto-Overdue Detection ────────────────────────────────
-- Function yang mengubah status invoice ke 'overdue' jika sudah lewat due_date
-- Dipanggil via pg_cron atau manual setiap hari.
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE invoices
  SET
    status     = 'overdue',
    updated_at = NOW()
  WHERE
    status     IN ('sent', 'partial')
    AND due_date < CURRENT_DATE
    AND remaining_amount > 0;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_overdue_invoices() TO authenticated;

-- ── 6. Trigger updated_at untuk purchase_orders ──────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_purchase_orders ON purchase_orders;
CREATE TRIGGER set_updated_at_purchase_orders
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 7. (Opsional) pg_cron untuk auto-overdue setiap hari jam 7 pagi WIB
-- Aktifkan extension pg_cron di Supabase Dashboard > Extensions terlebih dahulu
-- SELECT cron.schedule('mark-overdue-daily', '0 0 * * *', 'SELECT mark_overdue_invoices()');
-- ============================================================
