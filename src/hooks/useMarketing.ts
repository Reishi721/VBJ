/**
 * useMarketing — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { Marketing } from "../types";

export const marketingKeys = { all: ["marketing"] as const };

export function useMarketing() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: marketingKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any): Marketing => ({
        id:        r.id,
        name:      r.name,
        phone:     r.phone,
        email:     r.email,
        position:  r.position,
        status:    r.status,
        createdAt: r.created_at,
      }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:marketing_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing" },
        () => qc.invalidateQueries({ queryKey: marketingKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

type MarketingInput = Omit<Marketing, "id" | "createdAt">;

export function useAddMarketing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarketingInput) => {
      const { error } = await supabase.from("marketing").insert({
        name: input.name, phone: input.phone, email: input.email,
        position: input.position, status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketingKeys.all });
      toast.success("Data marketing ditambahkan");
    },
    onError: (err: Error) => toast.error(`Gagal tambah marketing: ${err.message}`),
  });
}

export function useUpdateMarketing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<MarketingInput> }) => {
      const { error } = await supabase.from("marketing").update({
        name: input.name, phone: input.phone, email: input.email,
        position: input.position, status: input.status,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketingKeys.all });
      toast.success("Data marketing diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update marketing: ${err.message}`),
  });
}

export function useDeleteMarketing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketingKeys.all });
      toast.success("Data marketing dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus marketing: ${err.message}`),
  });
}
