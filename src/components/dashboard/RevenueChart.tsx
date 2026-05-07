import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "../../lib/utils";
import { ChevronDown } from "lucide-react";
import { Card } from "../ui";
import { useInvoiceStore } from "../../stores/useInvoiceStore";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

const yearColors: Record<number, string> = {
  2024: "#94a3b8",
  2025: "#3b82f6",
  2026: "#8b5cf6",
};

export default function RevenueChart() {
  const { payments } = useInvoiceStore();
  const currentYear = new Date().getFullYear();

  // Build available years from payments data + current year
  const availableYears = useMemo(() => {
    const years = new Set<number>(payments.map(p => new Date(p.date).getFullYear()));
    years.add(currentYear);
    if (currentYear > 2024) years.add(currentYear - 1);
    return Array.from(years).sort();
  }, [payments, currentYear]);

  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    const last = availableYears[availableYears.length - 1];
    const prev = availableYears[availableYears.length - 2];
    return prev !== undefined ? [prev, last] : [last];
  });
  const [showDropdown, setShowDropdown] = useState(false);

  // Build revenue data from real payments
  const revenueByYearMonth = useMemo(() => {
    const map: Record<number, number[]> = {};
    availableYears.forEach(y => { map[y] = Array(12).fill(0); });
    payments.forEach(p => {
      const d = new Date(p.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (map[y]) map[y][m] += p.amount;
    });
    return map;
  }, [payments, availableYears]);

  const mergedData = useMemo(() =>
    MONTH_NAMES.map((name, i) => {
      const entry: Record<string, string | number> = { name };
      selectedYears.forEach(year => {
        entry[`revenue_${year}`] = revenueByYearMonth[year]?.[i] ?? 0;
      });
      return entry;
    }), [selectedYears, revenueByYearMonth]);

  // Grand total this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const revenueThisMonth = revenueByYearMonth[thisYear]?.[thisMonth] ?? 0;

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        if (prev.length <= 1) return prev;
        return prev.filter(y => y !== year);
      }
      return [...prev, year].sort();
    });
  };

  return (
    <Card className="col-span-1 md:col-span-2 flex flex-col h-full">
      <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Pendapatan Rental</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Bulan ini:{" "}
            <span className="font-semibold text-emerald-600">{formatCurrency(revenueThisMonth)}</span>
          </p>
        </div>

        {/* Year Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[12px] font-semibold text-gray-700 transition-all"
          >
            <div className="flex items-center gap-1.5">
              {selectedYears.map(y => (
                <span key={y} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: yearColors[y] ?? "#6b7280" }} />
                  {y}
                </span>
              ))}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white border border-gray-200 shadow-xl shadow-gray-200/50 z-20 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pilih Tahun</p>
                </div>
                {availableYears.map(year => {
                  const isSelected = selectedYears.includes(year);
                  return (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: yearColors[year] ?? "#6b7280" }} />
                      <span className="text-[13px] font-medium text-gray-700">{year}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mergedData} margin={{ top: 10, right: 5, left: 10, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              tickFormatter={value => `${(value / 1000000).toFixed(0)}Jt`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
              width={45}
            />
            <Tooltip
              formatter={(value, name) => {
                const year = (name as string).replace("revenue_", "");
                return [formatCurrency(value as number), `Tahun ${year}`];
              }}
              cursor={{ fill: "rgba(59,130,246,0.04)", radius: 8 }}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                fontSize: "12px",
                fontWeight: 500,
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) => {
                const year = value.replace("revenue_", "");
                return <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Tahun {year}</span>;
              }}
            />
            {selectedYears.map(year => (
              <Bar
                key={year}
                dataKey={`revenue_${year}`}
                fill={yearColors[year] ?? "#6b7280"}
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
