/**
 * useCustomers — React Query + Supabase Realtime
 * Menggantikan useCustomerStore
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Customer, CustomerProject } from "../types";

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const customerKeys = {
  all:     ["customers"] as const,
  detail:  (id: string) => ["customers", id] as const,
  projects:(id: string) => ["customers", id, "projects"] as const,
};

// ─── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      projects:customer_projects(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id:            row.id,
    name:          row.name,
    company:       row.company,
    phone:         row.phone,
    email:         row.email,
    address:       row.address,
    marketingId:   row.marketing_id,
    marketingName: row.marketing_name,
    status:        row.status,
    createdAt:     row.created_at,
    projects: (row.projects ?? []).map((p: any): CustomerProject => ({
      id:             p.id,
      customerId:     p.customer_id,
      name:           p.name,
      location:       p.location,
      status:         p.status,
      startDate:      p.start_date,
      endDate:        p.end_date,
      description:    p.description,
      recipientName:  p.recipient_name,
      recipientPhone: p.recipient_phone,
      createdAt:      p.created_at,
    })),
  }));
}

// ─── Hook: daftar customers ────────────────────────────────────────────────────
export function useCustomers() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: customerKeys.all,
    queryFn:  fetchCustomers,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:customers_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" },
        () => qc.invalidateQueries({ queryKey: customerKeys.all }))
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_projects" },
        () => qc.invalidateQueries({ queryKey: customerKeys.all }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

// ─── Mutations ────────────────────────────────────────────────────────────────
type CustomerInput = Omit<Customer, "id" | "createdAt" | "projects" | "marketingName"> & {
  projects?: Omit<CustomerProject, "id" | "customerId" | "createdAt">[];
  marketingName?: string;
};

/** Konversi string kosong ke null untuk kolom nullable di Supabase */
const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

/** Resolve marketing name from ID if not provided */
async function resolveMarketingName(marketingId?: string | null): Promise<string | null> {
  if (!marketingId || marketingId.trim() === "") return null;
  const { data } = await supabase
    .from("marketing")
    .select("name")
    .eq("id", marketingId)
    .single();
  return data?.name ?? null;
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { projects = [], ...rest } = input;
      const marketingName = rest.marketingName || await resolveMarketingName(rest.marketingId);

      const { data, error } = await supabase
        .from("customers")
        .insert({
          name:           rest.name,
          company:        orNull(rest.company),
          phone:          rest.phone,
          email:          orNull(rest.email),
          address:        rest.address,
          marketing_id:   orNull(rest.marketingId),
          marketing_name: marketingName,
          status:         rest.status,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert projects if any
      if (projects.length > 0) {
        const { error: pErr } = await supabase.from("customer_projects").insert(
          projects.map(p => ({
            customer_id:     data.id,
            name:            p.name,
            location:        p.location,
            status:          p.status,
            start_date:      p.startDate,
            end_date:        p.endDate,
            description:     p.description,
            recipient_name:  p.recipientName,
            recipient_phone: p.recipientPhone,
          }))
        );
        if (pErr) throw pErr;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CustomerInput> }) => {
      const marketingName = input.marketingId !== undefined
        ? (input.marketingName || await resolveMarketingName(input.marketingId))
        : undefined;

      const raw: Record<string, unknown> = {};
      if (input.name !== undefined)        raw.name = input.name;
      if (input.company !== undefined)     raw.company = orNull(input.company);
      if (input.phone !== undefined)       raw.phone = input.phone;
      if (input.email !== undefined)       raw.email = orNull(input.email);
      if (input.address !== undefined)     raw.address = input.address;
      if (input.marketingId !== undefined) {
        raw.marketing_id   = orNull(input.marketingId);
        raw.marketing_name = marketingName;
      }
      if (input.status !== undefined)      raw.status = input.status;

      if (Object.keys(raw).length > 0) {
        const { error } = await supabase.from("customers").update(raw).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

// ─── Project mutations ─────────────────────────────────────────────────────────
export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<CustomerProject, "id" | "createdAt">) => {
      const { error } = await supabase.from("customer_projects").insert({
        customer_id:     p.customerId,
        name:            p.name,
        location:        p.location,
        status:          p.status,
        start_date:      orNull(p.startDate),
        end_date:        orNull(p.endDate),
        description:     orNull(p.description),
        recipient_name:  orNull(p.recipientName),
        recipient_phone: orNull(p.recipientPhone),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CustomerProject> }) => {
      const { error } = await supabase.from("customer_projects").update({
        name:            input.name,
        location:        input.location,
        status:          input.status,
        start_date:      orNull(input.startDate),
        end_date:        orNull(input.endDate),
        description:     orNull(input.description),
        recipient_name:  orNull(input.recipientName),
        recipient_phone: orNull(input.recipientPhone),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
