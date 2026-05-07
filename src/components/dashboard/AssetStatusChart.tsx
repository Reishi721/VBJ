import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../ui";
import { useInventoryStore } from "../../stores/useInventoryStore";

export default function AssetStatusChart() {
  const { items } = useInventoryStore();

  const data = useMemo(() => {
    const totalStock   = items.reduce((s, i) => s + i.stock, 0);
    const damaged      = items.filter(i => i.condition === "damaged").reduce((s, i) => s + i.stock, 0);
    const maintenance  = items.filter(i => i.condition === "maintenance").reduce((s, i) => s + i.stock, 0);
    const available    = items.filter(i => i.condition === "good").reduce((s, i) => s + i.stock, 0);

    return [
      { name: "Tersedia",     value: available,   color: "#10b981" },
      { name: "Maintenance",  value: maintenance,  color: "#f59e0b" },
      { name: "Rusak",        value: damaged,      color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [items]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="flex flex-col h-full">
      <div className="p-5 pb-0 shrink-0">
        <h3 className="text-[15px] font-bold text-gray-900">Status Aset</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">Distribusi kondisi inventaris</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-5 pt-2">
        <div className="relative w-full" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString("id-ID")} Unit`, ""]}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-bold text-gray-900">{total.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-gray-400 font-medium">Total Unit</p>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/80">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500 truncate">{item.name}</p>
              </div>
              <p className="text-[11px] font-bold text-gray-700">{item.value.toLocaleString("id-ID")}</p>
            </div>
          ))}
          {/* Total items count */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/60">
            <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-blue-500 truncate">Total SKU</p>
            </div>
            <p className="text-[11px] font-bold text-blue-700">{items.length}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
