/**
 * useStockLogs — React Query + Supabase Realtime
 * Fetch & subscribe to stock_logs for tracking all stock movements
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { StockLog } from "../types";

export const stockLogKeys = {
  all: ["stock_logs"] as const,
  byItem: (itemId: string) => ["stock_logs", itemId] as const,
};

async function fetchStockLogs(): Promise<StockLog[]> {
  const { data, error } = await supabase
    .from("stock_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id:              r.id,
    inventoryId:     r.inventory_id,
    inventoryCode:   r.inventory_code,
    inventoryName:   r.inventory_name,
    changeType:      r.change_type,
    qtyBefore:       r.qty_before,
    qtyChange:       r.qty_change,
    qtyAfter:        r.qty_after,
    referenceId:     r.reference_id,
    referenceType:   r.reference_type,
    referenceNumber: r.reference_number,
    notes:           r.notes,
    createdBy:       r.created_by,
    createdAt:       r.created_at,
  }));
}

export function useStockLogs() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: stockLogKeys.all, queryFn: fetchStockLogs });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:stock_logs_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_logs" },
        () => qc.invalidateQueries({ queryKey: stockLogKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}
