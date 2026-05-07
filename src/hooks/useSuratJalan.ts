/**
 * useSuratJalan — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
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
      .channel(`realtime:surat_jalan_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_jalan" },
        () => qc.invalidateQueries({ queryKey: sjKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_jalan_items" },
        () => qc.invalidateQueries({ queryKey: sjKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

type SJInput = Omit<SuratJalan, "id" | "createdAt" | "number"> & { number?: string; };

const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

export function useAddSuratJalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SJInput) => {
      let numberToUse = input.number;
      if (!numberToUse || numberToUse.trim() === "") {
        // Auto-generate number secara atomic via PostgreSQL sequence
        const { data: numberData, error: numErr } = await supabase
          .rpc("generate_surat_jalan_number");
        if (numErr) {
          // Fallback: client-side generation jika fungsi belum di-deploy
          const { data: lastSj } = await supabase
            .from("surat_jalan").select("number").order("created_at", { ascending: false }).limit(1).single();
          const year = new Date().getFullYear();
          const lastNo = lastSj?.number?.match(/\d+$/)?.[0] ?? "0";
          const nextNo = String(parseInt(lastNo) + 1).padStart(3, "0");
          numberToUse = `SJ-${year}-${nextNo}`;
        } else {
          numberToUse = numberData as string;
        }
      }

      const { data, error } = await supabase.from("surat_jalan").insert({
        number: numberToUse,
        type:             input.type,
        date:             input.date,
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        project_id:       input.projectId || null,
        project_name:     orNull(input.projectName),
        recipient_name:   input.recipientName,
        recipient_phone:  orNull(input.recipientPhone),
        delivery_address: input.deliveryAddress,
        driver_name:      input.driverName?.trim() || "",
        vehicle_plate:    input.vehiclePlate?.trim() || "",
        status:           input.status,
        notes:            orNull(input.notes),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sjKeys.all });
      toast.success("Surat Jalan berhasil dibuat");
    },
    onError: (err: Error) => toast.error(`Gagal buat Surat Jalan: ${err.message}`),
  });
}

export function useUpdateSuratJalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<SJInput> }) => {
      const updatePayload: any = {
        type:             input.type,
        date:             input.date,
        customer_id:      input.customerId,
        customer_name:    input.customerName,
        project_id:       input.projectId || null,
        project_name:     orNull(input.projectName),
        recipient_name:   input.recipientName,
        recipient_phone:  orNull(input.recipientPhone),
        delivery_address: input.deliveryAddress,
        driver_name:      input.driverName?.trim() || "",
        vehicle_plate:    input.vehiclePlate?.trim() || "",
        status:           input.status,
        notes:            orNull(input.notes),
      };
      if (input.number) {
        updatePayload.number = input.number;
      }

      const { error } = await supabase.from("surat_jalan").update(updatePayload).eq("id", id);
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sjKeys.all });
      toast.success("Surat Jalan berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update Surat Jalan: ${err.message}`),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sjKeys.all });
      toast.success("Surat Jalan dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus Surat Jalan: ${err.message}`),
  });
}

/**
 * useUpdateSJStatus — ubah status SJ + sinkronisasi stok otomatis
 * - pengiriman → delivered  : stok berkurang (sj_out)
 * - pengembalian → delivered : stok bertambah (sj_in)
 * - apa pun → cancelled     : rollback stok jika sebelumnya delivered
 */
export function useUpdateSJStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sj, newStatus,
    }: {
      sj: SuratJalan;
      newStatus: SuratJalan["status"];
    }) => {
      const oldStatus = sj.status;

      // 1. Update status di DB
      const { error: statusErr } = await supabase
        .from("surat_jalan")
        .update({ status: newStatus })
        .eq("id", sj.id);
      if (statusErr) throw statusErr;

      const wasDelivered     = oldStatus === "delivered";
      const becomesDelivered = newStatus === "delivered";
      const becomesCancelled = newStatus === "cancelled";

      // 2. Baru saja delivered → efekkan ke stok
      if (becomesDelivered && !wasDelivered) {
        for (const item of sj.items) {
          if (!item.inventoryId) continue;
          const { data: inv } = await supabase
            .from("inventory_items").select("stock, code, name").eq("id", item.inventoryId).single();
          if (!inv) continue;

          const isOut     = sj.type === "pengiriman";
          const qtyChange = isOut ? -item.qty : item.qty;
          const newStock  = Math.max(0, inv.stock + qtyChange);

          await supabase.from("inventory_items").update({ stock: newStock }).eq("id", item.inventoryId);
          await supabase.from("stock_logs").insert({
            inventory_id:     item.inventoryId,
            inventory_code:   inv.code,
            inventory_name:   inv.name,
            change_type:      isOut ? "sj_out" : "sj_in",
            qty_before:       inv.stock,
            qty_change:       qtyChange,
            qty_after:        newStock,
            reference_id:     sj.id,
            reference_type:   "surat_jalan",
            reference_number: sj.number,
            notes:            `${isOut ? "Pengiriman" : "Pengembalian"} via ${sj.number}`,
          });
        }
      }

      // 3. Dibatalkan tapi sebelumnya sudah delivered → rollback stok
      if (becomesCancelled && wasDelivered) {
        for (const item of sj.items) {
          if (!item.inventoryId) continue;
          const { data: inv } = await supabase
            .from("inventory_items").select("stock, code, name").eq("id", item.inventoryId).single();
          if (!inv) continue;

          const wasOut    = sj.type === "pengiriman";
          const qtyChange = wasOut ? item.qty : -item.qty; // kebalikan dari arah semula
          const newStock  = Math.max(0, inv.stock + qtyChange);

          await supabase.from("inventory_items").update({ stock: newStock }).eq("id", item.inventoryId);
          await supabase.from("stock_logs").insert({
            inventory_id:     item.inventoryId,
            inventory_code:   inv.code,
            inventory_name:   inv.name,
            change_type:      "adjustment",
            qty_before:       inv.stock,
            qty_change:       qtyChange,
            qty_after:        newStock,
            reference_id:     sj.id,
            reference_type:   "surat_jalan",
            reference_number: sj.number,
            notes:            `Rollback pembatalan SJ ${sj.number}`,
          });
        }
      }
    },
    onSuccess: (_data, { newStatus }) => {
      qc.invalidateQueries({ queryKey: sjKeys.all });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      const msgs: Record<string, string> = {
        sent:      "Status diubah ke Dikirim",
        delivered: "Surat Jalan diterima — stok telah diperbarui otomatis ✓",
        cancelled: "Surat Jalan dibatalkan — stok dikembalikan",
        draft:     "Status diubah ke Draft",
      };
      toast.success(msgs[newStatus] ?? "Status diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal ubah status: ${err.message}`),
  });
}
