import { useState, useMemo, useCallback } from "react";
import { useDraftGuard } from "../hooks/useDraftGuard";
import { useSuratJalan, useAddSuratJalan, useUpdateSuratJalan, useDeleteSuratJalan, useUpdateSJStatus } from "../hooks/useSuratJalan";
import { useCustomers } from "../hooks/useCustomers";
import { useInventoryItems } from "../hooks/useInventory";
import type { SuratJalan, SuratJalanItem } from "../types";
import { Plus, Pencil, Trash2, Eye, Truck, FileText, CheckCircle2, XCircle, Clock, Send, MapPin, User, Phone, Printer } from "lucide-react";
import SuratJalanPrintModal from "../components/surat-jalan/SuratJalanPrintModal";
import {
  Button, SearchBar, TextInput, Textarea, Select, SearchSelect,
  Badge, Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable, DatePicker,
  DraftGuardDialog,
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function SJStatusBadge({ status }: { status: SuratJalan["status"] }) {
  const map = {
    draft:     { label: "Draft",     variant: "gray"    as const, icon: Clock },
    sent:      { label: "Dikirim",   variant: "blue"    as const, icon: Send },
    delivered: { label: "Diterima",  variant: "emerald" as const, icon: CheckCircle2 },
    cancelled: { label: "Dibatalkan",variant: "red"     as const, icon: XCircle },
  };
  const m = map[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

// ─── Empty item row ───────────────────────────────────────────────────────────
const emptyLineItem: SuratJalanItem = { inventoryId: "", inventoryCode: "", inventoryName: "", unit: "pcs", qty: 1 };

const emptyForm = {
  number: "",
  customerId: "", customerName: "", projectId: "", projectName: "",
  date: new Date().toISOString().split("T")[0],
  type: "pengiriman" as SuratJalan["type"],
  recipientName: "", recipientPhone: "", deliveryAddress: "",
  driverName: "", vehiclePlate: "",
  status: "sent" as SuratJalan["status"],
  notes: "", items: [{ ...emptyLineItem }],
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ sj, onClose }: { sj: SuratJalan; onClose: () => void }) {
  const [showPrint, setShowPrint] = useState(false);

  return (
    <>
    <Modal open onClose={onClose} title={`Surat Jalan — ${sj.number}`} size="lg"
      description={`Tanggal: ${sj.date} · Status: ${sj.status}`}>
      <div className="space-y-5">
        {/* Print Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[13px] font-semibold shadow-sm shadow-blue-500/20 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            Cetak Surat Jalan
          </button>
        </div>
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pelanggan</p>
              <p className="text-[13px] font-semibold text-gray-900">{sj.customerName}</p>
              {sj.projectName && <p className="text-[12px] text-gray-500">{sj.projectName}</p>}
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Penerima</p>
              <p className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" />{sj.recipientName}</p>
              {sj.recipientPhone && <p className="text-[12px] text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{sj.recipientPhone}</p>}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alamat Pengiriman</p>
              <p className="text-[12px] text-gray-700 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />{sj.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Daftar Barang</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">#</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Kode</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Nama Barang</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Satuan</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Ket.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sj.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3"><span className="font-mono text-[12px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{item.inventoryCode}</span></td>
                    <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{item.inventoryName}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-bold text-gray-900">{item.qty}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{item.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50/50">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-[12px] font-semibold text-gray-500 text-right">Total Item:</td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-bold text-gray-900">{sj.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {sj.notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Catatan</p>
            <p className="text-[13px] text-amber-900">{sj.notes}</p>
          </div>
        )}
      </div>
    </Modal>
    {showPrint && <SuratJalanPrintModal sj={sj} onClose={() => setShowPrint(false)} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuratJalanPage() {
  const { data: suratJalans = [] } = useSuratJalan();
  const { data: customers = [] } = useCustomers();
  const { data: inventoryItems = [] } = useInventoryItems();

  const { mutate: addSuratJalan } = useAddSuratJalan();
  const { mutate: updateSuratJalan } = useUpdateSuratJalan();
  const { mutate: deleteSuratJalan } = useDeleteSuratJalan();
  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateSJStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [viewSJ, setViewSJ] = useState<SuratJalan | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [printSJ, setPrintSJ] = useState<SuratJalan | null>(null);

  // ─ Derived data ─
  const selectedCustomer = customers.find(c => c.id === form.customerId);
  const projectOptions = useMemo(() =>
    selectedCustomer?.projects.map(p => ({ value: p.id, label: p.name, description: p.location })) ?? [],
    [selectedCustomer]);

  const customerOptions = useMemo(() =>
    customers.map(c => ({ value: c.id, label: c.name, description: c.company || c.phone })),
    [customers]);

  const inventoryOptions = useMemo(() =>
    inventoryItems.filter(i => i.condition === "good").map(i => ({
      value: i.id, label: i.name, description: `${i.code} · Stok: ${i.stock} ${i.unit}`, meta: i.code
    })), [inventoryItems]);

  // ─ Filtered list ─
  const filtered = useMemo(() =>
    suratJalans.filter(sj => {
      const matchSearch =
        sj.number.toLowerCase().includes(search.toLowerCase()) ||
        sj.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || sj.status === statusFilter;
      return matchSearch && matchStatus;
    }), [suratJalans, search, statusFilter]);

  // ─ Stats ─
  const drafted = suratJalans.filter(s => s.status === "draft").length;
  const sent = suratJalans.filter(s => s.status === "sent").length;
  const delivered = suratJalans.filter(s => s.status === "delivered").length;

  // ─ Handlers ─
  const openCreate = useCallback(() => {
    setForm({ ...emptyForm, number: "", items: [{ ...emptyLineItem }] });
    setEditingId(null); setShowForm(true);
  }, []);

  const openEdit = useCallback((sj: SuratJalan) => {
    setForm({
      number: sj.number,
      customerId: sj.customerId, customerName: sj.customerName,
      projectId: sj.projectId || "", projectName: sj.projectName || "",
      date: sj.date, type: sj.type,
      recipientName: sj.recipientName,
      recipientPhone: sj.recipientPhone || "", deliveryAddress: sj.deliveryAddress,
      driverName: sj.driverName, vehiclePlate: sj.vehiclePlate,
      status: sj.status, notes: sj.notes || "",
      items: sj.items.map(i => ({ ...i })),
    });
    setEditingId(sj.id); setShowForm(true);
  }, []);

  const closeFormAndReset = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm, items: [{ ...emptyLineItem }] });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = form.items.filter(i => i.inventoryId && i.qty > 0);
    if (!validItems.length) return alert("Tambahkan minimal 1 barang.");
    if (editingId) updateSuratJalan({ id: editingId, input: { ...form, items: validItems } });
    else addSuratJalan({ ...form, items: validItems });
    closeFormAndReset();
  };

  const saveDraftCb = useCallback(async () => {
    const draftForm = { ...form, status: "draft" as SuratJalan["status"] };
    const validItems = draftForm.items.filter(i => i.inventoryId && i.qty > 0);
    return new Promise<void>((resolve, reject) => {
      if (editingId) {
        updateSuratJalan({ id: editingId, input: { ...draftForm, items: validItems } }, {
          onSuccess: () => { closeFormAndReset(); resolve(); },
          onError: reject,
        });
      } else {
        addSuratJalan({ ...draftForm, items: validItems.length ? validItems : form.items }, {
          onSuccess: () => { closeFormAndReset(); resolve(); },
          onError: reject,
        });
      }
    });
  }, [form, editingId, addSuratJalan, updateSuratJalan, closeFormAndReset]);

  const guard = useDraftGuard({
    form: form as Record<string, unknown>,
    emptyForm: { ...emptyForm, items: [] } as Record<string, unknown>,
    onDiscard: closeFormAndReset,
    onSaveDraft: saveDraftCb,
    isDirty: (f) => !!(f["customerName"] as string)?.trim(),
  });

  // ─ Line item helpers ─
  const addLineItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyLineItem }] }));
  const removeLineItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateLineItem = (idx: number, updates: Partial<SuratJalanItem>) =>
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, ...updates } : item) }));

  const pickInventory = (idx: number, inventoryId: string) => {
    const inv = inventoryItems.find(i => i.id === inventoryId);
    if (inv) updateLineItem(idx, { inventoryId, inventoryCode: inv.code, inventoryName: inv.name, unit: inv.unit });
  };

  // ─ Status progression helper ─
  const nextStatus = (current: SuratJalan["status"]): SuratJalan["status"] | null => {
    if (current === "draft")      return "sent";
    if (current === "sent")       return "delivered";
    return null;
  };
  const nextLabel = (current: SuratJalan["status"]): string => {
    if (current === "draft")  return "Kirim";
    if (current === "sent")   return "Konfirmasi Diterima";
    return "";
  };

  // ─ Columns ─
  const columns = useMemo<ColumnDef<SuratJalan>[]>(() => [
    {
      header: "No. Surat Jalan",
      accessorKey: "number",
      cell: ({ row }) => (
        <span className="font-mono text-[13px] font-bold text-blue-600">{row.original.number}</span>
      ),
    },
    {
      header: "Tanggal",
      accessorKey: "date",
      cell: ({ row }) => <span className="text-[12px] text-gray-500">{row.original.date}</span>,
    },
    {
      header: "Pelanggan & Proyek",
      id: "customer",
      cell: ({ row }) => {
        const sj = row.original;
        return (
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{sj.customerName}</p>
            {sj.projectName && <p className="text-[11px] text-gray-400">{sj.projectName}</p>}
          </div>
        );
      },
    },
    {
      header: "Status",
      id: "status",
      cell: ({ row }) => <SJStatusBadge status={row.original.status} />,
    },
    {
      header: "Item",
      id: "items",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
          {row.original.items.length} jenis · {row.original.items.reduce((s, i) => s + i.qty, 0)} pcs
        </span>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const sj = row.original;
        const next = nextStatus(sj.status);
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Advance status button */}
            {next && (
              <button
                disabled={updatingStatus}
                onClick={() => updateStatus({ sj, newStatus: next })}
                title={nextLabel(sj.status)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  next === "delivered"
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {next === "delivered" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                {nextLabel(sj.status)}
              </button>
            )}
            {/* Cancel button — only for non-delivered */}
            {sj.status !== "cancelled" && sj.status !== "delivered" && (
              <button
                onClick={() => updateStatus({ sj, newStatus: "cancelled" })}
                title="Batalkan"
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setViewSJ(sj)} title="Lihat detail">
              <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setPrintSJ(sj)} title="Cetak">
              <Printer className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
            </Button>
            {sj.status === "draft" && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(sj)} title="Edit">
                <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(sj.id)} title="Hapus">
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ], [openEdit, updateStatus, updatingStatus, nextStatus, nextLabel]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Surat Jalan"
        description="Kelola pengiriman barang scaffolding ke pelanggan"
        action={<Button leftIcon={Plus} onClick={openCreate}>Buat Surat Jalan</Button>}
      />

      <StatsRow stats={[
        { label: "Total", value: suratJalans.length, icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Draft", value: drafted, icon: Clock, iconBg: "bg-gray-100", iconColor: "text-gray-500" },
        { label: "Dalam Pengiriman", value: sent, icon: Truck, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        { label: "Terkirim", value: delivered, icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      ]} />

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 w-fit">
          {(["all", "draft", "sent", "delivered", "cancelled"] as const).map((s) => {
            const labels: Record<string, string> = { all: "Semua", draft: "Draft", sent: "Dikirim", delivered: "Diterima", cancelled: "Batal" };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nomor, pelanggan, pengemudi..." />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />

      {/* ─── Detail Modal ─── */}
      {viewSJ && <DetailModal sj={viewSJ} onClose={() => setViewSJ(null)} />}

      {/* ─── Form Modal ─── */}
      <Modal open={showForm} onClose={guard.handleClose}
        title={editingId ? "Edit Surat Jalan" : "Buat Surat Jalan"} size="xl">
        <form id="sj-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="No. Surat Jalan" placeholder="Auto-generate" 
              value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
              hint="Kosongkan untuk otomatis" />
            <DatePicker label="Tanggal" required value={form.date}
              onChange={val => setForm(f => ({ ...f, date: val }))} />
            <Select label="Jenis Surat Jalan" value={form.type}
              onChange={val => setForm(f => ({ ...f, type: val as SuratJalan["type"] }))}
              options={[
                { value: "pengiriman", label: "📦 Pengiriman" },
                { value: "pengembalian", label: "🔄 Pengembalian" },
              ]} />
          </div>

          {/* Customer & Project */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
            <p className="text-[12px] font-bold text-blue-700 uppercase tracking-wider">Data Pelanggan</p>
            <SearchSelect label="Pelanggan" required placeholder="Pilih pelanggan..."
              value={form.customerId}
              onChange={val => {
                const cust = customers.find(c => c.id === val);
                setForm(f => ({ 
                  ...f, 
                  customerId: val, 
                  customerName: cust?.name || "", 
                  projectId: "", 
                  projectName: "", 
                  deliveryAddress: cust?.address || "",
                  recipientName: cust?.name || "",
                  recipientPhone: cust?.phone || ""
                }));
              }}
              options={customerOptions} />
            {projectOptions.length > 0 && (
              <Select label="Proyek (Opsional)" placeholder="Pilih proyek..." value={form.projectId}
                onChange={val => {
                  const proj = selectedCustomer?.projects.find(p => p.id === val);
                  setForm(f => ({ ...f, projectId: val, projectName: proj?.name || "", deliveryAddress: proj?.location || f.deliveryAddress }));
                }}
                options={[{ value: "", label: "— Tanpa Proyek —" }, ...projectOptions]} />
            )}
            <TextInput label="Alamat Pengiriman" required placeholder="Alamat tujuan pengiriman"
              value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
          </div>

          {/* Recipient */}
          <div className="space-y-3 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Penerima</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Nama Penerima" required value={form.recipientName}
                onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
              <TextInput label="No. Telepon" placeholder="Opsional" value={form.recipientPhone}
                onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Daftar Barang</p>
              <Button type="button" variant="outline" size="sm" leftIcon={Plus} onClick={addLineItem}>Tambah Baris</Button>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-visible bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase w-[40%] rounded-tl-xl">Barang</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase w-20">Qty</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase w-20">Satuan</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Keterangan</th>
                    <th className="w-10 rounded-tr-xl" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <SearchSelect placeholder="Pilih barang..." value={item.inventoryId}
                          onChange={val => pickInventory(idx, val)} options={inventoryOptions} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min={1} value={item.qty}
                          onChange={e => updateLineItem(idx, { qty: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-semibold text-center outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[12px] text-gray-500 font-medium">{item.unit || "—"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.note || ""} placeholder="Opsional"
                          onChange={e => updateLineItem(idx, { note: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeLineItem(idx)}
                            className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Textarea label="Catatan" rows={2} placeholder="Catatan tambahan (opsional)"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={guard.handleClose}>Batal</Button>
          <Button type="submit" form="sj-form">{editingId ? "Simpan Perubahan" : "Buat Surat Jalan"}</Button>
        </div>
      </Modal>

      {/* Print Modal from table action */}
      {printSJ && <SuratJalanPrintModal sj={printSJ} onClose={() => setPrintSJ(null)} />}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)}
        onConfirm={() => { if (delId) deleteSuratJalan(delId); setDelId(null); }}
        title="Hapus Surat Jalan?"
        description="Surat jalan yang dihapus tidak dapat dikembalikan."
        confirmLabel="Hapus" variant="danger" />

      {/* ── Draft Guard Dialog ───────────────────────────────────────────── */}
      <DraftGuardDialog
        open={guard.showGuard}
        entityName="Surat Jalan"
        filledName={guard.filledName}
        onSaveDraft={guard.confirmSaveDraft}
        onDiscard={guard.confirmDiscard}
        onCancel={guard.cancelGuard}
        savingDraft={guard.savingDraft}
      />
    </div>
  );
}
