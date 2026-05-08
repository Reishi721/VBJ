/**
 * useInvoices — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
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
      .channel(`realtime:invoices_${Math.random().toString(36).slice(2)}`)
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
        .from("payments")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPayment);
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`realtime:payments_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" },
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
type InvoiceInput = Omit<Invoice, "id" | "createdAt" | "number"> & { number?: string; };

const orNull = (v?: string) => (v && v.trim() !== "" ? v.trim() : null);

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceInput) => {
      let numberToUse = input.number;
      if (!numberToUse || numberToUse.trim() === "") {
        // Custom generation format: Inv-00001
        const { data: lastInv } = await supabase
          .from("invoices")
          .select("number")
          .ilike("number", `Inv-%`)
          .order("number", { ascending: false })
          .limit(1)
          .single();
        
        const lastNoStr = lastInv?.number?.split('-').pop() ?? "0";
        const parsedNo = parseInt(lastNoStr);
        const nextNo = String((isNaN(parsedNo) ? 0 : parsedNo) + 1).padStart(5, "0");
        numberToUse = `Inv-${nextNo}`;
      }

      const { error } = await supabase.from("invoices").insert({
        number: numberToUse,
        summary_description: orNull(input.summaryDescription),
        date:                input.date,
        due_date:            input.dueDate,
        po_number:           orNull(input.poNumber),
        billing_cycle:       orNull(input.billingCycle),
        customer_id:         input.customerId,
        customer_name:       input.customerName,
        customer_address:    input.customerAddress,
        project_id:          input.projectId || null,
        project_name:        orNull(input.projectName),
        up_name:             orNull(input.upName),
        up_phone:            orNull(input.upPhone),
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
        notes:               orNull(input.notes),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success("Invoice berhasil dibuat");
    },
    onError: (err: Error) => toast.error(`Gagal buat invoice: ${err.message}`),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Invoice> }) => {
      const updatePayload: any = {
        summary_description: orNull(input.summaryDescription),
        date:                input.date,
        due_date:            input.dueDate,
        po_number:           orNull(input.poNumber),
        billing_cycle:       orNull(input.billingCycle),
        customer_id:         input.customerId,
        customer_name:       input.customerName,
        customer_address:    input.customerAddress,
        project_id:          input.projectId || null,
        project_name:        orNull(input.projectName),
        up_name:             orNull(input.upName),
        up_phone:            orNull(input.upPhone),
        subtotal:            input.subtotal,
        transport_fee:       input.transportFee,
        deposit_fee:         input.depositFee,
        discount:            input.discount,
        tax:                 input.tax,
        tax_amount:          input.taxAmount,
        total:               input.total,
        remaining_amount:    input.remainingAmount,
        status:              input.status,
        notes:               orNull(input.notes),
      };
      if (input.number) {
        updatePayload.number = input.number;
      }

      const { error } = await supabase.from("invoices").update(updatePayload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success("Invoice berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(`Gagal update invoice: ${err.message}`),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success("Invoice dihapus");
    },
    onError: (err: Error) => toast.error(`Gagal hapus invoice: ${err.message}`),
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "createdAt">) => {
      // Insert payment
      const { error: pErr } = await supabase.from("payments").insert({
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
      toast.success("Pembayaran berhasil dicatat");
    },
    onError: (err: Error) => toast.error(`Gagal catat pembayaran: ${err.message}`),
  });
}
