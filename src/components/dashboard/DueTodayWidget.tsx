import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, Button, Badge } from "../ui";
import { useInvoices } from "../../hooks/useInvoices";
import { formatDate } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export default function DueTodayWidget() {
  const { data: invoices = [] } = useInvoices();
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueItems = useMemo(() => {
    return invoices
      .filter(inv => {
        if (inv.status === "paid" || inv.status === "cancelled" || inv.status === "draft") return false;
        if (inv.remainingAmount <= 0) return false;
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        return due <= today;
      })
      .map(inv => {
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - due.getTime();
        const daysOverdue = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return { ...inv, daysOverdue };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);
  }, [invoices, today]);

  return (
    <Card className="col-span-1 flex flex-col h-full">
      <div className="p-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Jatuh Tempo</h3>
            <p className="text-[12px] text-gray-400 -mt-0.5">Perlu tindakan segera</p>
          </div>
        </div>
        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${
          dueItems.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        }`}>
          {dueItems.length}
        </span>
      </div>

      <div className="flex-1 px-2 overflow-y-auto">
        {dueItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[12px] text-gray-400 font-medium">Tidak ada invoice jatuh tempo 🎉</p>
          </div>
        ) : (
          <div className="space-y-1">
            {dueItems.map(item => (
              <div key={item.id} className="group p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{item.customerName}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.projectName || "Tanpa Proyek"}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-mono font-medium">
                        {item.number}
                      </span>
                      {item.daysOverdue > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-[10px] font-semibold text-red-600">
                          +{item.daysOverdue} hari
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-semibold text-amber-600">
                          Hari ini
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <Badge variant="red">
                      {new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(item.remainingAmount)}
                    </Badge>
                    <span className="text-[10px] text-gray-400">{formatDate(item.dueDate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
        <Button
          variant="secondary"
          fullWidth
          rightIcon={ArrowUpRight}
          className="text-gray-600"
          onClick={() => navigate("/invoice")}
        >
          Lihat Semua Invoice
        </Button>
      </div>
    </Card>
  );
}
