-- ============================================================
-- Delivery Lists (Daftar Kebutuhan Pengiriman)
-- Fitur: Buat list kebutuhan customer dalam bentuk SET,
--         link ke surat jalan untuk tracking pengiriman.
-- ============================================================

-- ── 1. Main table: delivery_lists ───────────────────────────
CREATE TABLE IF NOT EXISTS delivery_lists (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  project_id    UUID REFERENCES customer_projects(id) ON DELETE SET NULL,
  project_name  TEXT,
  title         TEXT NOT NULL,                          -- e.g. "Order 50 Set Frame 170"
  order_qty     INTEGER NOT NULL DEFAULT 1,             -- jumlah set yg dipesan customer
  unit_label    TEXT NOT NULL DEFAULT 'set',             -- label satuan (set, paket, dll)
  status        TEXT NOT NULL DEFAULT 'active'           -- active | completed | cancelled
                CHECK (status IN ('active', 'completed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Items table: delivery_list_items ─────────────────────
-- Setiap item = 1 jenis barang yang dibutuhkan untuk melengkapi order
CREATE TABLE IF NOT EXISTS delivery_list_items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_list_id  UUID NOT NULL REFERENCES delivery_lists(id) ON DELETE CASCADE,
  inventory_id      UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  inventory_code    TEXT NOT NULL,
  inventory_name    TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'pcs',
  qty_needed        INTEGER NOT NULL DEFAULT 0,          -- total qty dibutuhkan
  qty_sent          INTEGER NOT NULL DEFAULT 0,          -- total qty sudah dikirim
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Fulfillment tracking: delivery_list_shipments ────────
-- Setiap row = link antara delivery_list_item dengan surat_jalan
CREATE TABLE IF NOT EXISTS delivery_list_shipments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_list_id      UUID NOT NULL REFERENCES delivery_lists(id) ON DELETE CASCADE,
  delivery_list_item_id UUID NOT NULL REFERENCES delivery_list_items(id) ON DELETE CASCADE,
  surat_jalan_id        UUID NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
  surat_jalan_number    TEXT NOT NULL,
  qty_shipped           INTEGER NOT NULL DEFAULT 0,
  ship_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dl_customer ON delivery_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_dli_list ON delivery_list_items(delivery_list_id);
CREATE INDEX IF NOT EXISTS idx_dls_list ON delivery_list_shipments(delivery_list_id);
CREATE INDEX IF NOT EXISTS idx_dls_sj ON delivery_list_shipments(surat_jalan_id);

-- ── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE delivery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_list_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_delivery_lists" ON delivery_lists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_delivery_list_items" ON delivery_list_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_delivery_list_shipments" ON delivery_list_shipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
