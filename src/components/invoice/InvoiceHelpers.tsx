import type { Invoice, InvoiceStatus, InvoiceType } from "../../types";
import { Badge } from "../ui";
import { CheckCircle2, Clock, Send, XCircle, AlertTriangle, CreditCard } from "lucide-react";

// ─── Format Currency ──────────────────────────────────────────────────────────
export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { label: string; variant: "gray" | "blue" | "emerald" | "amber" | "red" }> = {
    draft:     { label: "Draft",     variant: "gray" },
    sent:      { label: "Terkirim",  variant: "blue" },
    paid:      { label: "Lunas",     variant: "emerald" },
    partial:   { label: "Sebagian",  variant: "amber" },
    overdue:   { label: "Jatuh Tempo", variant: "red" },
    cancelled: { label: "Batal",     variant: "red" },
  };
  const m = map[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-500 shrink-0">{pct}%</span>
    </div>
  );
}
