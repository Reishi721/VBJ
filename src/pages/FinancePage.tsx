import { useMemo } from "react";
import { useInvoices, usePayments } from "../hooks/useInvoices";
import { formatRupiah } from "../components/invoice/InvoiceHelpers";
import { SectionHeader, StatsRow } from "../components/ui";
import { format, parseISO, isThisMonth, isThisYear } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  DollarSign, TrendingUp, AlertTriangle, CreditCard,
  CheckCircle2, Clock, BanknoteIcon, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

// ─── Rupiah shorthand ─────────────────────────────────────────────────────────
function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  return formatRupiah(n);
}

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transfer",
  cash:     "Tunai",
  check:    "Cek / Giro",
};

const STATUS_COLORS: Record<string, string> = {
  paid:     "#10b981",
  partial:  "#f59e0b",
  overdue:  "#ef4444",
  sent:     "#3b82f6",
  draft:    "#9ca3af",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-lg px-4 py-3">
      <p className="text-[12px] font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[12px]" style={{ color: p.color }}>
          {p.name}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const { data: invoices = [] } = useInvoices();
  const { data: payments  = [] } = usePayments();

  // ── Summary stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = invoices.filter(i => i.status !== "cancelled" && i.status !== "draft");
    const totalReceivables = active.reduce((s, i) => s + i.remainingAmount, 0);
    const totalPaid        = active.reduce((s, i) => s + i.paidAmount, 0);
    const totalInvoiced    = active.reduce((s, i) => s + i.total, 0);
    const overdueAmt       = active.filter(i => i.status === "overdue").reduce((s, i) => s + i.remainingAmount, 0);
    const paidThisMonth    = payments.filter(p => isThisMonth(parseISO(p.date))).reduce((s, p) => s + p.amount, 0);
    const paidThisYear     = payments.filter(p => isThisYear(parseISO(p.date))).reduce((s, p) => s + p.amount, 0);
    return { totalReceivables, totalPaid, totalInvoiced, overdueAmt, paidThisMonth, paidThisYear };
  }, [invoices, payments]);

  // ── Monthly revenue chart (last 6 months) ──────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = new Map<string, { label: string; tagihan: number; diterima: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      map.set(key, { label: format(d, "MMM yy", { locale: idLocale }), tagihan: 0, diterima: 0 });
    }
    invoices.forEach(inv => {
      if (inv.status === "cancelled" || inv.status === "draft") return;
      const key = inv.date.slice(0, 7);
      if (map.has(key)) map.get(key)!.tagihan += inv.total;
    });
    payments.forEach(p => {
      const key = p.date.slice(0, 7);
      if (map.has(key)) map.get(key)!.diterima += p.amount;
    });
    return Array.from(map.values());
  }, [invoices, payments]);

  // ── Payment method breakdown ────────────────────────────────────────────────
  const methodData = useMemo(() => {
    const map: Record<string, number> = { transfer: 0, cash: 0, check: 0 };
    payments.forEach(p => { if (map[p.method] !== undefined) map[p.method] += p.amount; });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([method, value]) => ({ name: METHOD_LABELS[method] ?? method, value }));
  }, [payments]);

  // ── Invoice status breakdown ────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = { paid: 0, partial: 0, overdue: 0, sent: 0 };
    invoices.filter(i => i.status !== "cancelled" && i.status !== "draft")
      .forEach(inv => { if (map[inv.status] !== undefined) map[inv.status]++; });
    return Object.entries(map).filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: { paid: "Lunas", partial: "Sebagian", overdue: "Jatuh Tempo", sent: "Terkirim" }[status] ?? status, value, status }));
  }, [invoices]);

  // ── Recent payments ─────────────────────────────────────────────────────────
  const recentPayments = useMemo(() => [...payments].slice(0, 10), [payments]);

  const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Keuangan"
        description="Ringkasan keuangan, piutang, dan arus kas perusahaan"
      />

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <StatsRow stats={[
        { label: "Total Piutang",     value: fmtRp(stats.totalReceivables), icon: DollarSign,  iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
        { label: "Penerimaan Bulan Ini", value: fmtRp(stats.paidThisMonth), icon: TrendingUp,  iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { label: "Overdue",           value: fmtRp(stats.overdueAmt),      icon: AlertTriangle, iconBg: "bg-red-50",   iconColor: "text-red-500" },
        { label: "Penerimaan Tahun Ini", value: fmtRp(stats.paidThisYear), icon: CreditCard,   iconBg: "bg-violet-50", iconColor: "text-violet-600" },
      ]} />

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[13px] font-bold text-gray-800 mb-1">Tagihan vs Penerimaan (6 Bulan)</p>
          <p className="text-[11px] text-gray-400 mb-5">Perbandingan invoice diterbitkan dan pembayaran masuk</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtRp(v)} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="tagihan"  name="Tagihan"    fill="#bfdbfe" radius={[6, 6, 0, 0]} />
              <Bar dataKey="diterima" name="Diterima" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Method Pie + Status breakdown */}
        <div className="space-y-4">
          {methodData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[13px] font-bold text-gray-800 mb-4">Metode Pembayaran</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={methodData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={55} innerRadius={30}
                    paddingAngle={3}>
                    {methodData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={10} iconType="circle"
                    formatter={v => <span style={{ fontSize: 11, color: "#6b7280" }}>{v}</span>} />
                  <Tooltip formatter={(v) => formatRupiah(v as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[13px] font-bold text-gray-800 mb-3">Status Invoice</p>
            <div className="space-y-2">
              {statusData.map(s => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] ?? "#9ca3af" }} />
                    <span className="text-[12px] text-gray-600">{s.name}</span>
                  </div>
                  <span className="text-[12px] font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
              {statusData.length === 0 && (
                <p className="text-[12px] text-gray-400 italic">Belum ada invoice aktif</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Financial Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Ditagihkan", value: stats.totalInvoiced, icon: BanknoteIcon, color: "blue" },
          { label: "Total Diterima",   value: stats.totalPaid,     icon: CheckCircle2, color: "emerald" },
          { label: "Sisa Piutang",     value: stats.totalReceivables, icon: Clock,    color: "amber" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${card.color}-50 flex items-center justify-center shrink-0`}>
              <card.icon className={`w-6 h-6 text-${card.color}-600`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-[18px] font-bold text-gray-900 mt-0.5">{formatRupiah(card.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Payments ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-[14px] font-bold text-gray-900">Pembayaran Terbaru</p>
          <p className="text-[12px] text-gray-400 mt-0.5">10 transaksi pembayaran terakhir</p>
        </div>
        {recentPayments.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">Belum ada pembayaran</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Pelanggan</th>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Metode</th>
                <th className="px-6 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentPayments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-gray-500">
                    {format(parseISO(p.date), "dd MMM yyyy", { locale: idLocale })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.customerName}</td>
                  <td className="px-4 py-3 font-mono text-blue-600 text-[12px]">{p.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-semibold">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-600">
                    {formatRupiah(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
