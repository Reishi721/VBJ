/**
 * usePurchaseOrders — React Query + Supabase Realtime
 * Manages Purchase Orders: creation, editing, receiving items, and cancellation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { PurchaseOrder, PurchaseOrderItem, POStatus } from "../types";

export const poKeys = {
  all:    ["purchase_orders"] as const,
  detail: (id: string) => ["purchase_orders", id] as const,
};

// ─── Mapper ──────────────────────────────────────────────────────────────────
function mapPO(r: any, items: any[] = []): PurchaseOrder {
  return {
    id:              r.id,
    number:          r.number,
    date:            r.date,
    supplierName:    r.supplier_name,
    supplierPhone:   r.supplier_phone,
    supplierAddress: r.supplier_address,
    status:          r.status,
    items:           items.map((i: any): PurchaseOrderItem => ({
      id:            i.id,
      inventoryId:   i.inventory_id,
      inventoryCode: i.inventory_code,
      inventoryName: i.inventory_name,
      unit:          i.unit,
      qtyOrdered:    i.qty_ordered,
      qtyReceived:   i.qty_received ?? 0,
      unitPrice:     i.unit_price,
      subtotal:      i.subtotal,
      note:          i.note,
    })),
    subtotal:        r.subtotal,
    discount:        r.discount ?? 0,
    total:           r.total,
    notes:           r.notes,
    receivedBy:      r.received_by,
    receivedAt:      r.received_at,
    createdAt:       r.created_at,
  };
}

// ─── Query: all POs with items ─────────────────────────────────────────────
export function usePurchaseOrders() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: poKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`*, po_items(*)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => mapPO(r, r.po_items ?? []));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:purchase_orders_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" },
        () => qc.invalidateQueries({ queryKey: poKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "po_items" },
        () => qc.invalidateQueries({ queryKey: poKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

// ─── Mutations ─────────────────────────────────────────────────────────────
type POInput = Omit<PurchaseOrder, "id" | "createdAt" | "number">;

export function useAddPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: POInput) => {
      // Atomic number via DB function, fallback to client-side
      const { data: numData, error: numErr } = await supabase.rpc("generate_po_number");
      let number: string;
      if (numErr) {
        const { data: last } = await supabase
          .from("purchase_orders").select("number").order("created_at", { ascending: false }).limit(1).single();
        const yr = new Date().getFullYear();
        const seq = String((parseInt(last?.number?.match(/\d+$/)?.[0] ?? "0") + 1)).padStart(3, "0");
        number = `PO-${yr}-${seq}`;
      } else {
        number = numData as string;
      }

      const subtotal = input.items.reduce((s, i) => s + i.subtotal, 0);
      const total    = subtotal - (input.discount ?? 0);

      const { data: po, error } = await supabase.from("purchase_orders").insert({
        number,
        date:             input.date,
        supplier_name:    input.supplierName,
        supplier_phone:   input.supplierPhone || null,
        supplier_address: input.supplierAddress || null,
        status:           input.status ?? "draft",
        subtotal,
        discount:         input.discount ?? 0,
        total,
        notes:            input.notes || null,
      }).select().single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: iErr } = await supabase.from("po_items").insert(
          input.items.map(i => ({
            po_id:          po.id,
            inventory_id:   i.inventoryId || null,
            inventory_code: i.inventoryCode,
            inventory_name: i.inventoryName,
            unit:           i.unit,
            qty_ordered:    i.qtyOrdered,
            qty_received:   0,
            unit_price:     i.unitPrice,
            subtotal:       i.subtotal,
            note:           i.note || null,
          }))
        );
        if (iErr) throw iErr;
      }
      return po;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
      toast.success("Purchase Order berhasil dibuat");
    },
    onError: (err: Error) => toast.error(`Gagal buat PO: ${err.message}`),
  });
}

export function useUpdatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<POInput> }) => {
      const subtotal = input.items ? input.items.reduce((s, i) => s + i.subtotal, 0) : undefined;
      const total    = subtotal !== undefined ? subtotal - (input.discount ?? 0) : undefined;

      const { error } = await supabase.from("purchase_orders").update({
        date:             input.date,
        supplier_name:    input.supplierName,
        supplier_phone:   input.supplierPhone || null,
        supplier_address: input.supplierAddress || null,
        notes:            input.notes || null,
        ...(subtotal !== undefined && { subtotal, total }),
        discount:         input.discount ?? 0,
      }).eq("id", id);
      if (error) throw error;

      if (input.items !== undefined) {
        await supabase.from("po_items").delete().eq("po_id", id);
        if (input.items.length > 0) {
          const { error: iErr } = await supabase.from("po_items").insert(
            input.items.map(i => ({
              po_id:          id,
              inventory_id:   i.inventoryId || null,
              inventory_code: i.inventoryCode,
              inventory_name: i.inventoryName,
              unit:           i.unit,
              qty_ordered:    i.qtyOrdered,
              qty_received:   i.qtyReceived ?? 0,
              unit_price:     i.unitPrice,
              subtotal:       i.subtotal,
              note:           i.note || null,
            }))
          );
          if (iErr) throw iErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
      toast.success("Purchase Order diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update PO: ${err.message}`),
  });
}

export function useDeletePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("po_items").delete().eq("po_id", id);
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
      toast.success("Purchase Order dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus PO: ${err.message}`),
  });
}

/**
 * useReceivePO — terima barang dari PO (partial atau full)
 * Otomatis update stok inventory + catat ke stock_logs
 */
export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      po, receivedItems, receivedBy,
    }: {
      po: PurchaseOrder;
      receivedItems: { itemId: string; inventoryId: string; qtyReceived: number }[];
      receivedBy: string;
    }) => {
      let totalReceived = 0;
      let totalOrdered  = 0;

      for (const recv of receivedItems) {
        const poItem = po.items.find(i => i.id === recv.itemId);
        if (!poItem || recv.qtyReceived <= 0) continue;

        totalOrdered  += poItem.qtyOrdered;
        totalReceived += (poItem.qtyReceived + recv.qtyReceived);

        // Update qty_received di po_items
        const { error: itemErr } = await supabase.from("po_items").update({
          qty_received: poItem.qtyReceived + recv.qtyReceived,
        }).eq("id", recv.itemId);
        if (itemErr) throw itemErr;

        // Update stok inventory
        if (recv.inventoryId) {
          const { data: inv } = await supabase
            .from("inventory_items").select("stock, code, name").eq("id", recv.inventoryId).single();
          if (inv) {
            const newStock = inv.stock + recv.qtyReceived;
            await supabase.from("inventory_items").update({ stock: newStock }).eq("id", recv.inventoryId);
            await supabase.from("stock_logs").insert({
              inventory_id:     recv.inventoryId,
              inventory_code:   inv.code,
              inventory_name:   inv.name,
              change_type:      "po_receive",
              qty_before:       inv.stock,
              qty_change:       recv.qtyReceived,
              qty_after:        newStock,
              reference_id:     po.id,
              reference_type:   "purchase_order",
              reference_number: po.number,
              notes:            `Penerimaan dari PO ${po.number}`,
              created_by:       receivedBy,
            });
          }
        }
      }

      // Update PO status
      const allItems = await supabase.from("po_items").select("qty_ordered, qty_received").eq("po_id", po.id);
      const items = allItems.data ?? [];
      const allReceived  = items.every(i => i.qty_received >= i.qty_ordered);
      const someReceived = items.some(i => (i.qty_received ?? 0) > 0);
      const newStatus: POStatus = allReceived ? "completed" : someReceived ? "partial" : "ordered";

      await supabase.from("purchase_orders").update({
        status:      newStatus,
        received_by: receivedBy,
        received_at: new Date().toISOString(),
      }).eq("id", po.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Penerimaan barang berhasil dicatat — stok diperbarui ✓");
    },
    onError: (err: Error) => toast.error(`Gagal terima barang: ${err.message}`),
  });
}

/**
 * useCancelPO — batalkan PO dan rollback stok yang sudah diterima
 */
export function useCancelPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (po: PurchaseOrder) => {
      if (po.status === "cancelled") return;

      // Rollback stok untuk item yang sudah diterima
      for (const item of po.items) {
        if (!item.inventoryId || !item.qtyReceived) continue;
        const { data: inv } = await supabase
          .from("inventory_items").select("stock, code, name").eq("id", item.inventoryId).single();
        if (!inv) continue;

        const newStock = Math.max(0, inv.stock - item.qtyReceived);
        await supabase.from("inventory_items").update({ stock: newStock }).eq("id", item.inventoryId);
        await supabase.from("stock_logs").insert({
          inventory_id:     item.inventoryId,
          inventory_code:   inv.code,
          inventory_name:   inv.name,
          change_type:      "adjustment",
          qty_before:       inv.stock,
          qty_change:       -item.qtyReceived,
          qty_after:        newStock,
          reference_id:     po.id,
          reference_type:   "purchase_order",
          reference_number: po.number,
          notes:            `Rollback pembatalan PO ${po.number}`,
        });
      }

      const { error } = await supabase.from("purchase_orders")
        .update({ status: "cancelled" }).eq("id", po.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("PO dibatalkan — stok yang sudah diterima telah dikembalikan");
    },
    onError: (err: Error) => toast.error(`Gagal batalkan PO: ${err.message}`),
  });
}
