/**
 * useDrivers — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { Driver } from "../types";

export const driverKeys = {
  all: ["drivers"] as const,
  detail: (id: string) => ["drivers", id] as const,
};

async function fetchDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name");
  if (error) throw error;

  type DriverRow = {
    id: string;
    name: string;
    phone?: string | null;
    status: Driver["status"];
    created_at: string;
    updated_at: string;
  };

  const rows = (data ?? []) as DriverRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function useDrivers() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: driverKeys.all, queryFn: fetchDrivers });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:drivers_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => qc.invalidateQueries({ queryKey: driverKeys.all })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return query;
}

type DriverInput = Omit<Driver, "id" | "createdAt" | "updatedAt">;
const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

export function useAddDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DriverInput) => {
      const { error } = await supabase.from("drivers").insert({
        name: input.name,
        phone: orNull(input.phone),
        status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverKeys.all });
      toast.success("Supir berhasil ditambahkan");
    },
    onError: (err: Error) => toast.error(`Gagal tambah supir: ${err.message}`),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DriverInput> }) => {
      const { error } = await supabase
        .from("drivers")
        .update({
          name: input.name,
          phone: orNull(input.phone),
          status: input.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverKeys.all });
      toast.success("Supir berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update supir: ${err.message}`),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverKeys.all });
      toast.success("Supir dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus supir: ${err.message}`),
  });
}

