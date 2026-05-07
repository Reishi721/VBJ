/**
 * useRentalRecap — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { RentalRecap, RentalRecapColumn } from "../types";

export const recapKeys = {
  all:    ["rental_recap"] as const,
  detail: (id: string) => ["rental_recap", id] as const,
};

async function fetchRecaps(): Promise<RentalRecap[]> {
  const { data, error } = await supabase
    .from("rental_recap")
    .select("*, columns:rental_recap_columns(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any): RentalRecap => ({
    id:              r.id,
    customerId:      r.customer_id,
    customerName:    r.customer_name,
    customerAddress: r.customer_address,
    projectId:       r.project_id,
    projectName:     r.project_name,
    notes:           r.notes,
    createdAt:       r.created_at,
    columns: (r.columns ?? [])
      .map((c: any): RentalRecapColumn => ({
        id:            c.id,
        inventoryId:   c.inventory_id,
        inventoryName: c.inventory_name,
        inventoryCode: c.inventory_code,
        unit:          c.unit,
        order:         c.col_order,
      }))
      .sort((a, b) => a.order - b.order),
  }));
}

export function useRentalRecaps() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: recapKeys.all, queryFn: fetchRecaps });

  useEffect(() => {
    const ch = supabase
      .channel("realtime:rental_recap")
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_recap" },
        () => qc.invalidateQueries({ queryKey: recapKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_recap_columns" },
        () => qc.invalidateQueries({ queryKey: recapKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

type RecapInputWithCols = Omit<RentalRecap, "id" | "createdAt">;

export function useAddRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecapInputWithCols) => {
      const { data, error } = await supabase.from("rental_recap").insert({
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        customer_address: input.customerAddress,
        project_id:       input.projectId,
        project_name:     input.projectName,
        notes:            input.notes,
      }).select().single();
      if (error) throw error;

      if (input.columns && input.columns.length > 0) {
        const { error: colErr } = await supabase.from("rental_recap_columns").insert(
          input.columns.map(c => ({
            recap_id:       data.id,
            inventory_id:   c.inventoryId,
            inventory_name: c.inventoryName,
            inventory_code: c.inventoryCode,
            unit:           c.unit,
            col_order:      c.order,
          }))
        );
        if (colErr) throw colErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}

export function useUpdateRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<RecapInput> }) => {
      const { error } = await supabase.from("rental_recap").update({
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        customer_address: input.customerAddress,
        project_id:       input.projectId,
        project_name:     input.projectName,
        notes:            input.notes,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}

export function useDeleteRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rental_recap").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}

// ─── Columns Mutations ───
export function useAddRecapColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recapId, col }: { recapId: string; col: Omit<RentalRecapColumn, "id" | "order"> }) => {
      // Find max order
      const { data: cols } = await supabase
        .from("rental_recap_columns")
        .select("col_order")
        .eq("recap_id", recapId);
      
      const maxOrder = cols && cols.length > 0 
        ? Math.max(...cols.map(c => c.col_order)) 
        : -1;

      const { error } = await supabase.from("rental_recap_columns").insert({
        recap_id:       recapId,
        inventory_id:   col.inventoryId,
        inventory_name: col.inventoryName,
        inventory_code: col.inventoryCode,
        unit:           col.unit,
        col_order:      maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}

export function useRemoveRecapColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colId: string) => {
      const { error } = await supabase.from("rental_recap_columns").delete().eq("id", colId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}

export function useReorderRecapColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recapId, columns }: { recapId: string; columns: RentalRecapColumn[] }) => {
      // Supabase doesn't easily support bulk upsert without constraints matching perfectly on conflict.
      // So we will do it in parallel
      const promises = columns.map(col => 
        supabase.from("rental_recap_columns").update({ col_order: col.order }).eq("id", col.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: recapKeys.all }),
  });
}
