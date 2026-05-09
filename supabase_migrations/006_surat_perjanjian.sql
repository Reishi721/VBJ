-- ============================================================
-- MIGRATION 006: SURAT PERJANJIAN SEWA MENYEWA
-- ============================================================

-- 1. Pihak Pertama (company representatives)
CREATE TABLE IF NOT EXISTS pihak_pertama (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  position    TEXT NOT NULL DEFAULT 'Manager Marketing',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_pihak_pertama
  BEFORE UPDATE ON pihak_pertama
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE pihak_pertama ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON pihak_pertama
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Rental Price List (harga per item inventory)
CREATE TABLE IF NOT EXISTS rental_price_list (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  inventory_name  TEXT NOT NULL,
  inventory_code  TEXT NOT NULL,
  category_id     UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  category_name   TEXT,
  harga_ganti     BIGINT NOT NULL DEFAULT 0,   -- harga ganti rugi per satuan
  harga_sewa      BIGINT NOT NULL DEFAULT 0,   -- harga sewa per satuan per bulan
  satuan          TEXT NOT NULL DEFAULT 'pc',  -- satuan: pc, set, bting, dll
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rental_price_inventory ON rental_price_list(inventory_id);
CREATE INDEX idx_rental_price_category ON rental_price_list(category_id);

ALTER TABLE rental_price_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON rental_price_list
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Surat Perjanjian (main document)
CREATE TABLE IF NOT EXISTS surat_perjanjian (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number              TEXT NOT NULL UNIQUE,         -- SP-2026-001
  date                DATE NOT NULL,
  pihak_pertama_id    UUID REFERENCES pihak_pertama(id) ON DELETE SET NULL,
  pihak_pertama_name  TEXT NOT NULL,
  pihak_pertama_address TEXT NOT NULL,
  pihak_pertama_phone TEXT NOT NULL,
  pihak_pertama_position TEXT NOT NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  customer_address    TEXT NOT NULL,
  customer_phone      TEXT,
  customer_fax        TEXT,
  customer_wakil      TEXT,                          -- diwakili oleh
  project_location    TEXT,                          -- tempat proyek/usaha
  lama_sewa           TEXT,                          -- e.g. "1 bulan"
  pembayaran_selanjutnya TEXT,                       -- e.g. "Setelah 1 bulan"
  cara_pembayaran     TEXT NOT NULL DEFAULT 'Cash',
  transport_fee       BIGINT NOT NULL DEFAULT 0,
  uang_jaminan        BIGINT NOT NULL DEFAULT 0,
  total               BIGINT NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sp_customer ON surat_perjanjian(customer_id);
CREATE INDEX idx_sp_status   ON surat_perjanjian(status);
CREATE INDEX idx_sp_date     ON surat_perjanjian(date);

CREATE TRIGGER set_updated_at_surat_perjanjian
  BEFORE UPDATE ON surat_perjanjian
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE surat_perjanjian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON surat_perjanjian
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Surat Perjanjian Items (line items)
CREATE TABLE IF NOT EXISTS surat_perjanjian_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surat_perjanjian_id UUID NOT NULL REFERENCES surat_perjanjian(id) ON DELETE CASCADE,
  inventory_id        UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_name      TEXT NOT NULL,
  inventory_code      TEXT NOT NULL,
  category_id         UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  category_name       TEXT,
  harga_ganti         BIGINT NOT NULL DEFAULT 0,
  harga_sewa          BIGINT NOT NULL DEFAULT 0,
  satuan              TEXT NOT NULL DEFAULT 'pc',
  qty                 INTEGER NOT NULL DEFAULT 0,
  jumlah              BIGINT NOT NULL DEFAULT 0,   -- qty * harga_sewa
  item_order          INTEGER NOT NULL DEFAULT 0,
  note                TEXT
);

CREATE INDEX idx_sp_items_sp        ON surat_perjanjian_items(surat_perjanjian_id);
CREATE INDEX idx_sp_items_inventory ON surat_perjanjian_items(inventory_id);
CREATE INDEX idx_sp_items_category  ON surat_perjanjian_items(category_id);

ALTER TABLE surat_perjanjian_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON surat_perjanjian_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Auto-number sequence for SP
CREATE SEQUENCE IF NOT EXISTS sp_number_seq START 1;

-- ============================================================
-- SELESAI
-- ============================================================
