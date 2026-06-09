/**
 * useInvoices — React Query + Supabase Realtime
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { Invoice, Payment } from "../types";

export const invoiceKeys = {
  all:      ["invoices"] as const,
  payments: ["invoice_payments"] as const,
  detail:   (id: string) => ["invoices", id] as const,
};

// ─── Mappers ──────────────────────────────────────────────────────────────────
const toLocalYMD = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.split("T")[0];
  const localTime = d.getTime() + 7 * 60 * 60 * 1000;
  const adjusted = new Date(localTime);
  const year = adjusted.getUTCFullYear();
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function mapInvoice(r: any): Invoice {
  // Map joined invoice_line_items (aliased as "line_items") into the items array
  const lineItems = (r.line_items ?? []).map((li: any) => ({
    description:   li.description,
    inventoryCode: li.inventory_code,
    qty:           li.qty,
    unit:          li.unit,
    unitPrice:     li.unit_price,
    rentalDays:    li.rental_days,
    subtotal:      li.subtotal,
  }));

  return {
    id:                 r.id,
    number:             r.number,
    summaryDescription: r.summary_description,
    date:               r.date,
    dueDate:            r.due_date,
    printDate:          r.created_at ? toLocalYMD(r.created_at) : r.date,
    poNumber:           r.po_number,
    billingCycle:       r.billing_cycle,
    customerId:         r.customer_id,
    customerName:       r.customer_name,
    customerAddress:    r.customer_address,
    projectId:          r.project_id,
    projectName:        r.project_name,
    upName:             r.up_name,
    upPhone:            r.up_phone,
    items:              lineItems,
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
        .select("*, line_items:invoice_line_items(*)")
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
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_line_items" },
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
        // Atomic number generation via DB RPC (prevents duplicates)
        try {
          const { data: rpcNum } = await supabase.rpc("generate_invoice_number");
          if (rpcNum) numberToUse = rpcNum;
        } catch {
          // Fallback: client-side generation if RPC not available
        }
        if (!numberToUse || numberToUse.trim() === "") {
          const { data: lastInv } = await supabase
            .from("invoices").select("number")
            .ilike("number", `Inv-%`)
            .order("number", { ascending: false })
            .limit(1).single();
          const lastNoStr = lastInv?.number?.split('-').pop() ?? "0";
          const parsedNo = parseInt(lastNoStr);
          numberToUse = `Inv-${String((isNaN(parsedNo) ? 0 : parsedNo) + 1).padStart(5, "0")}`;
        }
      }

      const { data, error } = await supabase.from("invoices").insert({
        number: numberToUse,
        summary_description: orNull(input.summaryDescription),
        date:                input.date,
        due_date:            input.dueDate,
        // Gunakan printDate sebagai created_at (tanggal cetak "Batam, ...")
        created_at:          input.printDate
          ? `${input.printDate}T00:00:00+07:00`
          : new Date().toISOString(),
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
      }).select().single();
      if (error) throw error;

      // Insert line items into invoice_line_items table
      if (input.items && input.items.length > 0) {
        const { error: itemErr } = await supabase.from("invoice_line_items").insert(
          input.items.map(i => ({
            invoice_id:     data.id,
            description:    i.description,
            inventory_code: i.inventoryCode || null,
            qty:            i.qty,
            unit:           i.unit,
            unit_price:     i.unitPrice,
            rental_days:    i.rentalDays || null,
            subtotal:       i.subtotal,
          }))
        );
        if (itemErr) throw itemErr;
      }
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
      // Build payload — only include fields that were explicitly provided
      // to avoid overwriting existing data with null/undefined
      const raw: Record<string, unknown> = {};
      if (input.summaryDescription !== undefined) raw.summary_description = orNull(input.summaryDescription);
      if (input.date !== undefined)               raw.date = input.date;
      if (input.dueDate !== undefined)             raw.due_date = input.dueDate;
      // printDate mengubah created_at (tanggal cetak "Batam, ...")
      if (input.printDate !== undefined)           raw.created_at = input.printDate
        ? `${input.printDate}T00:00:00+07:00`
        : undefined;
      if (input.poNumber !== undefined)            raw.po_number = orNull(input.poNumber);
      if (input.billingCycle !== undefined)         raw.billing_cycle = orNull(input.billingCycle);
      if (input.customerId !== undefined)           raw.customer_id = input.customerId;
      if (input.customerName !== undefined)         raw.customer_name = input.customerName;
      if (input.customerAddress !== undefined)      raw.customer_address = input.customerAddress;
      if (input.projectId !== undefined)            raw.project_id = input.projectId || null;
      if (input.projectName !== undefined)          raw.project_name = orNull(input.projectName);
      if (input.upName !== undefined)               raw.up_name = orNull(input.upName);
      if (input.upPhone !== undefined)              raw.up_phone = orNull(input.upPhone);
      if (input.subtotal !== undefined)             raw.subtotal = input.subtotal;
      if (input.transportFee !== undefined)         raw.transport_fee = input.transportFee;
      if (input.depositFee !== undefined)           raw.deposit_fee = input.depositFee;
      if (input.discount !== undefined)             raw.discount = input.discount;
      if (input.tax !== undefined)                  raw.tax = input.tax;
      if (input.taxAmount !== undefined)            raw.tax_amount = input.taxAmount;
      if (input.total !== undefined)                raw.total = input.total;
      if (input.remainingAmount !== undefined)      raw.remaining_amount = input.remainingAmount;
      if (input.status !== undefined)               raw.status = input.status;
      if (input.notes !== undefined)                raw.notes = orNull(input.notes);
      if (input.number)                             raw.number = input.number;

      if (Object.keys(raw).length > 0) {
        const { error } = await supabase.from("invoices").update(raw).eq("id", id);
        if (error) throw error;
      }

      // Replace line items if provided
      if (input.items !== undefined) {
        await supabase.from("invoice_line_items").delete().eq("invoice_id", id);
        if (input.items.length > 0) {
          const { error: itemErr } = await supabase.from("invoice_line_items").insert(
            input.items.map(i => ({
              invoice_id:     id,
              description:    i.description,
              inventory_code: i.inventoryCode || null,
              qty:            i.qty,
              unit:           i.unit,
              unit_price:     i.unitPrice,
              rental_days:    i.rentalDays || null,
              subtotal:       i.subtotal,
            }))
          );
          if (itemErr) throw itemErr;
        }
      }
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

      // The `sync_invoice_payment` database trigger automatically updates
      // the invoice's paid_amount, remaining_amount, and status.
      // So we don't need to manually update the invoice here.
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.payments });
      toast.success("Pembayaran berhasil dicatat");
    },
    onError: (err: Error) => toast.error(`Gagal catat pembayaran: ${err.message}`),
  });
}
