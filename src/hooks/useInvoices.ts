/**
 * useInvoices — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Invoice, Payment, InvoiceStatus } from "../types";

export const invoiceKeys = {
  all:      ["invoices"] as const,
  payments: ["invoice_payments"] as const,
  detail:   (id: string) => ["invoices", id] as const,
};

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapInvoice(r: any): Invoice {
  return {
    id:                 r.id,
    number:             r.number,
    summaryDescription: r.summary_description,
    date:               r.date,
    dueDate:            r.due_date,
    poNumber:           r.po_number,
    billingCycle:       r.billing_cycle,
    customerId:         r.customer_id,
    customerName:       r.customer_name,
    customerAddress:    r.customer_address,
    projectId:          r.project_id,
    projectName:        r.project_name,
    upName:             r.up_name,
    upPhone:            r.up_phone,
    items:              r.items ?? [],
    subtotal:           r.subtotal ?? 0,
    transportFee:       r.transport_fee,
    depositFee:         r.deposit_fee,
    discount:           r.discount ?? 0,
    tax:                r.tax ?? 0,
    taxAmount:          r.tax_amount ?? 0,
    total:              r.total ?? 0,
    paidAmount:         r.paid_amount ?? 0,
    remainingAmount:    r.remaining_amount ?? 0,
    status:             r.status,
    notes:              r.notes,
    createdAt:          r.created_at,
  };
}

function mapPayment(r: any): Payment {
  return {
    id:             r.id,
    invoiceId:      r.invoice_id,
    invoiceNumber:  r.invoice_number,
    customerId:     r.customer_id,
    customerName:   r.customer_name,
    amount:         r.amount,
    method:         r.method,
    date:           r.date,
    reference:      r.reference,
    notes:          r.notes,
    createdAt:      r.created_at,
  };
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export function useInvoices() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: invoiceKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapInvoice);
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("realtime:invoices")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" },
        () => qc.invalidateQueries({ queryKey: invoiceKeys.all }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function usePayments() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: invoiceKeys.payments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPayment);
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("realtime:payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_payments" },
        () => {
          qc.invalidateQueries({ queryKey: invoiceKeys.payments });
          qc.invalidateQueries({ queryKey: invoiceKeys.all }); // update paid_amount
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

// ─── Mutations ─────────────────────────────────────────────────────────────────
type InvoiceInput = Omit<Invoice, "id" | "createdAt" | "number">;

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceInput) => {
      // Generate nomor invoice di server
      const { data: lastInv } = await supabase
        .from("invoices")
        .select("number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const year   = new Date().getFullYear();
      const lastNo = lastInv?.number?.match(/\d+$/)?.[0] ?? "0";
      const nextNo = String(parseInt(lastNo) + 1).padStart(3, "0");
      const number = `INV-${year}-${nextNo}`;

      const { error } = await supabase.from("invoices").insert({
        number,
        summary_description: input.summaryDescription,
        date:                input.date,
        due_date:            input.dueDate,
        po_number:           input.poNumber,
        billing_cycle:       input.billingCycle,
        customer_id:         input.customerId,
        customer_name:       input.customerName,
        customer_address:    input.customerAddress,
        project_id:          input.projectId,
        project_name:        input.projectName,
        up_name:             input.upName,
        up_phone:            input.upPhone,
        items:               input.items,
        subtotal:            input.subtotal,
        transport_fee:       input.transportFee,
        deposit_fee:         input.depositFee,
        discount:            input.discount,
        tax:                 input.tax,
        tax_amount:          input.taxAmount,
        total:               input.total,
        paid_amount:         0,
        remaining_amount:    input.total,
        status:              input.status,
        notes:               input.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Invoice> }) => {
      const { error } = await supabase.from("invoices").update({
        summary_description: input.summaryDescription,
        date:                input.date,
        due_date:            input.dueDate,
        po_number:           input.poNumber,
        billing_cycle:       input.billingCycle,
        customer_id:         input.customerId,
        customer_name:       input.customerName,
        customer_address:    input.customerAddress,
        project_id:          input.projectId,
        project_name:        input.projectName,
        up_name:             input.upName,
        up_phone:            input.upPhone,
        items:               input.items,
        subtotal:            input.subtotal,
        transport_fee:       input.transportFee,
        deposit_fee:         input.depositFee,
        discount:            input.discount,
        tax:                 input.tax,
        tax_amount:          input.taxAmount,
        total:               input.total,
        remaining_amount:    input.remainingAmount,
        status:              input.status,
        notes:               input.notes,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "createdAt">) => {
      // Insert payment
      const { error: pErr } = await supabase.from("invoice_payments").insert({
        invoice_id:     payment.invoiceId,
        invoice_number: payment.invoiceNumber,
        customer_id:    payment.customerId,
        customer_name:  payment.customerName,
        amount:         payment.amount,
        method:         payment.method,
        date:           payment.date,
        reference:      payment.reference,
        notes:          payment.notes,
      });
      if (pErr) throw pErr;

      // Update invoice paid_amount & remaining_amount
      const { data: inv, error: fetchErr } = await supabase
        .from("invoices")
        .select("total, paid_amount")
        .eq("id", payment.invoiceId)
        .single();
      if (fetchErr) throw fetchErr;

      const newPaid      = (inv.paid_amount ?? 0) + payment.amount;
      const newRemaining = Math.max(0, inv.total - newPaid);
      const newStatus: InvoiceStatus =
        newRemaining <= 0 ? "paid" : newPaid > 0 ? "partial" : "sent";

      const { error: updErr } = await supabase.from("invoices").update({
        paid_amount:      newPaid,
        remaining_amount: newRemaining,
        status:           newStatus,
      }).eq("id", payment.invoiceId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.payments });
    },
  });
}
