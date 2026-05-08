/**
 * useDeliveryLists — React Query + Supabase Realtime
 * Manage delivery lists (daftar kebutuhan pengiriman customer)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { DeliveryList, DeliveryListItem, DeliveryListShipment } from "../types";

export const dlKeys = {
  all:    ["delivery_lists"] as const,
  detail: (id: string) => ["delivery_lists", id] as const,
};

// ─── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchDeliveryLists(): Promise<DeliveryList[]> {
  const { data, error } = await supabase
    .from("delivery_lists")
    .select(`
      *,
      items:delivery_list_items(*),
      shipments:delivery_list_shipments(*)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r: any): DeliveryList => ({
    id:           r.id,
    customerId:   r.customer_id,
    customerName: r.customer_name,
    projectId:    r.project_id,
    projectName:  r.project_name,
    title:        r.title,
    orderQty:     r.order_qty,
    unitLabel:    r.unit_label,
    status:       r.status,
    notes:        r.notes,
    createdAt:    r.created_at,
    items: (r.items ?? []).map((i: any): DeliveryListItem => ({
      id:             i.id,
      deliveryListId: i.delivery_list_id,
      inventoryId:    i.inventory_id,
      inventoryCode:  i.inventory_code,
      inventoryName:  i.inventory_name,
      unit:           i.unit,
      qtyNeeded:      i.qty_needed,
      qtySent:        i.qty_sent,
    })),
    shipments: (r.shipments ?? []).map((s: any): DeliveryListShipment => ({
      id:                 s.id,
      deliveryListId:     s.delivery_list_id,
      deliveryListItemId: s.delivery_list_item_id,
      suratJalanId:       s.surat_jalan_id,
      suratJalanNumber:   s.surat_jalan_number,
      qtyShipped:         s.qty_shipped,
      shipDate:           s.ship_date,
      createdAt:          s.created_at,
    })),
  }));
}

// ─── Hook: daftar delivery lists ───────────────────────────────────────────────
export function useDeliveryLists() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: dlKeys.all, queryFn: fetchDeliveryLists });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:delivery_lists_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_lists" },
        () => qc.invalidateQueries({ queryKey: dlKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_list_items" },
        () => qc.invalidateQueries({ queryKey: dlKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_list_shipments" },
        () => qc.invalidateQueries({ queryKey: dlKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

// ─── Types for input ──────────────────────────────────────────────────────────
type DLInput = {
  customerId: string;
  customerName: string;
  projectId?: string;
  projectName?: string;
  title: string;
  orderQty: number;
  unitLabel: string;
  status: DeliveryList["status"];
  notes?: string;
  items: (Omit<DeliveryListItem, "id" | "deliveryListId"> & { id?: string })[];
};

const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

// ─── Add ──────────────────────────────────────────────────────────────────────
export function useAddDeliveryList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DLInput) => {
      const { data, error } = await supabase.from("delivery_lists").insert({
        customer_id:   input.customerId,
        customer_name: input.customerName,
        project_id:    input.projectId || null,
        project_name:  orNull(input.projectName),
        title:         input.title,
        order_qty:     input.orderQty,
        unit_label:    input.unitLabel,
        status:        input.status,
        notes:         orNull(input.notes),
      }).select().single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: iErr } = await supabase.from("delivery_list_items").insert(
          input.items.map(i => ({
            delivery_list_id: data.id,
            inventory_id:     i.inventoryId || null,
            inventory_code:   i.inventoryCode,
            inventory_name:   i.inventoryName,
            unit:             i.unit,
            qty_needed:       i.qtyNeeded,
            qty_sent:         i.qtySent || 0,
          }))
        );
        if (iErr) throw iErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dlKeys.all });
      toast.success("Daftar Pengiriman berhasil dibuat");
    },
    onError: (err: Error) => toast.error(`Gagal buat Daftar Pengiriman: ${err.message}`),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function useUpdateDeliveryList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DLInput> }) => {
      const { error } = await supabase.from("delivery_lists").update({
        customer_id:   input.customerId,
        customer_name: input.customerName,
        project_id:    input.projectId || null,
        project_name:  orNull(input.projectName),
        title:         input.title,
        order_qty:     input.orderQty,
        unit_label:    input.unitLabel,
        status:        input.status,
        notes:         orNull(input.notes),
      }).eq("id", id);
      if (error) throw error;

      if (input.items !== undefined) {
        // Selective update to avoid wiping out delivery_list_shipments ON DELETE CASCADE
        const { data: existing } = await supabase.from("delivery_list_items").select("id").eq("delivery_list_id", id);
        const existingIds = existing?.map((i: any) => i.id) || [];
        const idsToKeep = input.items.filter(i => i.id).map(i => i.id as string);
        const idsToDelete = existingIds.filter((eid: string) => !idsToKeep.includes(eid));

        if (idsToDelete.length > 0) {
          await supabase.from("delivery_list_items").delete().in("id", idsToDelete);
        }

        for (const item of input.items) {
          if (item.id) {
            const { error: updErr } = await supabase.from("delivery_list_items").update({
              inventory_id:     item.inventoryId || null,
              inventory_code:   item.inventoryCode,
              inventory_name:   item.inventoryName,
              unit:             item.unit,
              qty_needed:       item.qtyNeeded,
              // Note: qty_sent is intentionally NOT updated here to preserve shipment integrity
            }).eq("id", item.id);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase.from("delivery_list_items").insert({
              delivery_list_id: id,
              inventory_id:     item.inventoryId || null,
              inventory_code:   item.inventoryCode,
              inventory_name:   item.inventoryName,
              unit:             item.unit,
              qty_needed:       item.qtyNeeded,
              qty_sent:         item.qtySent || 0,
            });
            if (insErr) throw insErr;
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dlKeys.all });
      toast.success("Daftar Pengiriman berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update Daftar Pengiriman: ${err.message}`),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteDeliveryList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Cascading deletes handle items and shipments
      const { error } = await supabase.from("delivery_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dlKeys.all });
      toast.success("Daftar Pengiriman dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus Daftar Pengiriman: ${err.message}`),
  });
}

// ─── Link Shipment (Hubungkan ke Surat Jalan) ────────────────────────────────
export function useLinkShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      deliveryListId: string;
      deliveryListItemId: string;
      suratJalanId: string;
      suratJalanNumber: string;
      qtyShipped: number;
      shipDate: string;
    }) => {
      // 1. Insert shipment record
      const { error: sErr } = await supabase.from("delivery_list_shipments").insert({
        delivery_list_id:       input.deliveryListId,
        delivery_list_item_id:  input.deliveryListItemId,
        surat_jalan_id:         input.suratJalanId,
        surat_jalan_number:     input.suratJalanNumber,
        qty_shipped:            input.qtyShipped,
        ship_date:              input.shipDate,
      });
      if (sErr) throw sErr;

      // 2. Update qty_sent in item
      const { data: item, error: fetchErr } = await supabase
        .from("delivery_list_items")
        .select("qty_sent")
        .eq("id", input.deliveryListItemId)
        .single();
      if (fetchErr) throw fetchErr;

      const newQtySent = (item?.qty_sent || 0) + input.qtyShipped;
      const { error: updateErr } = await supabase
        .from("delivery_list_items")
        .update({ qty_sent: newQtySent })
        .eq("id", input.deliveryListItemId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dlKeys.all });
      toast.success("Pengiriman berhasil dicatat");
    },
    onError: (err: Error) => toast.error(`Gagal catat pengiriman: ${err.message}`),
  });
}

// ─── Delete Shipment ──────────────────────────────────────────────────────────
export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      shipmentId: string;
      deliveryListItemId: string;
      qtyShipped: number;
    }) => {
      // 1. Delete the shipment
      const { error: delErr } = await supabase
        .from("delivery_list_shipments")
        .delete()
        .eq("id", input.shipmentId);
      if (delErr) throw delErr;

      // 2. Decrease qty_sent in item
      const { data: item, error: fetchErr } = await supabase
        .from("delivery_list_items")
        .select("qty_sent")
        .eq("id", input.deliveryListItemId)
        .single();
      if (fetchErr) throw fetchErr;

      const newQtySent = Math.max(0, (item?.qty_sent || 0) - input.qtyShipped);
      const { error: updateErr } = await supabase
        .from("delivery_list_items")
        .update({ qty_sent: newQtySent })
        .eq("id", input.deliveryListItemId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dlKeys.all });
      toast.success("Record pengiriman dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus record: ${err.message}`),
  });
}
