import { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRentalRecaps, useAddRecap, useDeleteRecap, useAddRecapColumn, useRemoveRecapColumn, useReorderRecapColumns } from "../hooks/useRentalRecap";
import { useSuratJalan } from "../hooks/useSuratJalan";
import { useCustomers } from "../hooks/useCustomers";
import { useInventoryItems } from "../hooks/useInventory";
import type { RentalRecap, RentalRecapColumn } from "../types";
import {
  Plus, Trash2, Eye, Settings2, GripVertical, X, Printer,
  ChevronDown, ChevronUp, Package2
} from "lucide-react";
import {
  Button, SearchBar, SearchSelect, Select, Modal,
  ConfirmDialog, SectionHeader, usePagination, Pagination
} from "../components/ui";
import { useCompanySettings } from "../hooks/useSettings";

// ─── Recap Print View ─────────────────────────────────────────────────────────
// Hanya di-mount saat viewRecap aktif — tidak subscribe store secara global
function RecapPrintView({ recap }: { recap: RentalRecap }) {
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: settingsData } = useCompanySettings();
  const company = settingsData?.company || { name: "" };
  const { data: customers = [] } = useCustomers();

  const customer = useMemo(
    () => customers.find((c) => c.id === recap.customerId),
    [customers, recap.customerId]
  );

  const { pengiriman, pengembalian, cols } = useMemo(() => {
    const related = suratJalans.filter(
      (sj) =>
        sj.customerId === recap.customerId &&
        (!recap.projectId || sj.projectId === recap.projectId) &&
        sj.status !== "cancelled"
    );
    const sortByDate = (a: typeof related[0], b: typeof related[0]) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };
    return {
      pengiriman: related.filter((s) => s.type === "pengiriman").sort(sortByDate),
      pengembalian: related.filter((s) => s.type === "pengembalian").sort(sortByDate),
      cols: [...recap.columns].sort((a, b) => a.order - b.order),
    };
  }, [suratJalans, recap]);

  // Pre-compute qty lookup: O(1) di render, bukan O(n) tiap baris × kolom
  const qtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...pengiriman, ...pengembalian].forEach((sj) => {
      sj.items.forEach((item) => {
        map[`${sj.id}_${item.inventoryId}`] = item.qty;
      });
    });
    return map;
  }, [pengiriman, pengembalian]);

  const colQty = (sjId: string, col: RentalRecapColumn) =>
    qtyMap[`${sjId}_${col.inventoryId}`] ?? 0;

  const totalCol = useCallback(
    (col: RentalRecapColumn) => {
      const plus = pengiriman.reduce((s, sj) => s + colQty(sj.id, col), 0);
      const minus = pengembalian.reduce((s, sj) => s + colQty(sj.id, col), 0);
      return plus - minus;
    },
    [pengiriman, pengembalian, qtyMap]
  );

  const printRoot = document.getElementById("print-root");
  if (!printRoot) return null;

  return createPortal(
    <div className="hidden print:block font-[Arial] text-[11px] p-6 text-black bg-white w-full">
      <div className="text-center font-bold text-[13px] mb-1">
        REKAPAN PENYEWAAN PERALATAN SCAFFOLDING
      </div>
      <div className="text-center font-bold text-[12px] mb-3 uppercase">{company.name}</div>

      <table className="mb-3 text-[11px]">
        <tbody>
          <tr><td className="w-20">Penyewa</td><td className="w-4">:</td><td>{recap.customerName}</td></tr>
          <tr><td>Alamat</td><td>:</td><td>{recap.customerAddress || customer?.address || ""}</td></tr>
          <tr><td>Proyek</td><td>:</td><td>{recap.projectName || ""}</td></tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="text-center bg-gray-100 font-bold">
            <td rowSpan={2} className="border border-black p-1 w-6">No</td>
            <td rowSpan={2} className="border border-black p-1 w-20">Tanggal</td>
            <td rowSpan={2} className="border border-black p-1 w-20">No Surat Jalan</td>
            {cols.map((col) => (
              <td key={col.id} className="border border-black p-1">{col.inventoryName}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {pengiriman.length > 0 && (
            <tr><td colSpan={3 + cols.length} className="border border-black px-2 py-1 font-bold bg-blue-50">Pengiriman</td></tr>
          )}
          {pengiriman.map((sj, idx) => (
            <tr key={sj.id}>
              <td className="border border-black p-1 text-center">{idx + 1}</td>
              <td className="border border-black p-1 text-center">{sj.date}</td>
              <td className="border border-black p-1 text-center">{sj.number.length > 3 ? sj.number.substring(3) : sj.number}</td>
              {cols.map((col) => {
                const q = colQty(sj.id, col);
                return <td key={col.id} className="border border-black p-1 text-center">{q || ""}</td>;
              })}
            </tr>
          ))}
          {pengembalian.length > 0 && (
            <tr><td colSpan={3 + cols.length} className="border border-black px-2 py-1 font-bold bg-orange-50">Pengembalian</td></tr>
          )}
          {pengembalian.map((sj, idx) => (
            <tr key={sj.id}>
              <td className="border border-black p-1 text-center">{idx + 1}</td>
              <td className="border border-black p-1 text-center">{sj.date}</td>
              <td className="border border-black p-1 text-center">{sj.number.length > 3 ? sj.number.substring(3) : sj.number}</td>
              {cols.map((col) => {
                const q = colQty(sj.id, col);
                return <td key={col.id} className="border border-black p-1 text-center text-red-600">{q ? `(${q})` : ""}</td>;
              })}
            </tr>
          ))}
          <tr className="font-bold bg-gray-100">
            <td colSpan={3} className="border border-black p-1 text-left">Total Alat / Pcs</td>
            {cols.map((col) => (
              <td key={col.id} className="border border-black p-1 text-center">{totalCol(col)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>,
    printRoot
  );
}

// ─── Recap Detail Modal ───────────────────────────────────────────────────────
function RecapDetailModal({ recap, onClose, onManageCols }: {
  recap: RentalRecap;
  onClose: () => void;
  onManageCols: () => void;
}) {
  const { data: suratJalans = [] } = useSuratJalan();
  const { mutate: removeColumn } = useRemoveRecapColumn();
  const { mutate: reorderColumns } = useReorderRecapColumns();

  const { pengiriman, pengembalian, cols } = useMemo(() => {
    const related = suratJalans.filter(
      (sj) =>
        sj.customerId === recap.customerId &&
        (!recap.projectId || sj.projectId === recap.projectId) &&
        sj.status !== "cancelled"
    );
    const sortByDate = (a: typeof related[0], b: typeof related[0]) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };
    return {
      pengiriman: related.filter((s) => s.type === "pengiriman").sort(sortByDate),
      pengembalian: related.filter((s) => s.type === "pengembalian").sort(sortByDate),
      cols: [...recap.columns].sort((a, b) => a.order - b.order),
    };
  }, [suratJalans, recap]);

  // Pre-compute qty lookup: O(1) di render
  const qtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...pengiriman, ...pengembalian].forEach((sj) => {
      sj.items.forEach((item) => {
        map[`${sj.id}_${item.inventoryId}`] = item.qty;
      });
    });
    return map;
  }, [pengiriman, pengembalian]);

  const colQty = (sjId: string, col: RentalRecapColumn) =>
    qtyMap[`${sjId}_${col.inventoryId}`] ?? 0;

  const totalCol = useCallback(
    (col: RentalRecapColumn) => {
      const plus = pengiriman.reduce((s, sj) => s + colQty(sj.id, col), 0);
      const minus = pengembalian.reduce((s, sj) => s + colQty(sj.id, col), 0);
      return plus - minus;
    },
    [pengiriman, pengembalian, qtyMap]
  );

  const moveCol = (idx: number, dir: -1 | 1) => {
    const newCols = [...cols];
    const swap = newCols[idx + dir];
    newCols[idx + dir] = { ...newCols[idx], order: swap.order };
    newCols[idx] = { ...swap, order: newCols[idx].order };
    reorderColumns({ recapId: recap.id, columns: newCols });
  };

  return (
    <Modal open onClose={onClose} title={`Rekapan — ${recap.customerName}`}
      description={recap.projectName || "Semua proyek"} size="xl">
      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            {cols.length} kolom · {pengiriman.length} pengiriman · {pengembalian.length} pengembalian
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={Settings2} onClick={onManageCols}>
              Kelola Kolom
            </Button>
            <Button variant="outline" size="sm" leftIcon={Printer} onClick={() => window.print()}>
              Cetak
            </Button>
          </div>
        </div>

        {cols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Package2 className="w-10 h-10 mb-2 text-gray-200" />
            <p className="font-medium text-sm">Belum ada kolom item</p>
            <p className="text-xs mt-1 mb-4 text-center">
              Klik "Kelola Kolom" untuk menambah kolom secara manual,<br />
              atau sinkronkan otomatis dari surat jalan yang sudah dibuat.
            </p>
            <Button leftIcon={Settings2} onClick={onManageCols}>Kelola &amp; Sinkronkan Kolom</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-[12px] min-w-[600px]">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase text-[10px] w-6">No</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase text-[10px] w-24">Tanggal</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase text-[10px] w-28">No SJ</th>
                  {cols.map((col, idx) => (
                    <th key={col.id} className="px-2 py-2 text-center font-semibold text-gray-500 text-[10px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="truncate max-w-[80px]" title={col.inventoryName}>{col.inventoryName}</span>
                        <span className="text-gray-300 text-[9px]">{col.unit}</span>
                        <div className="flex gap-0.5">
                          <button onClick={() => idx > 0 && moveCol(idx, -1)} disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 transition-colors">
                            <ChevronDown className="w-2.5 h-2.5 rotate-90" />
                          </button>
                          <button onClick={() => idx < cols.length - 1 && moveCol(idx, 1)} disabled={idx === cols.length - 1}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 transition-colors">
                            <ChevronUp className="w-2.5 h-2.5 rotate-90" />
                          </button>
                          <button onClick={() => removeColumn(col.id)}
                            className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Pengiriman section */}
                {(pengiriman.length > 0 || pengembalian.length > 0) && (
                  <tr className="bg-blue-50/50">
                    <td colSpan={3 + cols.length} className="px-3 py-1.5 text-[11px] font-bold text-blue-700">
                      📦 Pengiriman
                    </td>
                  </tr>
                )}
                {pengiriman.length === 0 && (
                  <tr><td colSpan={3 + cols.length} className="px-3 py-2 text-[11px] text-gray-300 italic">Belum ada surat jalan pengiriman</td></tr>
                )}
                {pengiriman.map((sj, idx) => (
                  <tr key={sj.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-600">{sj.date}</td>
                    <td className="px-3 py-2 font-mono text-blue-600 text-[11px]">{sj.number.length > 3 ? sj.number.substring(3) : sj.number}</td>
                    {cols.map((col) => {
                      const q = colQty(sj.id, col);
                      return (
                        <td key={col.id} className="px-2 py-2 text-center font-semibold text-gray-800">
                          {q > 0 ? q : <span className="text-gray-200">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Pengembalian section */}
                <tr className="bg-orange-50/50">
                  <td colSpan={3 + cols.length} className="px-3 py-1.5 text-[11px] font-bold text-orange-700">
                    🔄 Pengembalian
                  </td>
                </tr>
                {pengembalian.length === 0 && (
                  <tr><td colSpan={3 + cols.length} className="px-3 py-2 text-[11px] text-gray-300 italic">Belum ada surat jalan pengembalian</td></tr>
                )}
                {pengembalian.map((sj, idx) => (
                  <tr key={sj.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-600">{sj.date}</td>
                    <td className="px-3 py-2 font-mono text-orange-600 text-[11px]">{sj.number.length > 3 ? sj.number.substring(3) : sj.number}</td>
                    {cols.map((col) => {
                      const q = colQty(sj.id, col);
                      return (
                        <td key={col.id} className="px-2 py-2 text-center font-semibold text-red-500">
                          {q > 0 ? `(${q})` : <span className="text-gray-200">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total row */}
                <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-bold">
                  <td colSpan={3} className="px-3 py-3 text-right text-[12px] text-gray-700">Total Alat / Pcs</td>
                  {cols.map((col) => {
                    const total = totalCol(col);
                    return (
                      <td key={col.id} className={`px-2 py-3 text-center text-[13px] ${total < 0 ? "text-red-600" : total > 0 ? "text-gray-900" : "text-gray-400"}`}>
                        {total}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Manage Columns Modal ─────────────────────────────────────────────────────
function ManageColumnsModal({ recap, onClose }: { recap: RentalRecap; onClose: () => void }) {
  const { mutate: addColumn } = useAddRecapColumn();
  const { mutate: removeColumn } = useRemoveRecapColumn();
  const { mutate: reorderColumns } = useReorderRecapColumns();
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: inventoryItems = [] } = useInventoryItems();
  const [selectedId, setSelectedId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const relatedSJ = useMemo(() =>
    suratJalans.filter(
      (sj) =>
        sj.customerId === recap.customerId &&
        (!recap.projectId || sj.projectId === recap.projectId) &&
        sj.status !== "cancelled"
    ),
    [suratJalans, recap.customerId, recap.projectId]
  );

  const sjInventoryIds = useMemo(() =>
    Array.from(new Set(relatedSJ.flatMap((sj) => sj.items.map((i) => i.inventoryId)))),
    [relatedSJ]
  );

  const alreadyAdded = recap.columns.map((c) => c.inventoryId);
  const available = inventoryItems.filter((i) => !alreadyAdded.includes(i.id));
  const notYetAdded = sjInventoryIds.filter((id) => !alreadyAdded.includes(id));

  const inventoryOptions = useMemo(() =>
    available.map((i) => ({
      value: i.id, label: i.name,
      description: `${i.code} · ${i.unit}`, meta: i.code,
    })),
    [available]
  );

  const handleAdd = () => {
    const inv = inventoryItems.find((i) => i.id === selectedId);
    if (!inv) return;
    addColumn({ recapId: recap.id, col: {
      inventoryId: inv.id, inventoryName: inv.name,
      inventoryCode: inv.code, unit: inv.unit,
    } });
    setSelectedId("");
  };

  const handleSyncFromSJ = () => {
    setSyncing(true);
    notYetAdded.forEach((inventoryId) => {
      const fromSJ = relatedSJ.flatMap((sj) => sj.items).find((i) => i.inventoryId === inventoryId);
      if (!fromSJ) return;
      const fromInventory = inventoryItems.find((i) => i.id === inventoryId);
      addColumn({ recapId: recap.id, col: {
        inventoryId,
        inventoryName: fromInventory?.name ?? fromSJ.inventoryName,
        inventoryCode: fromInventory?.code ?? fromSJ.inventoryCode,
        unit: fromInventory?.unit ?? fromSJ.unit,
      } });
    });
    setSyncing(false);
  };

  const moveCol = (idx: number, dir: -1 | 1) => {
    const sorted = [...recap.columns].sort((a, b) => a.order - b.order);
    const newCols = [...sorted];
    const swap = newCols[idx + dir];
    newCols[idx + dir] = { ...newCols[idx], order: swap.order };
    newCols[idx] = { ...swap, order: newCols[idx].order };
    reorderColumns({ recapId: recap.id, columns: newCols });
  };

  const cols = [...recap.columns].sort((a, b) => a.order - b.order);

  return (
    <Modal open onClose={onClose} title="Kelola Kolom Item" size="md"
      description="Pilih item inventaris yang ingin ditampilkan sebagai kolom">
      <div className="space-y-4">

        {/* Auto-sync banner */}
        {notYetAdded.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex-1">
              <p className="text-[12px] font-bold text-blue-800">Ditemukan {notYetAdded.length} item baru dari Surat Jalan</p>
              <p className="text-[11px] text-blue-600 mt-0.5">Item ini ada di surat jalan tapi belum jadi kolom rekapan</p>
            </div>
            <Button size="sm" onClick={handleSyncFromSJ} loading={syncing}>
              Tambah Semua
            </Button>
          </div>
        )}

        {/* Manual add */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchSelect
              placeholder="Pilih item inventaris secara manual..."
              value={selectedId}
              onChange={setSelectedId}
              options={inventoryOptions}
            />
          </div>
          <Button onClick={handleAdd} disabled={!selectedId} leftIcon={Plus}>Tambah</Button>
        </div>

        {/* Active columns list */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Kolom Aktif ({cols.length})
          </p>
          {cols.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic py-4 text-center">Belum ada kolom. Klik "Tambah Semua" di atas untuk mengisi otomatis.</p>
          ) : (
            <div className="space-y-1.5">
              {cols.map((col, idx) => (
                <div key={col.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 group/col">
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{col.inventoryName}</p>
                    <p className="text-[11px] text-gray-400">{col.inventoryCode} · {col.unit}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
                    <button onClick={() => idx > 0 && moveCol(idx, -1)} disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 transition-colors" title="Geser Kiri">
                      <ChevronDown className="w-3 h-3 rotate-90" />
                    </button>
                    <button onClick={() => idx < cols.length - 1 && moveCol(idx, 1)} disabled={idx === cols.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-20 transition-colors" title="Geser Kanan">
                      <ChevronUp className="w-3 h-3 rotate-90" />
                    </button>
                    <button onClick={() => removeColumn(col.id)}
                      className="p-1 rounded hover:bg-red-100 text-red-400 transition-colors" title="Hapus Kolom">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Recap Modal ───────────────────────────────────────────────────────
function CreateRecapModal({ onClose }: { onClose: () => void }) {
  const { mutate: addRecap } = useAddRecap();
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({ customerId: "", projectId: "" });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const projectOptions = selectedCustomer?.projects.map((p) => ({
    value: p.id, label: p.name, description: p.location,
  })) ?? [];
  const customerOptions = customers.map((c) => ({
    value: c.id, label: c.name, description: c.company || c.phone,
  }));

  const relatedSJ = useMemo(() =>
    suratJalans.filter(
      (sj) =>
        sj.customerId === form.customerId &&
        (!form.projectId || sj.projectId === form.projectId) &&
        sj.status !== "cancelled"
    ),
    [suratJalans, form.customerId, form.projectId]
  );

  const autoItemIds = useMemo(() =>
    Array.from(new Set(relatedSJ.flatMap((sj) => sj.items.map((i) => i.inventoryId)))),
    [relatedSJ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) return;
    const cust = customers.find((c) => c.id === form.customerId)!;
    const proj = selectedCustomer?.projects.find((p) => p.id === form.projectId);
    const autoColumns = autoItemIds.map((inventoryId, order) => {
      const fromSJ = relatedSJ.flatMap((sj) => sj.items).find((i) => i.inventoryId === inventoryId)!;
      const fromInv = inventoryItems.find((i) => i.id === inventoryId);
      return {
        id: `col-${Date.now()}-${order}`,
        inventoryId,
        inventoryName: fromInv?.name ?? fromSJ.inventoryName,
        inventoryCode: fromInv?.code ?? fromSJ.inventoryCode,
        unit: fromInv?.unit ?? fromSJ.unit,
        order,
      };
    });
    addRecap({
      customerId: cust.id, customerName: cust.name, customerAddress: cust.address,
      projectId: proj?.id, projectName: proj?.name, columns: autoColumns,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Buat Rekapan Baru" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SearchSelect label="Pelanggan" required placeholder="Pilih pelanggan..."
          value={form.customerId}
          onChange={(val) => setForm({ customerId: val, projectId: "" })}
          options={customerOptions}
        />
        {projectOptions.length > 0 && (
          <Select label="Proyek (Opsional)" value={form.projectId}
            onChange={(val) => setForm((f) => ({ ...f, projectId: val }))}
            options={[{ value: "", label: "— Semua Proyek —" }, ...projectOptions]}
          />
        )}
        {form.customerId && (
          <div className={`p-3 rounded-xl border text-[12px] ${autoItemIds.length > 0
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-gray-50 border-gray-100 text-gray-500"
            }`}>
            {autoItemIds.length > 0 ? (
              <>
                <p className="font-bold">✅ {autoItemIds.length} kolom item akan ditambah otomatis</p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  Dideteksi dari {relatedSJ.length} surat jalan pelanggan ini
                </p>
              </>
            ) : (
              <p>Belum ada surat jalan. Kolom bisa ditambah manual nanti dari Kelola Kolom.</p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={!form.customerId}>Buat Rekapan</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RentalRecapPage() {
  const { data: recaps = [] } = useRentalRecaps();
  const { mutate: deleteRecap } = useDeleteRecap();
  const { data: suratJalans = [] } = useSuratJalan();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewRecap, setViewRecap] = useState<RentalRecap | null>(null);
  const [manageCols, setManageCols] = useState<RentalRecap | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(
    () => recaps.filter(
      (r) =>
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (r.projectName || "").toLowerCase().includes(search.toLowerCase())
    ),
    [recaps, search]
  );

  const { page, pageCount, pageSize, setPage, setPageSize, paginate } = usePagination(filtered.length, 12);
  const pagedRecaps = paginate(filtered);

  const getSJCount = useCallback(
    (recap: RentalRecap) =>
      suratJalans.filter(
        (sj) =>
          sj.customerId === recap.customerId &&
          (!recap.projectId || sj.projectId === recap.projectId) &&
          sj.status !== "cancelled"
      ).length,
    [suratJalans]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Rekapan Penyewa"
        description="Rekap pengiriman & pengembalian peralatan scaffolding per penyewa"
        action={<Button leftIcon={Plus} onClick={() => setShowCreate(true)}>Buat Rekapan</Button>}
      />

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Cari pelanggan atau proyek..." />
      </div>

      {recaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Package2 className="w-14 h-14 mb-3 text-gray-200" />
          <p className="text-base font-semibold">Belum ada rekapan</p>
          <p className="text-sm mt-1 mb-4">Buat rekapan untuk melacak barang per penyewa</p>
          <Button leftIcon={Plus} onClick={() => setShowCreate(true)}>Buat Rekapan Pertama</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedRecaps.map((recap) => {
              const sjCount = getSJCount(recap);
              const colCount = recap.columns.length;
              return (
                <div key={recap.id}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer"
                  onClick={() => setViewRecap(recap)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {recap.customerName[0]}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setManageCols(recap); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Kelola Kolom">
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDelId(recap.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[14px] font-bold text-gray-900 truncate">{recap.customerName}</p>
                  {recap.projectName && (
                    <p className="text-[12px] text-gray-400 truncate mt-0.5">{recap.projectName}</p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center">
                      <p className="text-[18px] font-bold text-blue-700">{sjCount}</p>
                      <p className="text-[10px] text-blue-500 font-medium">Surat Jalan</p>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded-xl p-2.5 text-center">
                      <p className="text-[18px] font-bold text-purple-700">{colCount}</p>
                      <p className="text-[10px] text-purple-500 font-medium">Kolom Item</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3.5 h-3.5" />
                    Lihat Rekapan
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      )}

      {/* Modals — hanya mount saat dibutuhkan */}
      {showCreate && <CreateRecapModal onClose={() => setShowCreate(false)} />}

      {/* RecapPrintView hanya mount saat viewRecap aktif — tidak lagi selalu subscribe store */}
      {viewRecap && (
        <>
          <RecapPrintView recap={viewRecap} />
          <RecapDetailModal
            recap={recaps.find((r) => r.id === viewRecap.id) ?? viewRecap}
            onClose={() => setViewRecap(null)}
            onManageCols={() => { setManageCols(viewRecap); }}
          />
        </>
      )}

      {manageCols && (
        <ManageColumnsModal
          recap={recaps.find((r) => r.id === manageCols.id) ?? manageCols}
          onClose={() => setManageCols(null)}
        />
      )}

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { if (delId) deleteRecap(delId); setDelId(null); }}
        title="Hapus Rekapan?"
        description="Data rekapan ini akan dihapus permanen."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
