import { useMemo } from "react";
import { Package, ArrowUpToLine, ArrowDownToLine, Wrench, Wallet, AlertOctagon } from "lucide-react";
import { StatsCard } from "../components/ui";
import AssetStatusChart from "../components/dashboard/AssetStatusChart";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import DueTodayWidget from "../components/dashboard/DueTodayWidget";
import { useInventoryItems } from "../hooks/useInventory";
import { useInvoices, usePayments } from "../hooks/useInvoices";

function shortRupiah(val: number) {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(0)}Jt`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export default function Dashboard() {
  const { data: items = [] } = useInventoryItems();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();

  const stats = useMemo(() => {
    // ── Inventory stats ──────────────────────────────────────────────
    const totalStock    = items.reduce((s, i) => s + i.stock, 0);
    const goodStock     = items.filter(i => i.condition === "good").reduce((s, i) => s + i.stock, 0);
    const maintenCount  = items.filter(i => i.condition === "maintenance").reduce((s, i) => s + i.stock, 0);

    // ── Invoice / payment stats ───────────────────────────────────────
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    // Pendapatan bulan ini (dari payments)
    const revenueThisMonth = payments
      .filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((s, p) => s + p.amount, 0);

    // Pendapatan bulan lalu (untuk tren)
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear  = thisMonth === 0 ? thisYear - 1 : thisYear;
    const revenueLastMonth = payments
      .filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      })
      .reduce((s, p) => s + p.amount, 0);

    const revTrend = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 * 10) / 10
      : 0;

    // Total piutang (sisa belum dibayar dari invoice aktif)
    const totalReceivable = invoices
      .filter(inv => !["paid", "cancelled", "draft"].includes(inv.status))
      .reduce((s, inv) => s + inv.remainingAmount, 0);

    // Jumlah invoice overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = invoices.filter(inv => {
      if (inv.status === "paid" || inv.status === "cancelled" || inv.status === "draft") return false;
      if (inv.remainingAmount <= 0) return false;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).length;

    return {
      totalStock,
      goodStock,
      maintenCount,
      revenueThisMonth,
      revTrend,
      totalReceivable,
      overdueCount,
      totalSKU: items.length,
    };
  }, [items, invoices, payments]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Aset"
          value={stats.totalStock.toLocaleString("id-ID")}
          icon={Package}
          description={`${stats.totalSKU} SKU tercatat`}
          gradientClass="gradient-primary"
          iconBg="bg-blue-50"
        />
        <StatsCard
          title="Stok Baik"
          value={stats.goodStock.toLocaleString("id-ID")}
          icon={ArrowUpToLine}
          description="Kondisi baik"
          gradientClass="gradient-purple"
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Tersedia"
          value={(stats.goodStock).toLocaleString("id-ID")}
          icon={ArrowDownToLine}
          description="Siap digunakan"
          gradientClass="gradient-success"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatsCard
          title="Perawatan"
          value={stats.maintenCount.toLocaleString("id-ID")}
          icon={Wrench}
          description="Unit maintenance"
          gradientClass="gradient-warning"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatsCard
          title="Pendapatan"
          value={shortRupiah(stats.revenueThisMonth)}
          icon={Wallet}
          trend={stats.revTrend !== 0 ? { value: Math.abs(stats.revTrend), isPositive: stats.revTrend >= 0 } : undefined}
          description="Bulan ini"
          gradientClass="gradient-cyan"
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />
        <StatsCard
          title="Tunggakan"
          value={shortRupiah(stats.totalReceivable)}
          icon={AlertOctagon}
          trend={stats.overdueCount > 0 ? { value: stats.overdueCount, isPositive: false } : undefined}
          description={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "Semua lancar"}
          gradientClass="gradient-danger"
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AssetStatusChart />
        <RevenueChart />
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivity />
        <DueTodayWidget />
      </div>
    </div>
  );
}
