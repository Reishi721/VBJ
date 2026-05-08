/**
 * useHelpers — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { Helper } from "../types";

export const helperKeys = {
  all: ["helpers"] as const,
  detail: (id: string) => ["helpers", id] as const,
};

async function fetchHelpers(): Promise<Helper[]> {
  const { data, error } = await supabase
    .from("helpers")
    .select("*")
    .order("name");
  if (error) throw error;

  type HelperRow = {
    id: string;
    name: string;
    phone?: string | null;
    status: Helper["status"];
    created_at: string;
    updated_at: string;
  };

  const rows = (data ?? []) as HelperRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function useHelpers() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: helperKeys.all, queryFn: fetchHelpers });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:helpers_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "helpers" },
        () => qc.invalidateQueries({ queryKey: helperKeys.all })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return query;
}

type HelperInput = Omit<Helper, "id" | "createdAt" | "updatedAt">;
const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

export function useAddHelper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HelperInput) => {
      const { error } = await supabase.from("helpers").insert({
        name: input.name,
        phone: orNull(input.phone),
        status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: helperKeys.all });
      toast.success("Helper berhasil ditambahkan");
    },
    onError: (err: Error) => toast.error(`Gagal tambah helper: ${err.message}`),
  });
}

export function useUpdateHelper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<HelperInput> }) => {
      const { error } = await supabase
        .from("helpers")
        .update({
          name: input.name,
          phone: orNull(input.phone),
          status: input.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: helperKeys.all });
      toast.success("Helper berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update helper: ${err.message}`),
  });
}

export function useDeleteHelper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("helpers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: helperKeys.all });
      toast.success("Helper dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus helper: ${err.message}`),
  });
}

