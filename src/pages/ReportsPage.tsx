import { useMemo, useState, useRef, Fragment } from "react";
import { useInvoices } from "../hooks/useInvoices";
import {
  BarChart3, Printer, Search, ChevronDown, ChevronRight,
  Calendar, Users, FileText, TrendingUp, Filter, Download,
  CreditCard, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { Button, SearchBar, SectionHeader } from "../components/ui";
import { formatRupiah } from "../components/invoice/InvoiceHelpers";
import ReceivablesPrintLayout from "../components/reports/ReceivablesPrintLayout";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/* ── Types ──────────────────────────────────────────────────── */
interface InvoiceReportItem {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  projectName: string;
  invoices: InvoiceReportItem[];
  totalInvoice: number;
  totalPaid: number;
  totalRemaining: number;
}

interface PeriodGroup {
  key: string;
  label: string;
  sortKey: string;
  customers: CustomerGroup[];
  totalInvoice: number;
  totalPaid: number;
  totalRemaining: number;
  invoiceCount: number;
}

/* ── Helpers ────────────────────────────────────────────────── */
function getMonthKey(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    return {
      key: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: idLocale }),
      sortKey: format(d, "yyyy-MM"),
    };
  } catch {
    return { key: "unknown", label: "Tidak Diketahui", sortKey: "0000-00" };
  }
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

/* ── Component ──────────────────────────────────────────────── */
export default function ReportsPage() {
  const { data: invoices = [] } = useInvoices();
  const [search, setSearch] = useState("");
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();

  const togglePeriod = (key: string) => {
    setExpandedPeriods((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleCustomer = (key: string) => {
    setExpandedCustomers((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const expandAll = () => {
    const allP = new Set(periods.map((p) => p.key));
    const allC = new Set<string>();
    periods.forEach((p) => p.customers.forEach((c) => allC.add(`${p.key}-${c.customerId}`)));
    setExpandedPeriods(allP);
    setExpandedCustomers(allC);
  };

  const collapseAll = () => {
    setExpandedPeriods(new Set());
    setExpandedCustomers(new Set());
  };

  /* ── Group by Period → Customer ───────────────────────────── */
  const periods: PeriodGroup[] = useMemo(() => {
    const periodMap = new Map<string, PeriodGroup>();

    invoices.forEach((inv) => {
      if (inv.status === "draft" || inv.status === "cancelled") return;
      if (search && !inv.customerName.toLowerCase().includes(search.toLowerCase())) return;

      const mk = getMonthKey(inv.date);
      if (!periodMap.has(mk.key)) {
        periodMap.set(mk.key, {
          key: mk.key,
          label: mk.label,
          sortKey: mk.sortKey,
          customers: [],
          totalInvoice: 0,
          totalPaid: 0,
          totalRemaining: 0,
          invoiceCount: 0,
        });
      }
      const pg = periodMap.get(mk.key)!;
      pg.totalInvoice += inv.total;
      pg.totalPaid += inv.paidAmount;
      pg.totalRemaining += inv.remainingAmount;
      pg.invoiceCount += 1;

      let cg = pg.customers.find((c) => c.customerId === inv.customerId);
      if (!cg) {
        cg = {
          customerId: inv.customerId,
          customerName: inv.customerName,
          projectName: inv.projectName || "Tanpa Proyek",
          invoices: [],
          totalInvoice: 0,
          totalPaid: 0,
          totalRemaining: 0,
        };
        pg.customers.push(cg);
      }
      cg.totalInvoice += inv.total;
      cg.totalPaid += inv.paidAmount;
      cg.totalRemaining += inv.remainingAmount;
      cg.invoices.push({
        id: inv.id,
        number: inv.number,
        date: inv.date,
        dueDate: inv.dueDate,
        total: inv.total,
        paidAmount: inv.paidAmount,
        remainingAmount: inv.remainingAmount,
        status: inv.status,
      });
    });

    return Array.from(periodMap.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [invoices, search]);

  const grandTotal = useMemo(() => ({
    invoice: periods.reduce((s, p) => s + p.totalInvoice, 0),
    paid: periods.reduce((s, p) => s + p.totalPaid, 0),
    remaining: periods.reduce((s, p) => s + p.totalRemaining, 0),
    count: periods.reduce((s, p) => s + p.invoiceCount, 0),
    customers: new Set(periods.flatMap((p) => p.customers.map((c) => c.customerId))).size,
  }), [periods]);

  /* ── For print layout compatibility ───────────────────────── */
  const flatReceivables = useMemo(() => {
    return periods.flatMap((p) =>
      p.customers.map((c) => ({
        key: `${p.key}-${c.customerId}`,
        customerId: c.customerId,
        customerName: c.customerName,
        projectId: "",
        projectName: c.projectName,
        totalInvoice: c.totalInvoice,
        totalPaid: c.totalPaid,
        totalRemaining: c.totalRemaining,
        invoiceCount: c.invoices.length,
      }))
    );
  }, [periods]);

  const paidPct = grandTotal.invoice > 0 ? Math.round((grandTotal.paid / grandTotal.invoice) * 100) : 0;

  return (
    <div className="space-y-6 print:hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <SectionHeader
        title="Piutang Pelanggan"
        description="Laporan detail piutang dikelompokkan per periode & pelanggan"
        action={
          <div className="flex items-center gap-2">
            <Button
              leftIcon={Printer}
              onClick={handlePrint}
              disabled={periods.length === 0}
            >
              Cetak Laporan
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Tagihan",
            value: formatRupiah(grandTotal.invoice),
            icon: FileText,
            gradient: "from-blue-500 to-indigo-600",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Telah Dibayar",
            value: formatRupiah(grandTotal.paid),
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            label: "Sisa Piutang",
            value: formatRupiah(grandTotal.remaining),
            icon: AlertTriangle,
            gradient: "from-rose-500 to-red-600",
            iconBg: "bg-rose-50",
            iconColor: "text-rose-600",
          },
          {
            label: "Rasio Terbayar",
            value: `${paidPct}%`,
            icon: TrendingUp,
            gradient: "from-violet-500 to-purple-600",
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
            extra: (
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            ),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.gradient}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 tracking-tight">{card.value}</p>
              {card.extra}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="max-w-sm w-full">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama pelanggan..." />
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
          >
            Buka Semua
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Tutup Semua
          </button>
          <span className="text-gray-400 ml-2">
            {grandTotal.count} invoice · {grandTotal.customers} pelanggan · {periods.length} periode
          </span>
        </div>
      </div>

      {/* ── Period Groups ───────────────────────────────────── */}
      {periods.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-500">Tidak ada data piutang</p>
          <p className="text-sm text-gray-400 mt-1">Belum ada invoice aktif yang ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => {
            const isOpen = expandedPeriods.has(period.key);
            return (
              <div
                key={period.key}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden transition-all duration-300"
              >
                {/* Period Header */}
                <button
                  onClick={() => togglePeriod(period.key)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-[15px] font-bold text-gray-900 capitalize">
                        Periode : {period.label}
                      </h3>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {period.customers.length} pelanggan · {period.invoiceCount} invoice
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-6 text-[12px]">
                      <div className="text-right">
                        <p className="text-gray-400 font-medium">Tagihan</p>
                        <p className="font-bold text-gray-900">{formatRupiah(period.totalInvoice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-medium">Dibayar</p>
                        <p className="font-bold text-emerald-600">{formatRupiah(period.totalPaid)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 font-medium">Piutang</p>
                        <p className="font-bold text-rose-600">{formatRupiah(period.totalRemaining)}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Period Content */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {period.customers.map((cust) => {
                      const custKey = `${period.key}-${cust.customerId}`;
                      const custOpen = expandedCustomers.has(custKey);
                      return (
                        <div key={custKey} className="border-b border-gray-50 last:border-b-0">
                          {/* Customer Header */}
                          <button
                            onClick={() => toggleCustomer(custKey)}
                            className="w-full flex items-center justify-between px-6 py-3 bg-gradient-to-r from-slate-50 to-gray-50/50 hover:from-blue-50/50 hover:to-slate-50 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${custOpen ? "rotate-90" : ""}`}
                              />
                              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <span className="text-[13px] font-semibold text-gray-800">
                                  {cust.customerName}
                                </span>
                                <span className="text-[11px] text-gray-400 ml-2">
                                  — {cust.projectName}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-5 text-[12px]">
                              <span className="text-gray-500 font-medium">{fmtNum(cust.totalInvoice)}</span>
                              <span className="text-emerald-600 font-medium">{fmtNum(cust.totalPaid)}</span>
                              <span className="text-rose-600 font-bold">{fmtNum(cust.totalRemaining)}</span>
                            </div>
                          </button>

                          {/* Invoice Detail Rows */}
                          {custOpen && (
                            <div className="bg-white">
                              <table className="w-full text-[12px]">
                                <thead>
                                  <tr className="bg-gray-50/80 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                                    <th className="px-6 pl-16 py-2.5 text-left">No. Invoice</th>
                                    <th className="px-4 py-2.5 text-left">Tanggal</th>
                                    <th className="px-4 py-2.5 text-left">Jatuh Tempo</th>
                                    <th className="px-4 py-2.5 text-left">Status</th>
                                    <th className="px-4 py-2.5 text-right">Total Tagihan</th>
                                    <th className="px-4 py-2.5 text-right">Dibayar</th>
                                    <th className="px-6 py-2.5 text-right">Sisa</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {cust.invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                                      <td className="px-6 pl-16 py-2.5">
                                        <span className="font-mono font-semibold text-blue-600">{inv.number}</span>
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-600">{inv.date}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{inv.dueDate}</td>
                                      <td className="px-4 py-2.5">
                                        <StatusDot status={inv.status} />
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{fmtNum(inv.total)}</td>
                                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{fmtNum(inv.paidAmount)}</td>
                                      <td className="px-6 py-2.5 text-right text-rose-600 font-bold">{fmtNum(inv.remainingAmount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {/* Customer Subtotal */}
                              <div className="flex items-center justify-between px-6 py-2.5 bg-blue-50/40 border-t border-blue-100/50">
                                <span className="text-[11px] font-semibold text-blue-700 pl-10">
                                  Subtotal — {cust.customerName}
                                </span>
                                <div className="flex items-center gap-5 text-[12px]">
                                  <span className="text-gray-800 font-bold">{fmtNum(cust.totalInvoice)}</span>
                                  <span className="text-emerald-600 font-bold">{fmtNum(cust.totalPaid)}</span>
                                  <span className="text-rose-600 font-bold">{fmtNum(cust.totalRemaining)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Period Summary */}
                    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-indigo-100/50">
                      <span className="text-[12px] font-bold text-indigo-700">
                        Total Periode {period.label} ({period.invoiceCount} invoice)
                      </span>
                      <div className="flex items-center gap-5 text-[13px]">
                        <span className="text-gray-900 font-bold">{formatRupiah(period.totalInvoice)}</span>
                        <span className="text-emerald-600 font-bold">{formatRupiah(period.totalPaid)}</span>
                        <span className="text-rose-600 font-bold">{formatRupiah(period.totalRemaining)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Grand Total ─────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-[15px]">Grand Total Piutang</p>
                  <p className="text-slate-400 text-[12px]">
                    {grandTotal.count} invoice · {grandTotal.customers} pelanggan · {periods.length} periode
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Total Tagihan</p>
                  <p className="text-white font-bold text-lg">{formatRupiah(grandTotal.invoice)}</p>
                </div>
                <div>
                  <p className="text-emerald-400 text-[11px] font-medium uppercase tracking-wider">Telah Dibayar</p>
                  <p className="text-emerald-400 font-bold text-lg">{formatRupiah(grandTotal.paid)}</p>
                </div>
                <div>
                  <p className="text-rose-400 text-[11px] font-medium uppercase tracking-wider">Sisa Piutang</p>
                  <p className="text-rose-400 font-bold text-lg">{formatRupiah(grandTotal.remaining)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Layout */}
      <ReceivablesPrintLayout ref={printRef} data={flatReceivables} />
    </div>
  );
}

/* ── Status Dot ─────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    sent:    { label: "Terkirim", color: "text-blue-700", bg: "bg-blue-100" },
    paid:    { label: "Lunas", color: "text-emerald-700", bg: "bg-emerald-100" },
    partial: { label: "Sebagian", color: "text-amber-700", bg: "bg-amber-100" },
    overdue: { label: "Jatuh Tempo", color: "text-red-700", bg: "bg-red-100" },
  };
  const m = map[status] || { label: status, color: "text-gray-600", bg: "bg-gray-100" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.color === "text-emerald-700" ? "bg-emerald-500" : m.color === "text-blue-700" ? "bg-blue-500" : m.color === "text-amber-700" ? "bg-amber-500" : "bg-red-500"}`} />
      {m.label}
    </span>
  );
}