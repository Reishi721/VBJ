import { useState, useMemo, useCallback } from "react";
import { useDraftGuard } from "../hooks/useDraftGuard";
import {
  useDeliveryLists, useAddDeliveryList, useUpdateDeliveryList, useDeleteDeliveryList,
  useLinkShipment, useDeleteShipment
} from "../hooks/useDeliveryLists";
import { useCustomers } from "../hooks/useCustomers";
import { useInventoryItems } from "../hooks/useInventory";
import { useSuratJalan } from "../hooks/useSuratJalan";
import type { DeliveryList, DeliveryListItem, DeliveryListStatus } from "../types";
import {
  Plus, Pencil, Trash2, Eye, Link as LinkIcon, CheckCircle2,
  XCircle, Clock, ListTodo, MapPin
} from "lucide-react";
import {
  Button, SearchBar, TextInput, Textarea, SearchSelect, Select,
  Badge, Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable,
  DraftGuardDialog,
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function DLStatusBadge({ status }: { status: DeliveryListStatus }) {
  const map = {
    active:    { label: "Aktif",      variant: "blue"    as const, icon: Clock },
    completed: { label: "Selesai",    variant: "emerald" as const, icon: CheckCircle2 },
    cancelled: { label: "Dibatalkan", variant: "red"     as const, icon: XCircle },
  };
  const m = map[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

// ─── Empty Form State ────────────────────────────────────────────────────────
const emptyItem = (): Omit<DeliveryListItem, "id" | "deliveryListId"> => ({
  inventoryCode: "", inventoryName: "", unit: "pcs", qtyNeeded: 1, qtySent: 0
});

const emptyForm = {
  customerId: "", customerName: "", projectId: "", projectName: "",
  title: "", orderQty: 1, unitLabel: "set", status: "active" as DeliveryListStatus,
  notes: "", items: [emptyItem()],
};

// ─── Link Shipment Modal ─────────────────────────────────────────────────────
function LinkShipmentModal({
  dl, item, onClose
}: {
  dl: DeliveryList;
  item: DeliveryListItem;
  onClose: () => void;
}) {
  const { data: sjs = [] } = useSuratJalan();
  const { mutate: linkShipment, isPending } = useLinkShipment();
  const [selectedSJ, setSelectedSJ] = useState<string>("");
  const [qty, setQty] = useState<number>(item.qtyNeeded - item.qtySent);

  const sjOptions = useMemo(() =>
    sjs.filter(sj => sj.customerId === dl.customerId && sj.type === "pengiriman")
       .map(sj => ({
         value: sj.id, label: sj.number,
         description: `${format(parseISO(sj.date), "dd MMM yyyy")} · ${sj.status}`,
         meta: sj.projectName
       })),
    [sjs, dl.customerId]
  );

  const handleSubmit = () => {
    if (!selectedSJ || qty <= 0) return;
    const sj = sjs.find(s => s.id === selectedSJ);
    if (!sj) return;
    linkShipment({
      deliveryListId: dl.id,
      deliveryListItemId: item.id,
      suratJalanId: sj.id,
      suratJalanNumber: sj.number,
      qtyShipped: qty,
      shipDate: sj.date,
    }, { onSuccess: onClose });
  };

  return (
    <Modal open onClose={onClose} title="Tautkan ke Surat Jalan" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <p className="text-[12px] font-bold text-blue-700 mb-1">{item.inventoryName}</p>
          <p className="text-[11px] text-blue-600">Dibutuhkan: {item.qtyNeeded} · Sudah Dikirim: {item.qtySent} · <b>Sisa: {item.qtyNeeded - item.qtySent}</b></p>
        </div>

        <SearchSelect
          label="Pilih Surat Jalan" required
          value={selectedSJ} onChange={setSelectedSJ}
          options={sjOptions} placeholder="Cari surat jalan..."
          emptyMessage="Tidak ada surat jalan pengiriman untuk pelanggan ini."
        />

        <TextInput
          label="Jumlah Dikirim" type="number" required
          value={qty} onChange={e => setQty(Number(e.target.value))}
          min={1}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedSJ || qty <= 0}>
            {isPending ? "Menyimpan..." : "Tautkan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({ dl, onClose }: { dl: DeliveryList; onClose: () => void }) {
  const { mutate: deleteShipment } = useDeleteShipment();
  const [linkItem, setLinkItem] = useState<DeliveryListItem | null>(null);

  return (
    <>
    <Modal open onClose={onClose} title={`Detail Kebutuhan: ${dl.title}`} size="xl"
      description={`${dl.customerName} ${dl.projectName ? `· ${dl.projectName}` : ""}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pesanan</p>
            <p className="text-[14px] font-bold text-gray-900">{dl.orderQty} <span className="text-[12px] font-medium text-gray-500">{dl.unitLabel}</span></p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <DLStatusBadge status={dl.status} />
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dibuat</p>
            <p className="text-[13px] font-medium text-gray-900">{format(parseISO(dl.createdAt), "dd MMM yyyy")}</p>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Item Kebutuhan & Progress</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-[11px] font-semibold text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Barang</th>
                  <th className="px-4 py-2.5 w-24 text-center">Butuh</th>
                  <th className="px-4 py-2.5 w-24 text-center">Dikirim</th>
                  <th className="px-4 py-2.5 w-32">Progress</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dl.items.map(item => {
                  const percent = item.qtyNeeded > 0 ? Math.min(100, Math.round((item.qtySent / item.qtyNeeded) * 100)) : 0;
                  const isDone = item.qtySent >= item.qtyNeeded;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-900">{item.inventoryName}</p>
                        <p className="text-[11px] text-gray-400">{item.inventoryCode}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">{item.qtyNeeded}</td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold text-blue-600">{item.qtySent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isDone ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 w-7">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isDone && dl.status === "active" && (
                          <button onClick={() => setLinkItem(item)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Tautkan SJ">
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {dl.shipments.length > 0 && (
          <div>
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Riwayat Pengiriman</p>
            <div className="space-y-2">
              {dl.shipments.map(s => {
                const item = dl.items.find(i => i.id === s.deliveryListItemId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900">{s.suratJalanNumber}</p>
                      <p className="text-[11px] text-gray-500">{item?.inventoryName} · {s.qtyShipped} dikirim pada {format(parseISO(s.shipDate), "dd MMM yyyy")}</p>
                    </div>
                    {dl.status === "active" && (
                      <button
                        onClick={() => {
                          if(confirm("Hapus tautan ini?")) {
                            deleteShipment({ shipmentId: s.id, deliveryListItemId: s.deliveryListItemId, qtyShipped: s.qtyShipped });
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dl.notes && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Catatan</p>
            <p className="text-[13px] text-amber-900">{dl.notes}</p>
          </div>
        )}
      </div>
    </Modal>
    {linkItem && <LinkShipmentModal dl={dl} item={linkItem} onClose={() => setLinkItem(null)} />}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DeliveryListPage() {
  const { data: lists = [] } = useDeliveryLists();
  const { data: customers = [] } = useCustomers();
  const { data: invItems = [] } = useInventoryItems();

  const { mutate: addDL } = useAddDeliveryList();
  const { mutate: updateDL } = useUpdateDeliveryList();
  const { mutate: deleteDL } = useDeleteDeliveryList();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DeliveryListStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // ── Derived Options ──
  const selectedCustomer = customers.find(c => c.id === form.customerId);
  const projectOptions = useMemo(() =>
    selectedCustomer?.projects.map(p => ({ value: p.id, label: p.name, description: p.location })) ?? [],
    [selectedCustomer]);
  const customerOptions = useMemo(() =>
    customers.map(c => ({ value: c.id, label: c.name, description: c.company || c.phone })),
    [customers]);
  const inventoryOptions = useMemo(() =>
    invItems.map(i => ({ value: i.id, label: i.name, description: i.code, meta: i.unit })),
    [invItems]);

  // ── Derived Data ──
  const viewDL = lists.find(l => l.id === viewId) || null;
  const filtered = useMemo(() =>
    lists.filter(l => {
      const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
                          l.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    }), [lists, search, statusFilter]);

  const stats = useMemo(() => ({
    total: lists.length,
    active: lists.filter(l => l.status === "active").length,
    completed: lists.filter(l => l.status === "completed").length,
  }), [lists]);

  // ── Form Handlers ──
  const openCreate = useCallback(() => {
    setForm({ ...emptyForm, items: [emptyItem()] });
    setEditingId(null); setShowForm(true);
  }, []);

  const openEdit = useCallback((dl: DeliveryList) => {
    setForm({
      customerId: dl.customerId, customerName: dl.customerName,
      projectId: dl.projectId || "", projectName: dl.projectName || "",
      title: dl.title, orderQty: dl.orderQty, unitLabel: dl.unitLabel,
      status: dl.status, notes: dl.notes || "",
      items: dl.items.map(i => ({ ...i }))
    });
    setEditingId(dl.id); setShowForm(true);
  }, []);

  const closeFormAndReset = useCallback(() => {
    setShowForm(false); setEditingId(null); setForm({ ...emptyForm, items: [emptyItem()] });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.title) return;
    const validItems = form.items.filter(i => i.inventoryCode && i.qtyNeeded > 0);
    if (!validItems.length) return alert("Pilih minimal 1 barang.");

    if (editingId) {
      updateDL({ id: editingId, input: { ...form, items: validItems } });
    } else {
      addDL({ ...form, items: validItems });
    }
    closeFormAndReset();
  };

  const saveDraftCb = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      const validItems = form.items.filter(i => i.inventoryCode && i.qtyNeeded > 0);
      if (editingId) {
        updateDL({ id: editingId, input: { ...form, items: validItems } }, { onSuccess: () => { closeFormAndReset(); resolve(); }, onError: reject });
      } else {
        addDL({ ...form, items: validItems.length ? validItems : form.items }, { onSuccess: () => { closeFormAndReset(); resolve(); }, onError: reject });
      }
    });
  }, [form, editingId, addDL, updateDL, closeFormAndReset]);

  const guard = useDraftGuard({
    form: form as Record<string, unknown>,
    emptyForm: { ...emptyForm, items: [] } as Record<string, unknown>,
    onDiscard: closeFormAndReset,
    onSaveDraft: saveDraftCb,
    isDirty: f => !!(f["title"] as string)?.trim() || !!(f["customerId"] as string),
  });

  // ── Line Items ──
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, patch: Partial<DeliveryListItem>) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const pickInventory = (idx: number, id: string) => {
    const inv = invItems.find(i => i.id === id);
    if (inv) updateItem(idx, { inventoryId: id, inventoryCode: inv.code, inventoryName: inv.name, unit: inv.unit });
  };

  // ── Columns ──
  const columns = useMemo<ColumnDef<DeliveryList>[]>(() => [
    {
      header: "Kebutuhan",
      id: "title",
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-bold text-gray-900">{row.original.title}</p>
          <p className="text-[11px] text-gray-500 font-medium">{row.original.orderQty} {row.original.unitLabel} · {row.original.items.length} jenis item</p>
        </div>
      ),
    },
    {
      header: "Pelanggan",
      id: "customer",
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{row.original.customerName}</p>
          {row.original.projectName && <p className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{row.original.projectName}</p>}
        </div>
      ),
    },
    {
      header: "Progress",
      id: "progress",
      cell: ({ row }) => {
        const totalNeeded = row.original.items.reduce((s, i) => s + i.qtyNeeded, 0);
        const totalSent = row.original.items.reduce((s, i) => s + i.qtySent, 0);
        const percent = totalNeeded > 0 ? Math.min(100, Math.round((totalSent / totalNeeded) * 100)) : 0;
        return (
          <div className="w-32">
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-gray-500">{totalSent}/{totalNeeded}</span>
              <span className={percent === 100 ? "text-emerald-600" : "text-blue-600"}>{percent}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${percent === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <DLStatusBadge status={row.original.status} />,
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const dl = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setViewId(dl.id)} title="Detail & Tracking">
              <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            {dl.status === "active" && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(dl)} title="Edit">
                <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(dl.id)} title="Hapus">
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ], [openEdit]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daftar Kebutuhan"
        description="Kelola list barang yang dibutuhkan untuk pesanan/proyek pelanggan"
        action={<Button leftIcon={Plus} onClick={openCreate}>Buat List Baru</Button>}
      />

      <StatsRow stats={[
        { label: "Total List", value: stats.total, icon: ListTodo, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Sedang Berjalan", value: stats.active, icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        { label: "Selesai", value: stats.completed, icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      ]} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 w-fit">
          {(["all", "active", "completed", "cancelled"] as const).map(s => {
            const labels: Record<string, string> = { all: "Semua", active: "Aktif", completed: "Selesai", cancelled: "Batal" };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama atau pelanggan..." />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />

      {/* Form Modal */}
      <Modal open={showForm} onClose={guard.handleClose} title={editingId ? "Edit Daftar Kebutuhan" : "Buat Daftar Kebutuhan"} size="xl">
        <form id="dl-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 col-span-2 md:col-span-1 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <SearchSelect label="Pelanggan" required value={form.customerId}
                onChange={val => {
                  const c = customers.find(x => x.id === val);
                  setForm(f => ({ ...f, customerId: val, customerName: c?.name || "", projectId: "", projectName: "" }));
                }}
                options={customerOptions} placeholder="Pilih pelanggan..." />
              {projectOptions.length > 0 && (
                <Select label="Proyek (Opsional)" value={form.projectId}
                  onChange={val => {
                    const p = selectedCustomer?.projects.find(x => x.id === val);
                    setForm(f => ({ ...f, projectId: val, projectName: p?.name || "" }));
                  }}
                  options={[{ value: "", label: "— Tanpa Proyek —" }, ...projectOptions]} />
              )}
            </div>
            <div className="space-y-4 col-span-2 md:col-span-1 p-4 rounded-xl border border-gray-100">
              <TextInput label="Judul Kebutuhan" required placeholder="Contoh: Pesanan 50 Set Frame 170"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Jumlah Pesanan" type="number" required min={1}
                  value={form.orderQty} onChange={e => setForm(f => ({ ...f, orderQty: Number(e.target.value) }))} />
                <TextInput label="Satuan" required placeholder="set, paket, dll"
                  value={form.unitLabel} onChange={e => setForm(f => ({ ...f, unitLabel: e.target.value }))} />
              </div>
              <Select label="Status" value={form.status} onChange={val => setForm(f => ({ ...f, status: val as DeliveryListStatus }))}
                options={[ {value: "active", label: "Aktif"}, {value: "completed", label: "Selesai"}, {value: "cancelled", label: "Dibatalkan"} ]} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Item Kebutuhan</p>
              <Button type="button" variant="outline" size="sm" leftIcon={Plus} onClick={addItem}>Tambah Item</Button>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase w-1/2 first:rounded-tl-xl">Barang</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-400 uppercase w-16">Dibutuhkan</th>
                    {editingId && <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-400 uppercase w-16">Dikirim</th>}
                    <th className="w-10 last:rounded-tr-xl" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <SearchSelect placeholder="Pilih barang..." value={item.inventoryId || ""}
                          onChange={val => pickInventory(idx, val)} options={inventoryOptions} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min={1} value={item.qtyNeeded} onChange={e => updateItem(idx, { qtyNeeded: Number(e.target.value) })}
                          className="w-full px-1 py-1 rounded-md border border-gray-200 text-center text-[12px] font-bold outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20" />
                      </td>
                      {editingId && (
                        <td className="px-3 py-2 text-center text-[13px] font-bold text-blue-600 bg-blue-50/30">
                          {item.qtySent}
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
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

          <Textarea label="Catatan Tambahan (Opsional)" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={guard.handleClose}>Batal</Button>
          <Button type="submit" form="dl-form">{editingId ? "Simpan Perubahan" : "Buat List Kebutuhan"}</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      {viewDL && <DetailModal dl={viewDL} onClose={() => setViewId(null)} />}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => { if (delId) deleteDL(delId); setDelId(null); }}
        title="Hapus Daftar Kebutuhan?" description="Menghapus ini tidak akan menghapus Surat Jalan yang terkait." confirmLabel="Hapus" variant="danger" />

      <DraftGuardDialog open={guard.showGuard} entityName="Daftar Kebutuhan" filledName={guard.filledName}
        onSaveDraft={guard.confirmSaveDraft} onDiscard={guard.confirmDiscard} onCancel={guard.cancelGuard} savingDraft={guard.savingDraft} />
    </div>
  );
}
