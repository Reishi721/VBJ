import { create } from "zustand";
import type { Invoice, Payment, InvoiceLineItem } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotals(items: InvoiceLineItem[], discount: number, taxPct: number, transportFee = 0, depositFee = 0) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = Math.round(((subtotal - discount) * taxPct) / 100);
  const total = subtotal - discount + taxAmount + transportFee + depositFee;
  return { subtotal, taxAmount, total };
}

interface InvoiceStore {
  invoices: Invoice[];
  payments: Payment[];
  nextInvNum: number;
  generateNumber: () => string;
  addInvoice: (inv: Omit<Invoice, "id" | "number" | "createdAt" | "paidAmount" | "remainingAmount">) => void;
  updateInvoice: (id: string, inv: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addPayment: (p: Omit<Payment, "id" | "createdAt">) => void;
  deletePayment: (id: string) => void;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────
const sampleInvoices: Invoice[] = [
  {
    id: "inv-doc-001", number: "INV-2026-001", 
    summaryDescription: "Biaya Sewa Scaffolding - Proyek Mall Sudirman (Periode April 2026)",
    date: "2026-04-10", dueDate: "2026-05-10",
    poNumber: "PO/2026/04-001", billingCycle: "Sewa ke 01",
    customerId: "cust-001", customerName: "PT Pembangunan Jaya",
    customerAddress: "Jl. Sudirman No. 45, Jakarta Selatan",
    projectId: "prj-001", projectName: "Proyek Mall Sudirman",
    upName: "Bp. Sudirman", upPhone: "0812-3456-7890",
    items: [
      { description: "Frame 170cm", inventoryCode: "SF-170", qty: 50, unit: "pcs", unitPrice: 15000, rentalDays: 30, subtotal: 22500000 },
      { description: "Cross Brace 183cm", inventoryCode: "CB-183", qty: 100, unit: "pcs", unitPrice: 8000, rentalDays: 30, subtotal: 24000000 },
      { description: "Jack Base 60cm", inventoryCode: "JB-60", qty: 50, unit: "pcs", unitPrice: 5000, rentalDays: 30, subtotal: 7500000 },
      { description: "Swivel Coupler", inventoryCode: "SC-001", qty: 200, unit: "pcs", unitPrice: 2000, rentalDays: 30, subtotal: 12000000 },
    ],
    subtotal: 66000000, discount: 1000000, tax: 11, taxAmount: 7205000,
    total: 72205000, paidAmount: 72205000, remainingAmount: 0,
    status: "paid", createdAt: "2026-04-10",
  },
  {
    id: "inv-doc-002", number: "INV-2026-002",
    summaryDescription: "Sewa Alat - Gedung Perkantoran BSD (April 2026)",
    date: "2026-04-15", dueDate: "2026-05-15",
    poNumber: "0048", billingCycle: "Sewa ke 02",
    customerId: "cust-002", customerName: "CV Makmur Abadi",
    customerAddress: "Jl. TB Simatupang No. 12, Jakarta Timur",
    projectId: "prj-003", projectName: "Gedung Perkantoran BSD",
    upName: "Bp. Fendi", upPhone: "0812-1010-9148",
    items: [
      { description: "Biaya Sewa Scaffolding — Periode April 2026", qty: 1, unit: "paket", unitPrice: 45000000, subtotal: 45000000 },
    ],
    subtotal: 45000000, discount: 0, tax: 11, taxAmount: 4950000,
    total: 49950000, paidAmount: 20000000, remainingAmount: 29950000,
    status: "partial", createdAt: "2026-04-15",
  },
  {
    id: "inv-doc-003", number: "INV-2026-003",
    summaryDescription: "Tagihan Sewa Scaffolding - Jembatan Tol Cikampek",
    date: "2026-04-20", dueDate: "2026-05-20",
    customerId: "cust-004", customerName: "PT Konstruksi Utama",
    customerAddress: "Jl. Raya Bekasi KM 25, Bekasi",
    projectId: "prj-005", projectName: "Jembatan Tol Cikampek",
    items: [
      { description: "Frame 170cm", inventoryCode: "SF-170", qty: 120, unit: "pcs", unitPrice: 15000, rentalDays: 30, subtotal: 54000000 },
      { description: "Cross Brace 183cm", inventoryCode: "CB-183", qty: 240, unit: "pcs", unitPrice: 8000, rentalDays: 30, subtotal: 57600000 },
      { description: "Jack Base 60cm", inventoryCode: "JB-60", qty: 120, unit: "pcs", unitPrice: 5000, rentalDays: 30, subtotal: 18000000 },
      { description: "U-Head 60cm", inventoryCode: "UH-60", qty: 120, unit: "pcs", unitPrice: 5000, rentalDays: 30, subtotal: 18000000 },
      { description: "Right Angle Coupler", inventoryCode: "RAC-001", qty: 300, unit: "pcs", unitPrice: 2000, rentalDays: 30, subtotal: 18000000 },
    ],
    subtotal: 165600000, discount: 5000000, tax: 11, taxAmount: 17666000,
    total: 178266000, paidAmount: 0, remainingAmount: 178266000,
    status: "sent", createdAt: "2026-04-20",
  },
];

const samplePayments: Payment[] = [
  {
    id: "pay-001", invoiceId: "inv-doc-001", invoiceNumber: "INV-2026-001",
    customerId: "cust-001", customerName: "PT Pembangunan Jaya",
    amount: 72205000, method: "transfer", date: "2026-04-25",
    reference: "TF/BCA/20260425/001", notes: "Pelunasan penuh", createdAt: "2026-04-25",
  },
  {
    id: "pay-002", invoiceId: "inv-doc-002", invoiceNumber: "INV-2026-002",
    customerId: "cust-002", customerName: "CV Makmur Abadi",
    amount: 20000000, method: "transfer", date: "2026-04-20",
    reference: "TF/BNI/20260420/007", notes: "Pembayaran DP", createdAt: "2026-04-20",
  },
];

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: sampleInvoices,
  payments: samplePayments,
  nextInvNum: 4,

  generateNumber: () => {
    const year = new Date().getFullYear();
    return `INV-${year}-${String(get().nextInvNum).padStart(3, "0")}`;
  },

  addInvoice: (inv) => {
    const number = get().generateNumber();
    const { subtotal, taxAmount, total } = calcTotals(inv.items, inv.discount, inv.tax, inv.transportFee, inv.depositFee);
    set((state) => ({
      invoices: [
        {
          ...inv, subtotal, taxAmount, total, number,
          id: `inv-doc-${Date.now()}`,
          paidAmount: 0, remainingAmount: total,
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...state.invoices,
      ],
      nextInvNum: state.nextInvNum + 1,
    }));
  },

  updateInvoice: (id, updates) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => {
        if (inv.id !== id) return inv;
        const merged = { ...inv, ...updates };
        const { subtotal, taxAmount, total } = calcTotals(merged.items, merged.discount, merged.tax, merged.transportFee, merged.depositFee);
        const remainingAmount = total - merged.paidAmount;
        return { ...merged, subtotal, taxAmount, total, remainingAmount };
      }),
    })),

  deleteInvoice: (id) =>
    set((state) => ({
      invoices: state.invoices.filter((i) => i.id !== id),
      payments: state.payments.filter((p) => p.invoiceId !== id),
    })),

  addPayment: (p) => {
    set((state) => {
      const newPayment: Payment = { ...p, id: `pay-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
      const updatedInvoices = state.invoices.map((inv) => {
        if (inv.id !== p.invoiceId) return inv;
        const paidAmount = inv.paidAmount + p.amount;
        const remainingAmount = inv.total - paidAmount;
        const status: Invoice["status"] = remainingAmount <= 0 ? "paid" : "partial";
        return { ...inv, paidAmount, remainingAmount, status };
      });
      return { payments: [newPayment, ...state.payments], invoices: updatedInvoices };
    });
  },

  deletePayment: (id) => {
    const payment = get().payments.find((p) => p.id === id);
    set((state) => {
      const updatedInvoices = payment
        ? state.invoices.map((inv) => {
            if (inv.id !== payment.invoiceId) return inv;
            const paidAmount = Math.max(0, inv.paidAmount - payment.amount);
            const remainingAmount = inv.total - paidAmount;
            const status: Invoice["status"] = remainingAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "sent";
            return { ...inv, paidAmount, remainingAmount, status };
          })
        : state.invoices;
      return { payments: state.payments.filter((p) => p.id !== id), invoices: updatedInvoices };
    });
  },
}));
