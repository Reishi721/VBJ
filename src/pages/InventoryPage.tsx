import { useState, useMemo, useCallback } from "react";
import { useInventoryItems, useInventoryCategories, useAddCategory, useUpdateCategory, useDeleteCategory, useAddItem, useUpdateItem, useDeleteItem, useAdjustStock } from "../hooks/useInventory";
import { useStockLogs } from "../hooks/useStockLogs";
import type { InventoryCategory, InventoryItem, StockLog } from "../types";
import {
  Plus, Pencil, Trash2, Package, Tag, AlertTriangle,
  Wrench, CheckCircle2, XCircle, Layers, ArrowUpCircle,
  ArrowDownCircle, RotateCcw, History, SlidersHorizontal,
} from "lucide-react";
import {
  Button, SearchBar, TextInput, Textarea, Select, Badge,
  Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable,
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";

// ─── Color options for categories ────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: "bg-blue-500",   label: "Biru",    dot: "bg-blue-500" },
  { value: "bg-violet-500", label: "Ungu",    dot: "bg-violet-500" },
  { value: "bg-emerald-500",label: "Hijau",   dot: "bg-emerald-500" },
  { value: "bg-amber-500",  label: "Kuning",  dot: "bg-amber-500" },
  { value: "bg-rose-500",   label: "Merah",   dot: "bg-rose-500" },
  { value: "bg-cyan-500",   label: "Cyan",    dot: "bg-cyan-500" },
  { value: "bg-orange-500", label: "Oranye",  dot: "bg-orange-500" },
  { value: "bg-pink-500",   label: "Pink",    dot: "bg-pink-500" },
];

const UNIT_OPTIONS = [
  { value: "pcs", label: "pcs" },
  { value: "unit", label: "unit" },
  { value: "set", label: "set" },
  { value: "lembar", label: "lembar" },
  { value: "batang", label: "batang" },
  { value: "meter", label: "meter" },
  { value: "roll", label: "roll" },
  { value: "kg", label: "kg" },
];

const CONDITION_OPTIONS = [
  { value: "good",        label: "Baik" },
  { value: "damaged",     label: "Rusak" },
  { value: "maintenance", label: "Dalam Perbaikan" },
];

// ─── Empty forms ──────────────────────────────────────────────────────────────
const emptyCategory = { name: "", description: "", color: "bg-blue-500" };
const emptyItem = {
  categoryId: "", name: "", code: "", unit: "pcs",
  stock: 0, minStock: 0, condition: "good" as const,
  location: "", description: "",
};

// ─── Condition Badge ──────────────────────────────────────────────────────────
function ConditionBadge({ condition }: { condition: InventoryItem["condition"] }) {
  const map = {
    good:        { label: "Baik",              variant: "emerald" as const, icon: CheckCircle2 },
    damaged:     { label: "Rusak",             variant: "red"     as const, icon: XCircle },
    maintenance: { label: "Perbaikan",         variant: "amber"   as const, icon: Wrench },
  };
  const m = map[condition];
  return (
    <Badge variant={m.variant} dot>
      {m.label}
    </Badge>
  );
}

// ─── Change Type Badge ────────────────────────────────────────────────────────
function ChangeTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: "gray"|"blue"|"emerald"|"amber"|"red"|"purple"; icon: any }> = {
    manual_in: { label: "Manual Masuk", variant: "emerald", icon: ArrowUpCircle },
    manual_out: { label: "Manual Keluar", variant: "red", icon: ArrowDownCircle },
    sj_in: { label: "SJ Kembali", variant: "blue", icon: ArrowUpCircle },
    sj_out: { label: "SJ Keluar", variant: "amber", icon: ArrowDownCircle },
    po_receive: { label: "PO Terima", variant: "purple", icon: ArrowUpCircle },
    adjustment: { label: "Penyesuaian", variant: "gray", icon: SlidersHorizontal },
  };
  const m = map[type] || { label: type, variant: "gray", icon: RotateCcw };
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className="flex items-center gap-1.5 px-2 py-1">
      <Icon className="w-3.5 h-3.5" />
      {m.label}
    </Badge>
  );
}

// ─── Stock Badge ──────────────────────────────────────────────────────────────
function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-red-500"><AlertTriangle className="w-3.5 h-3.5" /> Habis</span>;
  if (stock <= minStock) return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /> {stock}</span>;
  return <span className="text-[13px] font-semibold text-gray-900">{stock}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabType = "items" | "categories" | "logs";

export default function InventoryPage() {
  const { data: categories = [] } = useInventoryCategories();
  const { data: items = [] } = useInventoryItems();

  const { mutate: addCategory } = useAddCategory();
  const { mutate: updateCategory } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const { mutate: addItem } = useAddItem();
  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItem } = useDeleteItem();
  const { mutate: adjustStock } = useAdjustStock();
  const { data: stockLogs = [] } = useStockLogs();

  const [tab, setTab] = useState<TabType>("items");
  const [search, setSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");

  // ─ Adjust Stock state ─
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ itemId: "", qty: 0, type: "in" as "in" | "out" | "adjustment", reason: "" });

  const openAdjust = useCallback((item?: InventoryItem) => {
    setAdjustForm({ itemId: item?.id || "", qty: 0, type: "in", reason: "" });
    setShowAdjust(true);
  }, []);
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustStock(adjustForm);
    setShowAdjust(false);
  };

  // ─ Category CRUD state ─
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(emptyCategory);
  const [delCat, setDelCat] = useState<string | null>(null);

  // ─ Item CRUD state ─
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<{
    categoryId: string; name: string; code: string; unit: string;
    stock: number; minStock: number; condition: InventoryItem["condition"];
    location: string; description: string;
  }>(emptyItem);
  const [delItem, setDelItem] = useState<string | null>(null);

  // ─ Filtered data ─
  const filteredItems = useMemo(() =>
    items.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.categoryName.toLowerCase().includes(search.toLowerCase())
    ), [items, search]);

  const filteredCategories = useMemo(() =>
    categories.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [categories, search]);

  // ─ Stats ─
  const lowStockCount = items.filter(i => i.stock <= i.minStock && i.stock > 0).length;
  const damagedCount = items.filter(i => i.condition === "damaged").length;
  const outOfStockCount = items.filter(i => i.stock === 0).length;

  // ─ Category handlers ─
  const openCreateCat = useCallback(() => { setCatForm(emptyCategory); setEditingCatId(null); setShowCatForm(true); }, []);
  const openEditCat = useCallback((c: InventoryCategory) => {
    setCatForm({ name: c.name, description: c.description || "", color: c.color });
    setEditingCatId(c.id); setShowCatForm(true);
  }, []);
  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCatId) updateCategory({ id: editingCatId, input: catForm });
    else addCategory(catForm);
    setShowCatForm(false);
  };

  // ─ Item handlers ─
  const openCreateItem = useCallback(() => { setItemForm(emptyItem); setEditingItemId(null); setShowItemForm(true); }, []);
  const openEditItem = useCallback((i: InventoryItem) => {
    setItemForm({
      categoryId: i.categoryId, name: i.name, code: i.code, unit: i.unit,
      stock: i.stock, minStock: i.minStock, condition: i.condition,
      location: i.location || "", description: i.description || "",
    });
    setEditingItemId(i.id); setShowItemForm(true);
  }, []);
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItemId) updateItem({ id: editingItemId, input: itemForm });
    else addItem(itemForm);
    setShowItemForm(false);
  };

  // ─ Category options for item form ─
  const categoryOptions = useMemo(() =>
    categories.map(c => ({ value: c.id, label: c.name })), [categories]);

  // ─ Table Columns: Items ─
  const itemColumns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    {
      header: "#",
      id: "index",
      enableSorting: false,
      cell: ({ row }) => <span className="text-[12px] text-gray-400 font-medium">{row.index + 1}</span>,
    },
    {
      header: "Kode",
      accessorKey: "code",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
          {row.original.code}
        </span>
      ),
    },
    {
      header: "Nama Barang",
      accessorKey: "name",
      cell: ({ row }) => {
        const i = row.original;
        const cat = categories.find(c => c.id === i.categoryId);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-2 h-8 rounded-full ${cat?.color ?? "bg-gray-300"} shrink-0`} />
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{i.name}</p>
              <p className="text-[11px] text-gray-400">{i.categoryName}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Stok",
      accessorKey: "stock",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StockBadge stock={row.original.stock} minStock={row.original.minStock} />
          <span className="text-[11px] text-gray-400">{row.original.unit}</span>
        </div>
      ),
    },
    {
      header: "Kondisi",
      accessorKey: "condition",
      cell: ({ row }) => <ConditionBadge condition={row.original.condition} />,
    },
    {
      header: "Lokasi",
      accessorKey: "location",
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500">{row.original.location || "—"}</span>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const i = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => openAdjust(i)} title="Sesuaikan Stok">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => openEditItem(i)}>
              <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelItem(i.id)}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ], [categories, openEditItem]);

  // ─ Table Columns: Categories ─
  const catColumns = useMemo<ColumnDef<InventoryCategory>[]>(() => [
    {
      header: "Kategori",
      accessorKey: "name",
      cell: ({ row }) => {
        const c = row.original;
        const count = items.filter(i => i.categoryId === c.id).length;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${c.color} flex items-center justify-center shrink-0`}>
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{c.name}</p>
              <p className="text-[11px] text-gray-400">{count} barang</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Deskripsi",
      accessorKey: "description",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 line-clamp-1">{row.original.description || "—"}</span>
      ),
    },
    {
      header: "Dibuat",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-400">{row.original.createdAt}</span>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original;
        const hasItems = items.some(i => i.categoryId === c.id);
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => openEditCat(c)}>
              <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button
              variant="ghost" size="sm" className="px-2"
              onClick={() => setDelCat(c.id)}
              title={hasItems ? "Hapus barang di kategori ini terlebih dahulu" : "Hapus"}
            >
              <Trash2 className={`w-4 h-4 ${hasItems ? "text-gray-200" : "text-gray-400 hover:text-red-500"}`} />
            </Button>
          </div>
        );
      },
    },
  ], [items, openEditCat]);

  // ─ Table Columns: Stock Logs ─
  const logColumns = useMemo<ColumnDef<StockLog>[]>(() => [
    {
      header: "Tanggal",
      accessorKey: "createdAt",
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt);
        return (
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{d.toLocaleDateString("id-ID")}</p>
            <p className="text-[11px] text-gray-400">{d.toLocaleTimeString("id-ID")}</p>
          </div>
        );
      },
    },
    {
      header: "Barang",
      accessorKey: "inventoryName",
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{row.original.inventoryName}</p>
          <p className="font-mono text-[11px] text-blue-600">{row.original.inventoryCode}</p>
        </div>
      ),
    },
    {
      header: "Jenis",
      accessorKey: "changeType",
      cell: ({ row }) => <ChangeTypeBadge type={row.original.changeType} />,
    },
    {
      header: "Perubahan",
      accessorKey: "qtyChange",
      cell: ({ row }) => {
        const c = row.original.qtyChange;
        const color = c > 0 ? "text-emerald-600" : c < 0 ? "text-red-600" : "text-gray-500";
        return (
          <span className={`text-[13px] font-bold ${color}`}>
            {c > 0 ? "+" : ""}{c}
          </span>
        );
      },
    },
    {
      header: "Sisa Stok",
      accessorKey: "qtyAfter",
      cell: ({ row }) => <span className="text-[13px] font-semibold text-gray-900">{row.original.qtyAfter}</span>,
    },
    {
      header: "Keterangan",
      accessorKey: "notes",
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 line-clamp-2" title={row.original.notes || ""}>
          {row.original.notes || "—"}
        </span>
      ),
    },
  ], []);

  // ─ Filtered Logs ─
  const filteredLogs = useMemo(() => {
    let filtered = stockLogs;
    if (logFilter !== "all") {
      filtered = filtered.filter(l => l.changeType === logFilter);
    }
    if (search) {
      filtered = filtered.filter(l =>
        l.inventoryName.toLowerCase().includes(search.toLowerCase()) ||
        l.inventoryCode.toLowerCase().includes(search.toLowerCase()) ||
        (l.notes && l.notes.toLowerCase().includes(search.toLowerCase()))
      );
    }
    return filtered;
  }, [stockLogs, logFilter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inventaris"
        description="Kelola stok dan kategori barang scaffolding"
        action={
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={Tag} onClick={() => { setTab("categories"); openCreateCat(); }}>
              Tambah Kategori
            </Button>
            <Button leftIcon={Plus} onClick={() => { setTab("items"); openCreateItem(); }}>
              Tambah Barang
            </Button>
          </div>
        }
      />

      <StatsRow stats={[
        { label: "Total Barang", value: items.length, icon: Package, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Kategori", value: categories.length, icon: Layers, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
        { label: "Stok Menipis", value: lowStockCount, icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        { label: "Habis / Rusak", value: outOfStockCount + damagedCount, icon: XCircle, iconBg: "bg-red-50", iconColor: "text-red-500" },
      ]} />

      {/* Tab Bar + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("items")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              tab === "items" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="w-4 h-4" />
            Daftar Barang
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              tab === "categories" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Tag className="w-4 h-4" />
            Kategori
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              tab === "logs" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Stok
          </button>
        </div>
        <div className="flex gap-2 w-full sm:max-w-md">
          {tab === "logs" && (
            <Select
              value={logFilter}
              onChange={(val: string) => setLogFilter(val)}
              options={[
                { value: "all", label: "Semua Riwayat" },
                { value: "manual_in", label: "Manual Masuk" },
                { value: "manual_out", label: "Manual Keluar" },
                { value: "adjustment", label: "Penyesuaian" },
                { value: "sj_out", label: "SJ Keluar" },
                { value: "sj_in", label: "SJ Kembali" },
                { value: "po_receive", label: "PO Terima" },
              ]}
              className="w-40 shrink-0"
            />
          )}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={
              tab === "items" ? "Cari nama, kode, kategori..." : 
              tab === "logs" ? "Cari barang, catatan..." : 
              "Cari kategori..."
            }
          />
        </div>
      </div>

      {/* Tables */}
      {tab === "items" && (
        <DataTable columns={itemColumns} data={filteredItems} />
      )}
      {tab === "categories" && (
        <DataTable columns={catColumns} data={filteredCategories} />
      )}
      {tab === "logs" && (
        <DataTable columns={logColumns} data={filteredLogs} />
      )}

      {/* ─── Adjust Stock Modal ───────────────────────────────────────── */}
      <Modal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        title="Sesuaikan Stok"
        size="sm"
      >
        <form id="adjust-form" onSubmit={handleAdjustSubmit} className="space-y-4">
          {adjustForm.itemId && (() => {
            const item = items.find(i => i.id === adjustForm.itemId);
            return item ? (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{item.name}</p>
                  <p className="text-[11px] text-gray-500">Stok saat ini: <span className="font-bold text-gray-900">{item.stock}</span> {item.unit}</p>
                </div>
              </div>
            ) : null;
          })()}

          <Select
            label="Jenis Penyesuaian"
            required
            value={adjustForm.type}
            onChange={(val: any) => setAdjustForm({ ...adjustForm, type: val })}
            options={[
              { value: "in", label: "Barang Masuk (Manual)" },
              { value: "out", label: "Barang Keluar (Manual)" },
              { value: "adjustment", label: "Penyesuaian (Koreksi)" },
            ]}
          />
          <TextInput
            label="Jumlah"
            type="number"
            required
            min={1}
            value={String(adjustForm.qty)}
            onChange={(e) => setAdjustForm({ ...adjustForm, qty: Number(e.target.value) })}
            hint={adjustForm.type === "out" ? "Jumlah akan dikurangi dari stok saat ini" : "Jumlah akan ditambahkan ke stok saat ini"}
          />
          <Textarea
            label="Keterangan / Alasan"
            rows={2}
            required
            placeholder="Contoh: Barang rusak dibuang, selisih opname, dll."
            value={adjustForm.reason}
            onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
          />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowAdjust(false)}>Batal</Button>
          <Button type="submit" form="adjust-form">Simpan Penyesuaian</Button>
        </div>
      </Modal>

      {/* ─── Item Form Modal ───────────────────────────────────────────── */}
      <Modal
        open={showItemForm}
        onClose={() => setShowItemForm(false)}
        title={editingItemId ? "Edit Barang" : "Tambah Barang"}
        size="lg"
      >
        <form id="item-form" onSubmit={handleItemSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Nama Barang"
              required
              placeholder="Contoh: Frame Scaffolding 170cm"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
            <TextInput
              label="Kode / SKU"
              required
              placeholder="Contoh: SF-170"
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
            />
          </div>
          <Select
            label="Kategori"
            required
            value={itemForm.categoryId}
            onChange={(val) => setItemForm({ ...itemForm, categoryId: val })}
            options={categoryOptions}
            placeholder="Pilih kategori..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Satuan"
              value={itemForm.unit}
              onChange={(val) => setItemForm({ ...itemForm, unit: val })}
              options={UNIT_OPTIONS}
            />
            <TextInput
              label="Stok Saat Ini"
              type="number"
              required
              min={0}
              value={String(itemForm.stock)}
              onChange={(e) => setItemForm({ ...itemForm, stock: Number(e.target.value) })}
            />
            <TextInput
              label="Stok Minimum"
              type="number"
              required
              min={0}
              value={String(itemForm.minStock)}
              onChange={(e) => setItemForm({ ...itemForm, minStock: Number(e.target.value) })}
              hint="Alert bila stok ≤ nilai ini"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Kondisi"
              value={itemForm.condition}
              onChange={(val) => setItemForm({ ...itemForm, condition: val as InventoryItem["condition"] })}
              options={CONDITION_OPTIONS}
            />
            <TextInput
              label="Lokasi Penyimpanan"
              placeholder="Contoh: Gudang A - Rak 1"
              value={itemForm.location}
              onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
            />
          </div>
          <Textarea
            label="Keterangan"
            rows={2}
            placeholder="Catatan tambahan (opsional)"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowItemForm(false)}>Batal</Button>
          <Button type="submit" form="item-form">{editingItemId ? "Simpan Perubahan" : "Tambah Barang"}</Button>
        </div>
      </Modal>

      {/* ─── Category Form Modal ───────────────────────────────────────── */}
      <Modal
        open={showCatForm}
        onClose={() => setShowCatForm(false)}
        title={editingCatId ? "Edit Kategori" : "Tambah Kategori"}
        size="sm"
      >
        <form id="cat-form" onSubmit={handleCatSubmit} className="space-y-4">
          <TextInput
            label="Nama Kategori"
            required
            placeholder="Contoh: Scaffolding Frame"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
          />
          <Textarea
            label="Deskripsi"
            rows={2}
            placeholder="Deskripsi singkat (opsional)"
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
          />
          {/* Color picker */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-2">Warna Label</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, color: opt.value })}
                  className={`w-8 h-8 rounded-lg ${opt.dot} transition-all duration-200 ${
                    catForm.color === opt.value
                      ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                      : "hover:scale-105"
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowCatForm(false)}>Batal</Button>
          <Button type="submit" form="cat-form">{editingCatId ? "Simpan" : "Tambah Kategori"}</Button>
        </div>
      </Modal>

      {/* ─── Confirm Dialogs ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!delItem}
        onClose={() => setDelItem(null)}
        onConfirm={() => { if (delItem) deleteItem(delItem); setDelItem(null); }}
        title="Hapus Barang?"
        description="Data barang ini akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Hapus Barang"
        variant="danger"
      />
      <ConfirmDialog
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={() => {
          const hasItems = items.some(i => i.categoryId === delCat);
          if (!hasItems && delCat) { deleteCategory(delCat); }
          setDelCat(null);
        }}
        title="Hapus Kategori?"
        description={
          items.some(i => i.categoryId === delCat)
            ? "Kategori ini masih memiliki barang. Hapus semua barang terlebih dahulu sebelum menghapus kategori."
            : "Kategori ini akan dihapus permanen."
        }
        confirmLabel="Hapus Kategori"
        variant="danger"
      />
    </div>
  );
}
