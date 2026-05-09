import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, StatusBadge, Button } from "../ui";
import { useInvoices } from "../../hooks/useInvoices";
import { formatDate, formatCurrency } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export default function RecentActivity() {
  const { data: invoices = [] } = useInvoices();
  const navigate = useNavigate();

  const activities = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(inv => ({
        id: inv.number,
        customer: inv.customerName,
        project: inv.projectName || "Tanpa Proyek",
        // Map invoice status to display status
        status: inv.status === "paid"
          ? "selesai"
          : inv.status === "partial"
          ? "aktif"
          : inv.status === "overdue"
          ? "terlambat"
          : inv.status === "cancelled"
          ? "batal"
          : "pending",
        date: inv.createdAt,
        amount: inv.total,
      }));
  }, [invoices]);

  return (
    <Card className="col-span-1 md:col-span-2 overflow-hidden flex flex-col">
      <div className="p-5 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Aktivitas Terbaru</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {activities.length > 0 ? `${activities.length} invoice terakhir` : "Belum ada invoice"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          rightIcon={ArrowUpRight}
          className="text-blue-600 hover:text-blue-700"
          onClick={() => navigate("/invoice")}
        >
          Lihat Semua
        </Button>
      </div>

      <div className="overflow-x-auto flex-1">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-[13px] text-gray-400 italic">Belum ada data invoice.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pelanggan</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Proyek</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map(activity => (
                <tr
                  key={activity.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate("/invoice")}
                >
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] font-semibold font-mono text-blue-600">{activity.id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[13px] text-gray-600">{activity.customer}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-[12px] text-gray-400">{activity.project}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-gray-400">{formatDate(activity.date)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={activity.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-[13px] font-bold text-gray-900">
                      {formatCurrency(activity.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
