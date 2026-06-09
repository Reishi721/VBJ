-- ============================================================
-- 007: Atomic Stock Adjustment RPC
-- Menggantikan pola read-then-write yang rentan race condition
-- ============================================================
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Fungsi ini melakukan:
-- 1. Update stok secara atomic (stock = stock + delta)
-- 2. Insert stock_log record
-- 3. Return stok sebelum dan sesudah perubahan
-- Semua dalam satu transaction — tidak ada race condition.

CREATE OR REPLACE FUNCTION adjust_stock(
  p_inventory_id     UUID,
  p_qty_change       INT,         -- positif = masuk, negatif = keluar
  p_change_type      TEXT,        -- 'sj_out','sj_in','po_receive','manual_in','manual_out','adjustment','po_edit'
  p_reference_id     UUID DEFAULT NULL,
  p_reference_type   TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL,
  p_created_by       TEXT DEFAULT NULL
)
RETURNS TABLE(qty_before INT, qty_after INT) AS $$
DECLARE
  v_before INT;
  v_after  INT;
  v_code   TEXT;
  v_name   TEXT;
BEGIN
  -- Lock the row and get current stock + info
  SELECT stock, code, name INTO v_before, v_code, v_name
  FROM inventory_items
  WHERE id = p_inventory_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', p_inventory_id;
  END IF;

  -- Calculate new stock (never below 0)
  v_after := GREATEST(0, v_before + p_qty_change);

  -- Atomic update
  UPDATE inventory_items
  SET stock = v_after
  WHERE id = p_inventory_id;

  -- Insert audit log
  INSERT INTO stock_logs (
    inventory_id, inventory_code, inventory_name,
    change_type, qty_before, qty_change, qty_after,
    reference_id, reference_type, reference_number,
    notes, created_by
  ) VALUES (
    p_inventory_id, v_code, v_name,
    p_change_type, v_before, p_qty_change, v_after,
    p_reference_id, p_reference_type, p_reference_number,
    p_notes, p_created_by
  );

  RETURN QUERY SELECT v_before, v_after;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
