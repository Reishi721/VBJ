/**
 * useSuratPerjanjian — React Query + Supabase
 * CRUD untuk Surat Perjanjian Sewa Menyewa
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  SuratPerjanjian,
  SuratPerjanjianItem,
  PihakPertama,
  RentalPriceList,
} from "../types";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const spKeys = {
  all:        ["surat_perjanjian"] as const,
  detail:     (id: string) => ["surat_perjanjian", id] as const,
  pihak1:     ["pihak_pertama"] as const,
  priceList:  ["rental_price_list"] as const,
};

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapItem(r: any): SuratPerjanjianItem {
  return {
    id:            r.id,
    inventoryId:   r.inventory_id,
    inventoryName: r.inventory_name,
    inventoryCode: r.inventory_code,
    categoryId:    r.category_id,
    categoryName:  r.category_name,
    hargaGanti:    r.harga_ganti ?? 0,
    hargaSewa:     r.harga_sewa ?? 0,
    satuan:        r.satuan ?? "pc",
    qty:           r.qty ?? 0,
    jumlah:        r.jumlah ?? 0,
    itemOrder:     r.item_order ?? 0,
    note:          r.note,
  };
}

function mapSP(row: any): SuratPerjanjian {
  return {
    id:                     row.id,
    number:                 row.number,
    date:                   row.date,
    pihakPertamaId:         row.pihak_pertama_id,
    pihakPertamaName:       row.pihak_pertama_name,
    pihakPertamaAddress:    row.pihak_pertama_address,
    pihakPertamaPhone:      row.pihak_pertama_phone,
    pihakPertamaPosition:   row.pihak_pertama_position,
    customerId:             row.customer_id,
    customerName:           row.customer_name,
    customerAddress:        row.customer_address,
    customerPhone:          row.customer_phone,
    customerFax:            row.customer_fax,
    customerWakil:          row.customer_wakil,
    projectLocation:        row.project_location,
    lamaSewa:               row.lama_sewa,
    pembayaranSelanjutnya:  row.pembayaran_selanjutnya,
    caraPembayaran:         row.cara_pembayaran,
    transportFee:           row.transport_fee ?? 0,
    uangJaminan:            row.uang_jaminan ?? 0,
    total:                  row.total ?? 0,
    status:                 row.status,
    notes:                  row.notes,
    createdAt:              row.created_at,
    items: (row.items ?? []).map(mapItem),
  };
}

// ─── Fetch All ────────────────────────────────────────────────────────────────
async function fetchSuratPerjanjian(): Promise<SuratPerjanjian[]> {
  const { data, error } = await supabase
    .from("surat_perjanjian")
    .select(`*, items:surat_perjanjian_items(*)`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSP);
}

export function useSuratPerjanjian() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: spKeys.all,
    queryFn:  fetchSuratPerjanjian,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`sp_realtime_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_perjanjian" },
        () => qc.invalidateQueries({ queryKey: spKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_perjanjian_items" },
        () => qc.invalidateQueries({ queryKey: spKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

// ─── Generate Number ──────────────────────────────────────────────────────────
async function generateSPNumber(): Promise<string> {
  // Atomic number generation via DB RPC (prevents duplicates)
  try {
    const { data: rpcNum } = await supabase.rpc("generate_sp_number");
    if (rpcNum) return rpcNum;
  } catch {
    // Fallback: client-side generation if RPC not available
  }

  const year = new Date().getFullYear();
  const prefix = `SP-${year}-`;
  
  const { data: lastSP } = await supabase
    .from("surat_perjanjian")
    .select("number")
    .ilike("number", `SP-${year}-%`)
    .order("number", { ascending: false })
    .limit(1)
    .single();
  
  const lastNoStr = lastSP?.number?.split('-').pop() ?? "0";
  const parsedNo = parseInt(lastNoStr);
  const seq = ((isNaN(parsedNo) ? 0 : parsedNo) + 1).toString().padStart(3, "0");
  return `${prefix}${seq}`;
}

// ─── Add ──────────────────────────────────────────────────────────────────────
export type SPInput = Omit<SuratPerjanjian, "id" | "createdAt" | "number">;

export function useAddSuratPerjanjian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SPInput) => {
      const number = await generateSPNumber();

      const { data, error } = await supabase
        .from("surat_perjanjian")
        .insert({
          number,
          date:                     input.date,
          pihak_pertama_id:         input.pihakPertamaId || null,
          pihak_pertama_name:       input.pihakPertamaName,
          pihak_pertama_address:    input.pihakPertamaAddress,
          pihak_pertama_phone:      input.pihakPertamaPhone,
          pihak_pertama_position:   input.pihakPertamaPosition,
          customer_id:              input.customerId || null,
          customer_name:            input.customerName,
          customer_address:         input.customerAddress,
          customer_phone:           input.customerPhone || null,
          customer_fax:             input.customerFax || null,
          customer_wakil:           input.customerWakil || null,
          project_location:         input.projectLocation || null,
          lama_sewa:                input.lamaSewa || null,
          pembayaran_selanjutnya:   input.pembayaranSelanjutnya || null,
          cara_pembayaran:          input.caraPembayaran,
          transport_fee:            input.transportFee ?? 0,
          uang_jaminan:             input.uangJaminan ?? 0,
          total:                    input.total ?? 0,
          status:                   input.status ?? "draft",
          notes:                    input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert items
      if (input.items.length > 0) {
        const { error: itemErr } = await supabase.from("surat_perjanjian_items").insert(
          input.items.map((it, idx) => ({
            surat_perjanjian_id: data.id,
            inventory_id:        it.inventoryId || null,
            inventory_name:      it.inventoryName,
            inventory_code:      it.inventoryCode,
            category_id:         it.categoryId || null,
            category_name:       it.categoryName || null,
            harga_ganti:         it.hargaGanti ?? 0,
            harga_sewa:          it.hargaSewa ?? 0,
            satuan:              it.satuan,
            qty:                 it.qty ?? 0,
            jumlah:              it.jumlah ?? 0,
            item_order:          it.itemOrder ?? idx,
            note:                it.note || null,
          }))
        );
        if (itemErr) throw itemErr;
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.all }),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function useUpdateSuratPerjanjian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SPInput }) => {
      const { error } = await supabase
        .from("surat_perjanjian")
        .update({
          date:                     input.date,
          pihak_pertama_id:         input.pihakPertamaId || null,
          pihak_pertama_name:       input.pihakPertamaName,
          pihak_pertama_address:    input.pihakPertamaAddress,
          pihak_pertama_phone:      input.pihakPertamaPhone,
          pihak_pertama_position:   input.pihakPertamaPosition,
          customer_id:              input.customerId || null,
          customer_name:            input.customerName,
          customer_address:         input.customerAddress,
          customer_phone:           input.customerPhone || null,
          customer_fax:             input.customerFax || null,
          customer_wakil:           input.customerWakil || null,
          project_location:         input.projectLocation || null,
          lama_sewa:                input.lamaSewa || null,
          pembayaran_selanjutnya:   input.pembayaranSelanjutnya || null,
          cara_pembayaran:          input.caraPembayaran,
          transport_fee:            input.transportFee ?? 0,
          uang_jaminan:             input.uangJaminan ?? 0,
          total:                    input.total ?? 0,
          status:                   input.status,
          notes:                    input.notes || null,
        })
        .eq("id", id);
      if (error) throw error;

      // Replace items
      await supabase.from("surat_perjanjian_items").delete().eq("surat_perjanjian_id", id);
      if (input.items.length > 0) {
        const { error: itemErr } = await supabase.from("surat_perjanjian_items").insert(
          input.items.map((it, idx) => ({
            surat_perjanjian_id: id,
            inventory_id:        it.inventoryId || null,
            inventory_name:      it.inventoryName,
            inventory_code:      it.inventoryCode,
            category_id:         it.categoryId || null,
            category_name:       it.categoryName || null,
            harga_ganti:         it.hargaGanti ?? 0,
            harga_sewa:          it.hargaSewa ?? 0,
            satuan:              it.satuan,
            qty:                 it.qty ?? 0,
            jumlah:              it.jumlah ?? 0,
            item_order:          it.itemOrder ?? idx,
            note:                it.note || null,
          }))
        );
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.all }),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteSuratPerjanjian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surat_perjanjian").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.all }),
  });
}

// ═══════════════════════════════════════════════════════════════
// PIHAK PERTAMA
// ═══════════════════════════════════════════════════════════════
function mapPihak(r: any): PihakPertama {
  return {
    id:        r.id,
    name:      r.name,
    address:   r.address,
    phone:     r.phone,
    position:  r.position,
    isDefault: r.is_default ?? false,
    createdAt: r.created_at,
  };
}

export function usePihakPertama() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: spKeys.pihak1,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("pihak_pertama")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPihak);
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`pihak1_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pihak_pertama" },
        () => qc.invalidateQueries({ queryKey: spKeys.pihak1 }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useAddPihakPertama() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<PihakPertama, "id" | "createdAt">) => {
      const { error } = await supabase.from("pihak_pertama").insert({
        name:       input.name,
        address:    input.address,
        phone:      input.phone,
        position:   input.position,
        is_default: input.isDefault,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.pihak1 }),
  });
}

export function useUpdatePihakPertama() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Omit<PihakPertama, "id" | "createdAt"> }) => {
      const { error } = await supabase.from("pihak_pertama").update({
        name:       input.name,
        address:    input.address,
        phone:      input.phone,
        position:   input.position,
        is_default: input.isDefault,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.pihak1 }),
  });
}

export function useDeletePihakPertama() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pihak_pertama").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.pihak1 }),
  });
}

// ═══════════════════════════════════════════════════════════════
// RENTAL PRICE LIST
// ═══════════════════════════════════════════════════════════════
function mapPrice(r: any): RentalPriceList {
  return {
    id:            r.id,
    inventoryId:   r.inventory_id,
    inventoryName: r.inventory_name,
    inventoryCode: r.inventory_code,
    categoryId:    r.category_id,
    categoryName:  r.category_name,
    hargaGanti:    r.harga_ganti ?? 0,
    hargaSewa:     r.harga_sewa ?? 0,
    satuan:        r.satuan ?? "pc",
  };
}

export function useRentalPriceList() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: spKeys.priceList,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("rental_price_list")
        .select("*")
        .order("category_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPrice);
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`price_list_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_price_list" },
        () => qc.invalidateQueries({ queryKey: spKeys.priceList }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useUpsertRentalPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<RentalPriceList, "id"> & { id?: string }) => {
      const payload = {
        inventory_id:   input.inventoryId,
        inventory_name: input.inventoryName,
        inventory_code: input.inventoryCode,
        category_id:    input.categoryId || null,
        category_name:  input.categoryName || null,
        harga_ganti:    input.hargaGanti ?? 0,
        harga_sewa:     input.hargaSewa ?? 0,
        satuan:         input.satuan,
      };
      if (input.id) {
        const { error } = await supabase
          .from("rental_price_list")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("rental_price_list")
          .upsert(payload, { onConflict: "inventory_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: spKeys.priceList }),
  });
}
