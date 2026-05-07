-- ============================================================
-- ERP SCAFFOLDING RENTAL — SUPABASE SCHEMA
-- PT. Victory Bersatu Jaya
-- Generated: 2026-04-28
-- ============================================================
-- Jalankan seluruh file ini di Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================


-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── Helper: updated_at trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. MARKETING
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  position    TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_marketing
  BEFORE UPDATE ON marketing
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE marketing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON marketing
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 2. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  company         TEXT,
  phone           TEXT NOT NULL,
  email           TEXT,
  address         TEXT NOT NULL,
  marketing_id    UUID REFERENCES marketing(id) ON DELETE SET NULL,
  marketing_name  TEXT,                   -- denormalized untuk performa
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_marketing ON customers(marketing_id);
CREATE INDEX idx_customers_status    ON customers(status);

CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 3. CUSTOMER PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  location         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'completed', 'pending', 'cancelled')),
  start_date       DATE NOT NULL,
  end_date         DATE,
  description      TEXT,
  recipient_name   TEXT,
  recipient_phone  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_customer ON customer_projects(customer_id);
CREATE INDEX idx_projects_status   ON customer_projects(status);

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON customer_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 4. INVENTORY CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT NOT NULL DEFAULT 'bg-blue-500',  -- Tailwind class
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_inv_categories
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON inventory_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 5. INVENTORY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
  category_name TEXT NOT NULL,                 -- denormalized
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,           -- SKU
  unit          TEXT NOT NULL DEFAULT 'pcs',
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock     INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  condition     TEXT NOT NULL DEFAULT 'good'
                  CHECK (condition IN ('good', 'damaged', 'maintenance')),
  location      TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_category  ON inventory_items(category_id);
CREATE INDEX idx_items_condition ON inventory_items(condition);
CREATE INDEX idx_items_code      ON inventory_items(code);

CREATE TRIGGER set_updated_at_inv_items
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON inventory_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 6. SURAT JALAN (DELIVERY NOTES)
-- ============================================================
CREATE TABLE IF NOT EXISTS surat_jalan (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number            TEXT NOT NULL UNIQUE,        -- SJ-2026-001
  type              TEXT NOT NULL CHECK (type IN ('pengiriman', 'pengembalian')),
  date              DATE NOT NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     TEXT NOT NULL,               -- denormalized
  project_id        UUID REFERENCES customer_projects(id) ON DELETE SET NULL,
  project_name      TEXT,
  recipient_name    TEXT NOT NULL,
  recipient_phone   TEXT,
  delivery_address  TEXT NOT NULL,
  driver_name       TEXT NOT NULL,
  vehicle_plate     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'delivered', 'cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sj_customer   ON surat_jalan(customer_id);
CREATE INDEX idx_sj_project    ON surat_jalan(project_id);
CREATE INDEX idx_sj_status     ON surat_jalan(status);
CREATE INDEX idx_sj_date       ON surat_jalan(date);

CREATE TRIGGER set_updated_at_surat_jalan
  BEFORE UPDATE ON surat_jalan
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE surat_jalan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON surat_jalan
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Surat Jalan Line Items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surat_jalan_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surat_jalan_id   UUID NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
  inventory_id     UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_code   TEXT NOT NULL,
  inventory_name   TEXT NOT NULL,
  unit             TEXT NOT NULL,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  note             TEXT
);

CREATE INDEX idx_sj_items_sj        ON surat_jalan_items(surat_jalan_id);
CREATE INDEX idx_sj_items_inventory ON surat_jalan_items(inventory_id);

ALTER TABLE surat_jalan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON surat_jalan_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 7. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number               TEXT NOT NULL UNIQUE,          -- INV-2026-001
  summary_description  TEXT NOT NULL,
  date                 DATE NOT NULL,
  due_date             DATE NOT NULL,
  po_number            TEXT,
  billing_cycle        TEXT,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name        TEXT NOT NULL,
  customer_address     TEXT,
  project_id           UUID REFERENCES customer_projects(id) ON DELETE SET NULL,
  project_name         TEXT,
  up_name              TEXT,
  up_phone             TEXT,
  subtotal             BIGINT NOT NULL DEFAULT 0,
  transport_fee        BIGINT NOT NULL DEFAULT 0,
  deposit_fee          BIGINT NOT NULL DEFAULT 0,
  discount             BIGINT NOT NULL DEFAULT 0,
  tax                  NUMERIC(5,2) NOT NULL DEFAULT 0,  -- persen (0 / 11)
  tax_amount           BIGINT NOT NULL DEFAULT 0,
  total                BIGINT NOT NULL DEFAULT 0,
  paid_amount          BIGINT NOT NULL DEFAULT 0,
  remaining_amount     BIGINT NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','paid','partial','overdue','cancelled')),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_project  ON invoices(project_id);
CREATE INDEX idx_invoices_status   ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Invoice Line Items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  inventory_code   TEXT,
  qty              NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit             TEXT NOT NULL DEFAULT 'pcs',
  unit_price       BIGINT NOT NULL DEFAULT 0,
  rental_days      INTEGER,
  subtotal         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inv_items_invoice ON invoice_line_items(invoice_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON invoice_line_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number   TEXT NOT NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  amount           BIGINT NOT NULL CHECK (amount > 0),
  method           TEXT NOT NULL DEFAULT 'transfer'
                     CHECK (method IN ('transfer', 'cash', 'check')),
  date             DATE NOT NULL,
  reference        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date     ON payments(date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Trigger: sync invoice paid_amount & status setelah payment ───────────────
CREATE OR REPLACE FUNCTION sync_invoice_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_paid       BIGINT;
  v_total      BIGINT;
  v_status     TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE invoice_id = v_invoice_id;

  SELECT total INTO v_total FROM invoices WHERE id = v_invoice_id;

  IF v_paid >= v_total THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'sent';
  END IF;

  UPDATE invoices
  SET
    paid_amount      = v_paid,
    remaining_amount = GREATEST(v_total - v_paid, 0),
    status           = v_status,
    updated_at       = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_payment_after_insert
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();

CREATE TRIGGER sync_payment_after_delete
  AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();


-- ============================================================
-- 9. PURCHASE ORDERS (PO)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number           TEXT NOT NULL UNIQUE,            -- PO-2026-001
  date             DATE NOT NULL,
  supplier_name    TEXT NOT NULL,
  supplier_phone   TEXT,
  supplier_address TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'ordered', 'partial', 'completed', 'cancelled')),
  subtotal         BIGINT NOT NULL DEFAULT 0,
  discount         BIGINT NOT NULL DEFAULT 0,
  total            BIGINT NOT NULL DEFAULT 0,
  notes            TEXT,
  received_by      TEXT,
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date   ON purchase_orders(date);

CREATE TRIGGER set_updated_at_po
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON purchase_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── PO Line Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id            UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id     UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_code   TEXT NOT NULL,
  inventory_name   TEXT NOT NULL,
  unit             TEXT NOT NULL,
  qty_ordered      INTEGER NOT NULL CHECK (qty_ordered > 0),
  qty_received     INTEGER NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_price       BIGINT NOT NULL DEFAULT 0,
  subtotal         BIGINT NOT NULL DEFAULT 0,
  note             TEXT
);

CREATE INDEX idx_po_items_po        ON po_items(po_id);
CREATE INDEX idx_po_items_inventory ON po_items(inventory_id);

ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON po_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 10. STOCK LOGS — Audit trail perubahan stok (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id     UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  inventory_code   TEXT NOT NULL,
  inventory_name   TEXT NOT NULL,
  change_type      TEXT NOT NULL
                     CHECK (change_type IN (
                       'po_receive',    -- terima dari PO
                       'po_edit',       -- koreksi stok via edit PO selesai
                       'manual_in',     -- tambah stok manual
                       'manual_out',    -- kurang stok manual
                       'sj_out',        -- keluar via Surat Jalan pengiriman
                       'sj_in',         -- masuk via Surat Jalan pengembalian
                       'adjustment'     -- koreksi stock opname
                     )),
  qty_before       INTEGER NOT NULL,
  qty_change       INTEGER NOT NULL,   -- positif = masuk, negatif = keluar
  qty_after        INTEGER NOT NULL,
  reference_id     UUID,              -- ID dokumen sumber
  reference_type   TEXT,              -- 'purchase_order' | 'surat_jalan' | 'manual'
  reference_number TEXT,              -- Nomor dokumen
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_logs_inventory  ON stock_logs(inventory_id);
CREATE INDEX idx_stock_logs_type       ON stock_logs(change_type);
CREATE INDEX idx_stock_logs_reference  ON stock_logs(reference_id);
CREATE INDEX idx_stock_logs_created_at ON stock_logs(created_at DESC);

ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert only for authenticated" ON stock_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Select for authenticated" ON stock_logs
  FOR SELECT TO authenticated USING (true);
-- Update/Delete diblokir — stock_logs bersifat immutable


-- ============================================================
-- 11. RENTAL RECAP
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_recap (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_address TEXT,
  project_id       UUID REFERENCES customer_projects(id) ON DELETE SET NULL,
  project_name     TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recap_customer ON rental_recap(customer_id);

CREATE TRIGGER set_updated_at_recap
  BEFORE UPDATE ON rental_recap
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE rental_recap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON rental_recap
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS rental_recap_columns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recap_id        UUID NOT NULL REFERENCES rental_recap(id) ON DELETE CASCADE,
  inventory_id    UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_name  TEXT NOT NULL,
  inventory_code  TEXT NOT NULL,
  unit            TEXT NOT NULL,
  col_order       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_recap_cols_recap     ON rental_recap_columns(recap_id);
CREATE INDEX idx_recap_cols_inventory ON rental_recap_columns(inventory_id);

ALTER TABLE rental_recap_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON rental_recap_columns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 12. SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL DEFAULT '',
  tagline          TEXT NOT NULL DEFAULT '',
  address_line1    TEXT NOT NULL DEFAULT '',
  address_line2    TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  fax              TEXT NOT NULL DEFAULT '',
  logo_url         TEXT,
  invoice_remarks  TEXT,
  manager_name     TEXT,
  manager_title    TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON company_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO company_settings (name, tagline, address_line1, address_line2, phone, fax, manager_title)
VALUES (
  'PT. Victory Bersatu Jaya',
  'EXCELLENT SPIRIT IN BUSINESS',
  'Pusat Penjualan & Penyewaan Peralatan Scaffolding',
  'Batam - Indonesia',
  '(0778) 416 1218, 0852 7437 1115 / 0813 7271 6698',
  'victorybersatujaya@gmail.com',
  'Marketing Manager'
) ON CONFLICT DO NOTHING;


CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON bank_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO bank_accounts (bank_name, account_number, account_name)
VALUES ('Bank Panin', '5545000241', 'CV. Victory Globalindo Jaya')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SELESAI — 17 tabel dibuat
-- ============================================================
