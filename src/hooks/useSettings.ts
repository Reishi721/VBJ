import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { CompanySettings, InvoiceSettings, BankAccount } from "../stores/useSettingsStore";

export const settingsKeys = {
  company: ["company_settings"] as const,
  banks: ["bank_accounts"] as const,
};

// ─── Bank Accounts ───
async function fetchBanks(): Promise<BankAccount[]> {
  const { data, error } = await supabase.from("bank_accounts").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b: any) => ({
    id: b.id,
    bankName: b.bank_name,
    accountNumber: b.account_number,
    accountName: b.account_name,
  }));
}

export function useBanks() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.banks, queryFn: fetchBanks });

  useEffect(() => {
    const ch = supabase
      .channel(`bank_accounts_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" },
        () => qc.invalidateQueries({ queryKey: settingsKeys.banks }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useAddBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BankAccount, "id">) => {
      const { error } = await supabase.from("bank_accounts").insert({
        bank_name: input.bankName,
        account_number: input.accountNumber,
        account_name: input.accountName,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.banks }),
  });
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BankAccount> }) => {
      const { error } = await supabase.from("bank_accounts").update({
        bank_name: input.bankName,
        account_number: input.accountNumber,
        account_name: input.accountName,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.banks }),
  });
}

export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.banks }),
  });
}

// ─── Company Settings ───
export interface CompleteSettings {
  id: string;
  company: CompanySettings;
  invoice: InvoiceSettings;
}

async function fetchCompanySettings(): Promise<CompleteSettings | null> {
  const { data, error } = await supabase.from("company_settings").select("*").limit(1).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return {
    id: data.id,
    company: {
      name: data.name,
      tagline: data.tagline,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      phone: data.phone,
      fax: data.fax,
      logoUrl: data.logo_url,
    },
    invoice: {
      remarks: data.invoice_remarks ?? "",
      managerName: data.manager_name ?? "",
      managerTitle: data.manager_title ?? "",
    }
  };
}

export function useCompanySettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.company, queryFn: fetchCompanySettings });

  useEffect(() => {
    const ch = supabase
      .channel(`company_settings_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "company_settings" },
        () => qc.invalidateQueries({ queryKey: settingsKeys.company }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, company, invoice }: { id: string; company?: Partial<CompanySettings>; invoice?: Partial<InvoiceSettings> }) => {
      const updatePayload: any = {};
      if (company) {
        if (company.name !== undefined) updatePayload.name = company.name;
        if (company.tagline !== undefined) updatePayload.tagline = company.tagline;
        if (company.addressLine1 !== undefined) updatePayload.address_line1 = company.addressLine1;
        if (company.addressLine2 !== undefined) updatePayload.address_line2 = company.addressLine2;
        if (company.phone !== undefined) updatePayload.phone = company.phone;
        if (company.fax !== undefined) updatePayload.fax = company.fax;
        if (company.logoUrl !== undefined) updatePayload.logo_url = company.logoUrl;
      }
      if (invoice) {
        if (invoice.remarks !== undefined) updatePayload.invoice_remarks = invoice.remarks;
        if (invoice.managerName !== undefined) updatePayload.manager_name = invoice.managerName;
        if (invoice.managerTitle !== undefined) updatePayload.manager_title = invoice.managerTitle;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase.from("company_settings").update(updatePayload).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.company }),
  });
}
