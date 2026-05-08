-- ============================================================
-- Ritase Supir & Helper (Master + Pivot for Surat Jalan)
-- ============================================================
-- Migration steps:
-- 1) Create master tables: drivers, helpers
-- 2) Add columns to surat_jalan: driver_id, ritase_supir
-- 3) Create pivot table: surat_jalan_helpers (1 SJ -> many helpers)
-- 4) Enable RLS + policies (authenticated allow all)
-- ============================================================

-- Helper: updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1) DRIVERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

DROP TRIGGER IF EXISTS set_updated_at_drivers ON drivers;
CREATE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_drivers" ON drivers;
CREATE POLICY "authenticated_all_drivers" ON drivers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2) HELPERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS helpers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helpers_status ON helpers(status);

DROP TRIGGER IF EXISTS set_updated_at_helpers ON helpers;
CREATE TRIGGER set_updated_at_helpers
  BEFORE UPDATE ON helpers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE helpers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_helpers" ON helpers;
CREATE POLICY "authenticated_all_helpers" ON helpers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3) SURAT JALAN columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE surat_jalan
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ritase_supir NUMERIC(10,2) NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_sj_driver_id  ON surat_jalan(driver_id);

-- ─────────────────────────────────────────────────────────────
-- 4) Pivot: surat_jalan_helpers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surat_jalan_helpers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surat_jalan_id   UUID NOT NULL REFERENCES surat_jalan(id) ON DELETE CASCADE,
  helper_id       UUID REFERENCES helpers(id) ON DELETE SET NULL,
  helper_name     TEXT NOT NULL,
  role             TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sjh_sj     ON surat_jalan_helpers(surat_jalan_id);
CREATE INDEX IF NOT EXISTS idx_sjh_helper ON surat_jalan_helpers(helper_id);

DROP TRIGGER IF EXISTS set_updated_at_surat_jalan_helpers ON surat_jalan_helpers;
CREATE TRIGGER set_updated_at_surat_jalan_helpers
  BEFORE UPDATE ON surat_jalan_helpers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE surat_jalan_helpers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_surat_jalan_helpers" ON surat_jalan_helpers;
CREATE POLICY "authenticated_all_surat_jalan_helpers" ON surat_jalan_helpers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

