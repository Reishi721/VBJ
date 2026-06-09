/**
 * adjustStock — Atomic stock adjustment via Supabase RPC
 * 
 * Menggantikan pola read-then-write yang rentan race condition.
 * Fungsi ini memanggil `adjust_stock` RPC yang melakukan:
 * 1. Lock row inventory
 * 2. Update stok secara atomic (stock = stock + delta)
 * 3. Insert stock_log record
 * Semua dalam satu DB transaction.
 */
import { supabase } from "./supabase";

export interface AdjustStockParams {
  inventoryId: string;
  qtyChange: number;         // positif = masuk, negatif = keluar
  changeType: string;        // 'sj_out','sj_in','po_receive','manual_in','manual_out','adjustment','po_edit'
  referenceId?: string;
  referenceType?: string;    // 'surat_jalan' | 'purchase_order' | 'manual'
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
}

export interface AdjustStockResult {
  qty_before: number;
  qty_after: number;
}

/**
 * Atomically adjust inventory stock and log the change.
 * Throws on error.
 */
export async function adjustStock(params: AdjustStockParams): Promise<AdjustStockResult> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_inventory_id:     params.inventoryId,
    p_qty_change:       params.qtyChange,
    p_change_type:      params.changeType,
    p_reference_id:     params.referenceId ?? null,
    p_reference_type:   params.referenceType ?? null,
    p_reference_number: params.referenceNumber ?? null,
    p_notes:            params.notes ?? null,
    p_created_by:       params.createdBy ?? null,
  });

  if (error) throw error;

  // RPC returns array of { qty_before, qty_after }
  const result = Array.isArray(data) ? data[0] : data;
  return result as AdjustStockResult;
}
