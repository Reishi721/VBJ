import { useState, useMemo, useCallback } from "react";
import { useDraftGuard } from "../hooks/useDraftGuard";
import {
  usePurchaseOrders, useAddPO, useUpdatePO, useDeletePO,
  useReceivePO, useCancelPO,
} from "../hooks/usePurchaseOrders";
import { useInventoryItems } from "../hooks/useInventory";
import { useAuth } from "../contexts/AuthContext";
import type { PurchaseOrder, PurchaseOrderItem, POStatus } from "../types";
import { formatRupiah } from "../components/invoice/InvoiceHelpers";
import {
  SectionHeader, StatsRow, Button, Modal, ConfirmDialog,
  SearchBar, DataTable, TextInput, Textarea, DraftGuardDialog,
} from "../components/ui";
import {
  Plus, Pencil, Trash2, Package2, XCircle, CheckCircle2,
  ShoppingCart, Truck, Clock, Eye,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META: Record<POStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-600" },
  ordered:   { label: "Dipesan",   className: "bg-blue-100 text-blue-600" },
  partial:   { label: "Sebagian",  className: "bg-amber-100 text-amber-700" },
  completed: { label: "Selesai",   className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Dibatalkan",className: "bg-red-100 text-red-500" },
};

function POStatusBadge({ status }: { status: POStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${m.className}`}>
      {m.label}
    </span>
  );
}

// ─── Empty PO item ────────────────────────────────────────────────────────────
const emptyItem = (): PurchaseOrderItem => ({
  inventoryCode: "", inventoryName: "", unit: "pcs",
  qtyOrdered: 1, qtyReceived: 0, unitPrice: 0, subtotal: 0,
});

type FormState = Omit<PurchaseOrder, "id" | "createdAt" | "number">;
const emptyForm = (): FormState => ({
  date:            format(new Date(), "yyyy-MM-dd"),
  supplierName:    "",
  supplierPhone:   "",
  supplierAddress: "",
  status:          "draft",
  items:           [emptyItem()],
  subtotal:        0, discount: 0, total: 0,
  notes:           "",
});

// ─── Receive Modal ────────────────────────────────────────────────────────────
function ReceiveModal({
  po, onClose,
}: {
  po: PurchaseOrder;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { mutate: receivePO, isPending } = useReceivePO();
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(po.items.map(i => [i.id!, 0]))
  );

  const remaining = (item: PurchaseOrderItem) =>
    item.qtyOrdered - item.qtyReceived;

  const handleSubmit = () => {
    const receivedItems = po.items
      .filter(i => i.id && qtys[i.id] > 0)
      .map(i => ({
        itemId:       i.id!,
        inventoryId:  i.inventoryId ?? "",
        qtyReceived:  qtys[i.id!],
      }));
    if (!receivedItems.length) return;
    receivePO({ po, receivedItems, receivedBy: profile?.id ?? "" }, { onSuccess: onClose });
  };

  return (
    <Modal open onClose={onClose} title={`Terima Barang — ${po.number}`} size="md">
      <div className="space-y-4">
        <p className="text-[13px] text-gray-500">
          Masukkan jumlah barang yang diterima untuk setiap item.
        </p>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          {po.items.map(item => {
            const rem = remaining(item);
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{item.inventoryName}</p>
                  <p className="text-[11px] text-gray-400">
                    Dipesan: {item.qtyOrdered} | Sudah diterima: {item.qtyReceived} | Sisa: {rem}
                  </p>
                </div>
                <input
                  type="number" min={0} max={rem}
                  value={qtys[item.id!] ?? 0}
                  onChange={e => setQtys(q => ({ ...q, [item.id!]: Number(e.target.value) }))}
                  className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] font-bold"
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button leftIcon={CheckCircle2} onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Konfirmasi Penerimaan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const { data: pos = [] }   = usePurchaseOrders();
  const { data: invItems = [] }       = useInventoryItems();
  const { mutate: addPO }             = useAddPO();
  const { mutate: updatePO }          = useUpdatePO();
  const { mutate: deletePO }          = useDeletePO();
  const { mutate: cancelPO }          = useCancelPO();

  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus | "all">("all");
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [delId,     setDelId]     = useState<string | null>(null);
  const [viewPO,    setViewPO]    = useState<PurchaseOrder | null>(null);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     pos.length,
    ordered:   pos.filter(p => p.status === "ordered" || p.status === "partial").length,
    completed: pos.filter(p => p.status === "completed").length,
    totalValue:pos.filter(p => p.status !== "cancelled").reduce((s, p) => s + p.total, 0),
  }), [pos]);

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => pos.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  }), [pos, search, statusFilter]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setForm(emptyForm()); setEditingId(null); setShowForm(true);
  }, []);

  const openEdit = useCallback((po: PurchaseOrder) => {
    setForm({
      date: po.date, supplierName: po.supplierName,
      supplierPhone: po.supplierPhone ?? "", supplierAddress: po.supplierAddress ?? "",
      status: po.status, items: po.items.map(i => ({ ...i })),
      subtotal: po.subtotal, discount: po.discount, total: po.total,
      notes: po.notes ?? "",
    });
    setEditingId(po.id); setShowForm(true);
  }, []);

  const setItem = (idx: number, patch: Partial<PurchaseOrderItem>) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        merged.subtotal = merged.qtyOrdered * merged.unitPrice;
        return merged;
      });
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
      return { ...f, items, subtotal, total: subtotal - (f.discount ?? 0) };
    });
  };

  const addItemRow = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItemRow = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  // ── Pick inventory item ────────────────────────────────────────────────────
  const pickInventory = (idx: number, inventoryId: string) => {
    const inv = invItems.find(i => i.id === inventoryId);
    if (inv) setItem(idx, { inventoryId, inventoryCode: inv.code, inventoryName: inv.name, unit: inv.unit });
  };

  // ── Form close + draft guard ───────────────────────────────────────────────
  const closeFormAndReset = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }, []);

  const saveDraftCb = useCallback(async () => {
    const draftForm = { ...form, status: "draft" as POStatus };
    return new Promise<void>((resolve, reject) => {
      if (editingId) {
        updatePO({ id: editingId, input: draftForm }, {
          onSuccess: () => { closeFormAndReset(); resolve(); },
          onError: reject,
        });
      } else {
        addPO(draftForm, {
          onSuccess: () => { closeFormAndReset(); resolve(); },
          onError: reject,
        });
      }
    });
  }, [form, editingId, addPO, updatePO, closeFormAndReset]);

  const guard = useDraftGuard({
    form: form as Record<string, unknown>,
    emptyForm: emptyForm() as Record<string, unknown>,
    onDiscard: closeFormAndReset,
    onSaveDraft: saveDraftCb,
    isDirty: (f) => !!(f["supplierName"] as string)?.trim(),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!form.supplierName || !form.date) return;
    if (editingId) {
      updatePO({ id: editingId, input: form }, { onSuccess: () => closeFormAndReset() });
    } else {
      addPO(form, { onSuccess: () => closeFormAndReset() });
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(() => [
    {
      header: "Nomor PO",
      accessorKey: "number",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-blue-700 text-[12px]">{row.original.number}</span>
      ),
    },
    {
      header: "Tanggal",
      accessorKey: "date",
      cell: ({ row }) => format(parseISO(row.original.date), "dd MMM yyyy", { locale: idLocale }),
    },
    {
      header: "Supplier",
      accessorKey: "supplierName",
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{row.original.supplierName}</p>
          {row.original.supplierPhone && (
            <p className="text-[11px] text-gray-400">{row.original.supplierPhone}</p>
          )}
        </div>
      ),
    },
    {
      header: "Item",
      id: "items",
      cell: ({ row }) => <span className="text-[13px]">{row.original.items.length} jenis</span>,
    },
    {
      header: "Total",
      accessorKey: "total",
      cell: ({ row }) => (
        <span className="font-bold text-gray-900 text-[13px]">{formatRupiah(row.original.total)}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <POStatusBadge status={row.original.status} />,
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Terima barang — only for ordered/partial */}
            {(po.status === "ordered" || po.status === "partial") && (
              <button
                onClick={() => setReceivePO(po)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
              >
                <Truck className="w-3.5 h-3.5" />
                Terima
              </button>
            )}
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setViewPO(po)} title="Detail">
              <Eye className="w-4 h-4 text-gray-400" />
            </Button>
            {po.status === "draft" && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(po)} title="Edit">
                <Pencil className="w-4 h-4 text-gray-400" />
              </Button>
            )}
            {po.status !== "cancelled" && po.status !== "completed" && (
              <button
                onClick={() => cancelPO(po)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Batalkan"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {po.status === "draft" && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(po.id)} title="Hapus">
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [openEdit, cancelPO]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Purchase Order"
        description="Kelola pembelian dan penerimaan barang dari supplier"
        action={<Button leftIcon={Plus} onClick={openCreate}>Buat PO</Button>}
      />

      {/* Stats */}
      <StatsRow stats={[
        { label: "Total PO",       value: String(stats.total),     icon: ShoppingCart, iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
        { label: "Dalam Proses",   value: String(stats.ordered),   icon: Clock,        iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
        { label: "Selesai",        value: String(stats.completed), icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { label: "Nilai Pembelian",value: formatRupiah(stats.totalValue), icon: Package2, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
      ]} />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Cari nomor PO atau supplier..." className="flex-1 min-w-[200px]" />
        <div className="flex gap-1.5">
          {(["all", "draft", "ordered", "partial", "completed", "cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                statusFilter === s
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "Semua" : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filtered}
        columns={columns}
        className=""
      />

      {/* ── Form Modal ───────────────────────────────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={guard.handleClose}
        title={editingId ? "Edit Purchase Order" : "Buat Purchase Order Baru"}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Tanggal PO" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <TextInput label="Nama Supplier *" value={form.supplierName}
              onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
              placeholder="CV Sumber Materi" />
            <TextInput label="No. Telepon Supplier" value={form.supplierPhone ?? ""}
              onChange={e => setForm(f => ({ ...f, supplierPhone: e.target.value }))}
              placeholder="08xx" />
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as POStatus }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {(["draft", "ordered"] as POStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <Textarea label="Alamat Supplier" value={form.supplierAddress ?? ""}
            onChange={e => setForm(f => ({ ...f, supplierAddress: e.target.value }))}
            placeholder="Jl. ..." rows={2} />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold text-gray-700">Daftar Item</p>
              <Button variant="ghost" size="sm" leftIcon={Plus} onClick={addItemRow}>Tambah Item</Button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-[12px]">
                <thead className="bg-gray-50 text-gray-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2 text-left">Inventaris</th>
                    <th className="px-3 py-2 text-left w-16">Qty</th>
                    <th className="px-3 py-2 text-left w-20">Satuan</th>
                    <th className="px-3 py-2 text-left w-32">Harga Satuan</th>
                    <th className="px-3 py-2 text-right w-28">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-3 py-2">
                        <select
                          value={item.inventoryId ?? ""}
                          onChange={e => pickInventory(idx, e.target.value)}
                          className="w-full border-0 bg-transparent text-[12px] focus:outline-none text-gray-900"
                        >
                          <option value="">-- Pilih Barang --</option>
                          {invItems.map(i => (
                            <option key={i.id} value={i.id}>[{i.code}] {i.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={1} value={item.qtyOrdered}
                          onChange={e => setItem(idx, { qtyOrdered: Number(e.target.value) })}
                          className="w-full text-center border border-gray-200 rounded-lg px-1.5 py-1 text-[12px]" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.unit}
                          onChange={e => setItem(idx, { unit: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-[12px]" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={0} value={item.unitPrice}
                          onChange={e => setItem(idx, { unitPrice: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-[12px]" />
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{formatRupiah(item.subtotal)}</td>
                      <td className="px-2 py-2">
                        {form.items.length > 1 && (
                          <button onClick={() => removeItemRow(idx)}
                            className="text-gray-300 hover:text-red-400 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500">Subtotal</td>
                    <td className="px-3 py-2 text-right font-bold text-[13px]">{formatRupiah(form.subtotal)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-1.5 text-right text-[11px] font-semibold text-gray-500">Diskon</td>
                    <td className="px-3 py-1.5">
                      <input type="number" min={0} value={form.discount}
                        onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value), total: f.subtotal - Number(e.target.value) }))}
                        className="w-full text-right border border-gray-200 rounded-lg px-2 py-1 text-[12px]" />
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-[12px] font-bold text-gray-700">TOTAL</td>
                    <td className="px-3 py-2 text-right font-extrabold text-[14px] text-blue-700">{formatRupiah(form.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <Textarea label="Catatan" value={form.notes ?? ""}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="ghost" onClick={guard.handleClose}>Batal</Button>
            <Button onClick={handleSubmit}>{editingId ? "Simpan Perubahan" : "Buat PO"}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Detail View Modal ────────────────────────────────────────────────── */}
      {viewPO && (
        <Modal open={!!viewPO} onClose={() => setViewPO(null)} title={`Detail PO — ${viewPO.number}`} size="lg">
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
              <div><p className="text-[11px] text-gray-400">Supplier</p><p className="font-semibold">{viewPO.supplierName}</p></div>
              <div><p className="text-[11px] text-gray-400">Tanggal</p><p className="font-semibold">{format(parseISO(viewPO.date), "dd MMMM yyyy", { locale: idLocale })}</p></div>
              <div><p className="text-[11px] text-gray-400">Status</p><POStatusBadge status={viewPO.status} /></div>
              <div><p className="text-[11px] text-gray-400">Total</p><p className="font-bold text-blue-700">{formatRupiah(viewPO.total)}</p></div>
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Barang</th>
                  <th className="px-3 py-2 text-center">Dipesan</th>
                  <th className="px-3 py-2 text-center">Diterima</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {viewPO.items.map((item, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900">{item.inventoryName}</p>
                      <p className="text-gray-400">{item.inventoryCode} · {item.unit}</p>
                    </td>
                    <td className="px-3 py-2 text-center">{item.qtyOrdered}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={item.qtyReceived >= item.qtyOrdered ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                        {item.qtyReceived}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {viewPO.notes && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[11px] text-gray-400 mb-1">Catatan</p>
                <p>{viewPO.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Receive Barang Modal ──────────────────────────────────────────────── */}
      {receivePO && (
        <ReceiveModal po={receivePO} onClose={() => setReceivePO(null)} />
      )}

      {/* ── Confirm Delete ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { if (delId) { deletePO(delId); setDelId(null); } }}
        title="Hapus Purchase Order?"
        description="PO yang dihapus tidak bisa dikembalikan. Stok tidak akan berubah karena status masih draft."
        confirmLabel="Hapus"
        variant="danger"
      />

      {/* ── Draft Guard Dialog ─────────────────────────────────────────────── */}
      <DraftGuardDialog
        open={guard.showGuard}
        entityName="Purchase Order"
        filledName={guard.filledName}
        onSaveDraft={guard.confirmSaveDraft}
        onDiscard={guard.confirmDiscard}
        onCancel={guard.cancelGuard}
        savingDraft={guard.savingDraft}
      />
    </div>
  );
}
