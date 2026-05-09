/**
 * useInventory — React Query + Supabase Realtime
 * Menggantikan useInventoryStore
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { InventoryItem, InventoryCategory } from "../types";

export const inventoryKeys = {
  items:      ["inventory", "items"] as const,
  categories: ["inventory", "categories"] as const,
};

// ─── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, category:inventory_categories(name, color)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id:           r.id,
    categoryId:   r.category_id,
    categoryName: r.category?.name ?? "",
    name:         r.name,
    code:         r.code,
    unit:         r.unit,
    stock:        r.stock,
    minStock:     r.min_stock,
    condition:    r.condition,
    location:     r.location,
    description:  r.description,
    createdAt:    r.created_at,
  }));
}

async function fetchCategories(): Promise<InventoryCategory[]> {
  const { data, error } = await supabase
    .from("inventory_categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id:          r.id,
    name:        r.name,
    description: r.description,
    color:       r.color,
    createdAt:   r.created_at,
  }));
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export function useInventoryItems() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: inventoryKeys.items, queryFn: fetchInventoryItems });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:inventory_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" },
        () => qc.invalidateQueries({ queryKey: inventoryKeys.items }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useInventoryCategories() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: inventoryKeys.categories, queryFn: fetchCategories });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:inv_categories_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_categories" },
        () => qc.invalidateQueries({ queryKey: inventoryKeys.categories }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

// ─── Mutations: Items ─────────────────────────────────────────────────────────
type ItemInput = Omit<InventoryItem, "id" | "createdAt" | "categoryName">;

const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);
export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      const { error } = await supabase.from("inventory_items").insert({
        category_id: input.categoryId,
        name:        input.name,
        code:        input.code,
        unit:        input.unit,
        stock:       input.stock,
        min_stock:   input.minStock,
        condition:   input.condition,
        location:    orNull(input.location),
        description: orNull(input.description),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.items });
      toast.success("Barang berhasil ditambahkan");
    },
    onError: (err: Error) => toast.error(`Gagal tambah barang: ${err.message}`),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ItemInput> }) => {
      const { error } = await supabase.from("inventory_items").update({
        category_id: input.categoryId,
        name:        input.name,
        code:        input.code,
        unit:        input.unit,
        stock:       input.stock,
        min_stock:   input.minStock,
        condition:   input.condition,
        location:    orNull(input.location),
        description: orNull(input.description),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.items });
      toast.success("Barang berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update barang: ${err.message}`),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.items });
      toast.success("Barang dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus barang: ${err.message}`),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId, qty, type, reason, userId,
    }: { itemId: string; qty: number; type: "in" | "out" | "adjustment"; reason: string; userId?: string }) => {
      // Get current item data (stock + code + name for log)
      const { data: item, error: fetchErr } = await supabase
        .from("inventory_items").select("stock, code, name").eq("id", itemId).single();
      if (fetchErr) throw fetchErr;

      const newStock = type === "in"
        ? item.stock + qty
        : type === "out"
        ? item.stock - qty
        : qty;

      if (newStock < 0) throw new Error("Stok tidak boleh negatif");

      const { error: updateErr } = await supabase
        .from("inventory_items").update({ stock: newStock }).eq("id", itemId);
      if (updateErr) throw updateErr;

      // Map hook type to DB change_type
      const changeTypeMap: Record<string, string> = {
        in: "manual_in",
        out: "manual_out",
        adjustment: "adjustment",
      };

      // Log the adjustment — column names match supabase_schema.sql stock_logs table
      const { error: logErr } = await supabase.from("stock_logs").insert({
        inventory_id:    itemId,
        inventory_code:  item.code,
        inventory_name:  item.name,
        change_type:     changeTypeMap[type] ?? "adjustment",
        qty_before:      item.stock,
        qty_change:      type === "out" ? -qty : qty,
        qty_after:       newStock,
        reference_type:  "manual",
        notes:           reason,
        created_by:      userId,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.items });
      toast.success("Stok berhasil disesuaikan");
    },
    onError: (err: Error) => toast.error(`Gagal sesuaikan stok: ${err.message}`),
  });
}

// ─── Mutations: Categories ─────────────────────────────────────────────────────
export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<InventoryCategory, "id" | "createdAt">) => {
      const { error } = await supabase.from("inventory_categories").insert({
        name: input.name, description: input.description, color: input.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.categories });
      toast.success("Kategori berhasil ditambahkan");
    },
    onError: (err: Error) => toast.error(`Gagal tambah kategori: ${err.message}`),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<InventoryCategory> }) => {
      const { error } = await supabase.from("inventory_categories").update({
        name: input.name, description: input.description, color: input.color,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.categories });
      toast.success("Kategori berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update kategori: ${err.message}`),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.categories });
      toast.success("Kategori dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus kategori: ${err.message}`),
  });
}

// ─── Combined convenience hook ────────────────────────────────────────────────
/**
 * useInventory — returns { data: { items, categories }, isLoading }
 * Convenience wrapper over useInventoryItems + useInventoryCategories
 */
export function useInventory() {
  const { data: items = [],      isLoading: l1 } = useInventoryItems();
  const { data: categories = [], isLoading: l2 } = useInventoryCategories();
  return {
    data: { items, categories },
    isLoading: l1 || l2,
  };
}
