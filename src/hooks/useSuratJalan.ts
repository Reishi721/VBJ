/**
 * useSuratJalan — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { SuratJalan, SuratJalanItem } from "../types";

export const sjKeys = {
  all:    ["surat_jalan"] as const,
  detail: (id: string) => ["surat_jalan", id] as const,
};

async function fetchSuratJalan(): Promise<SuratJalan[]> {
  const { data, error } = await supabase
    .from("surat_jalan")
    .select("*, items:surat_jalan_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r: any): SuratJalan => ({
    id:              r.id,
    number:          r.number,
    type:            r.type,
    date:            r.date,
    customerId:      r.customer_id,
    customerName:    r.customer_name,
    projectId:       r.project_id,
    projectName:     r.project_name,
    recipientName:   r.recipient_name,
    recipientPhone:  r.recipient_phone,
    deliveryAddress: r.delivery_address,
    driverName:      r.driver_name ?? "",
    vehiclePlate:    r.vehicle_plate ?? "",
    status:          r.status,
    notes:           r.notes,
    createdAt:       r.created_at,
    items: (r.items ?? []).map((i: any): SuratJalanItem => ({
      inventoryId:   i.inventory_id,
      inventoryCode: i.inventory_code,
      inventoryName: i.inventory_name,
      unit:          i.unit,
      qty:           i.qty,
      note:          i.note,
    })),
  }));
}

export function useSuratJalan() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: sjKeys.all, queryFn: fetchSuratJalan });

  useEffect(() => {
    const ch = supabase
      .channel("realtime:surat_jalan")
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_jalan" },
        () => qc.invalidateQueries({ queryKey: sjKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_jalan_items" },
        () => qc.invalidateQueries({ queryKey: sjKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

type SJInput = Omit<SuratJalan, "id" | "createdAt" | "number">;

export function useAddSuratJalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SJInput) => {
      // Auto-generate number
      const { data: lastSj } = await supabase
        .from("surat_jalan")
        .select("number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const year = new Date().getFullYear();
      const lastNo = lastSj?.number?.match(/\d+$/)?.[0] ?? "0";
      const nextNo = String(parseInt(lastNo) + 1).padStart(3, "0");
      const number = `SJ-${year}-${nextNo}`;

      const { data, error } = await supabase.from("surat_jalan").insert({
        number,
        type:             input.type,
        date:             input.date,
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        project_id:       input.projectId,
        project_name:     input.projectName,
        recipient_name:   input.recipientName,
        recipient_phone:  input.recipientPhone,
        delivery_address: input.deliveryAddress,
        driver_name:      input.driverName,
        vehicle_plate:    input.vehiclePlate,
        status:           input.status,
        notes:            input.notes,
      }).select().single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: iErr } = await supabase.from("surat_jalan_items").insert(
          input.items.map(i => ({
            surat_jalan_id:  data.id,
            inventory_id:    i.inventoryId,
            inventory_code:  i.inventoryCode,
            inventory_name:  i.inventoryName,
            unit:            i.unit,
            qty:             i.qty,
            note:            i.note,
          }))
        );
        if (iErr) throw iErr;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sjKeys.all }),
  });
}

export function useUpdateSuratJalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<SJInput> }) => {
      const { error } = await supabase.from("surat_jalan").update({
        type:             input.type,
        date:             input.date,
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        project_id:       input.projectId,
        project_name:     input.projectName,
        recipient_name:   input.recipientName,
        recipient_phone:  input.recipientPhone,
        delivery_address: input.deliveryAddress,
        driver_name:      input.driverName,
        vehicle_plate:    input.vehiclePlate,
        status:           input.status,
        notes:            input.notes,
      }).eq("id", id);
      if (error) throw error;

      if (input.items !== undefined) {
        await supabase.from("surat_jalan_items").delete().eq("surat_jalan_id", id);
        if (input.items.length > 0) {
          const { error: iErr } = await supabase.from("surat_jalan_items").insert(
            input.items.map(i => ({
              surat_jalan_id:  id,
              inventory_id:    i.inventoryId,
              inventory_code:  i.inventoryCode,
              inventory_name:  i.inventoryName,
              unit:            i.unit,
              qty:             i.qty,
              note:            i.note,
            }))
          );
          if (iErr) throw iErr;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sjKeys.all }),
  });
}

export function useDeleteSuratJalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("surat_jalan_items").delete().eq("surat_jalan_id", id);
      const { error } = await supabase.from("surat_jalan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sjKeys.all }),
  });
}
