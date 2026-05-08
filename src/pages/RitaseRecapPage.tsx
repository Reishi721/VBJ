import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Truck } from "lucide-react";
import {
  Button, SectionHeader, DataTable, Select, DatePicker,
} from "../components/ui";
import type { SuratJalan } from "../types";
import { useSuratJalan } from "../hooks/useSuratJalan";
import { useDrivers } from "../hooks/useDrivers";

type Row = {
  key: string;
  driverId?: string;
  driverName: string;
  totalRitase: number;
  suratJalanCount: number;
};

export default function RitaseRecapPage() {
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: drivers = [] } = useDrivers();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");

  const driverOptions = useMemo(() => {
    return drivers.map((d) => ({ value: d.id, label: d.name }));
  }, [drivers]);

  const filtered = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;

    return suratJalans.filter((sj) => {
      if (sj.status === "draft" || sj.status === "cancelled") return false;
      if (driverId && (sj.driverId ?? "") !== driverId) return false;

      const t = new Date(sj.date).getTime();
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;

      return true;
    });
  }, [suratJalans, startDate, endDate, driverId]);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const getKey = (sj: SuratJalan) => {
      if (sj.driverId) return `id:${sj.driverId}`;
      return `name:${sj.driverName || "—"}`;
    };

    for (const sj of filtered) {
      const key = getKey(sj);
      const existing = map.get(key);
      const name =
        sj.driverId ? (drivers.find((d) => d.id === sj.driverId)?.name ?? sj.driverName) : sj.driverName;
      const ritase = sj.ritaseSupir ?? 1;

      if (!existing) {
        map.set(key, {
          key,
          driverId: sj.driverId,
          driverName: name || "—",
          totalRitase: ritase,
          suratJalanCount: 1,
        });
      } else {
        existing.totalRitase += ritase;
        existing.suratJalanCount += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalRitase - a.totalRitase);
  }, [filtered, drivers]);

  const grandTotal = useMemo(() => {
    return rows.reduce(
      (s, r) => ({
        totalRitase: s.totalRitase + r.totalRitase,
        suratJalanCount: s.suratJalanCount + r.suratJalanCount,
      }),
      { totalRitase: 0, suratJalanCount: 0 }
    );
  }, [rows]);

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    {
      header: "Supir",
      accessorKey: "driverName",
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{row.original.driverName}</p>
          {row.original.driverId && (
            <p className="text-[11px] text-gray-400">{row.original.driverId}</p>
          )}
        </div>
      ),
    },
    {
      header: "Total Ritase",
      accessorKey: "totalRitase",
      cell: ({ row }) => (
        <span className="text-[13px] font-bold text-blue-700">
          {row.original.totalRitase}
        </span>
      ),
    },
    {
      header: "Jumlah SJ",
      accessorKey: "suratJalanCount",
      cell: ({ row }) => (
        <span className="text-[13px] font-semibold text-gray-900">{row.original.suratJalanCount}</span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Rekap Ritase Supir"
        description="Perhitungan ritase supir berdasarkan field `ritase_supir` di Surat Jalan"
        action={<Button leftIcon={FileText} onClick={() => window.print()} disabled={rows.length === 0}>Cetak</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DatePicker label="Tanggal Awal" value={startDate} onChange={setStartDate} />
        <DatePicker label="Tanggal Akhir" value={endDate} onChange={setEndDate} />
        <Select
          label="Supir (Opsional)"
          value={driverId}
          onChange={(val) => setDriverId(val)}
          options={[
            { value: "", label: "— Semua Supir —" },
            ...driverOptions,
          ]}
          placeholder="Pilih supir..."
        />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-[15px]">Ringkasan</p>
              <p className="text-slate-300 text-[12px]">{rows.length} supir · {grandTotal.suratJalanCount} Surat Jalan</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-300 text-[11px] font-medium uppercase tracking-wider">Total Ritase</p>
            <p className="text-white font-bold text-lg">{grandTotal.totalRitase}</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-16 text-center text-gray-400">
          Belum ada data Surat Jalan yang memenuhi filter.
        </div>
      ) : (
        <DataTable columns={columns} data={rows} pagination={true} />
      )}
    </div>
  );
}

