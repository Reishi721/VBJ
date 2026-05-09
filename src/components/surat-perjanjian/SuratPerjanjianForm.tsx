/**
 * SuratPerjanjianForm
 * Form untuk buat/edit Surat Perjanjian Sewa Menyewa
 * - Pihak I: pilih dari data pihak pertama
 * - Pihak II: pilih dari data pelanggan
 * - Items: pilih berdasarkan kategori, harga otomatis dari price list
 */
import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "sonner";
import type { SuratPerjanjian, SuratPerjanjianItem, Customer } from "../../types";
import { useInventory } from "../../hooks/useInventory";
import { useRentalPriceList } from "../../hooks/useSuratPerjanjian";
import { formatCurrency } from "../../lib/utils";
import { Button, TextInput, Textarea, Select, SearchSelect, Modal } from "../ui";

type FormSP = Omit<SuratPerjanjian, "id" | "createdAt" | "number">;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormSP) => void;
  initial?: SuratPerjanjian | null;
  customers: Customer[];
  pihakPertamaList: Array<{
    id: string; name: string; address: string; phone: string; position: string;
  }>;
  isLoading?: boolean;
}

const emptyItem = (): SuratPerjanjianItem => ({
  inventoryId:   undefined,
  inventoryName: "",
  inventoryCode: "",
  categoryId:    undefined,
  categoryName:  undefined,
  hargaGanti:    0,
  hargaSewa:     0,
  satuan:        "pc",
  qty:           0,
  jumlah:        0,
  itemOrder:     0,
});

export default function SuratPerjanjianForm({
  open, onClose, onSubmit, initial, customers, pihakPertamaList, isLoading
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const { data: inventoryData } = useInventory();
  const { data: priceList = [] } = useRentalPriceList();
  const allItems = inventoryData?.items ?? [];
  const categories = inventoryData?.categories ?? [];

  // ─── Form State ───────────────────────────────────────────────
  const [form, setForm] = useState<FormSP>(() => buildInitial(initial, today));
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [showItemPanel, setShowItemPanel] = useState(true);

  useEffect(() => {
    setForm(buildInitial(initial, today));
  }, [initial, today]);

  // ─── Pihak I ──────────────────────────────────────────────────
  const handleSelectPihak1 = (id: string) => {
    const p = pihakPertamaList.find(x => x.id === id);
    if (!p) return;
    setForm(f => ({
      ...f,
      pihakPertamaId:       p.id,
      pihakPertamaName:     p.name,
      pihakPertamaAddress:  p.address,
      pihakPertamaPhone:    p.phone,
      pihakPertamaPosition: p.position,
    }));
  };

  // ─── Pihak II ─────────────────────────────────────────────────
  const handleSelectCustomer = (id: string) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setForm(f => ({
      ...f,
      customerId:      c.id,
      customerName:    c.name,
      customerAddress: c.address,
      customerPhone:   c.phone,
      projectLocation: "",   // reset proyek saat ganti customer
    }));
  };

  // Proyek milik customer yang dipilih
  const selectedCustomer = customers.find(c => c.id === form.customerId);
  const customerProjects = selectedCustomer?.projects ?? [];
  const projectOptions = [
    { value: "", label: "— Isi Manual —" },
    ...customerProjects.map(p => ({ value: p.location ?? p.name, label: `${p.name}${p.location ? ` — ${p.location}` : ""}` }))
  ];

  // ─── Items ────────────────────────────────────────────────────
  // Filter inventory items by category
  const filteredInventoryItems = useMemo(() => {
    if (selectedCategoryId === "all") return allItems;
    return allItems.filter(i => i.categoryId === selectedCategoryId);
  }, [allItems, selectedCategoryId]);

  const addItem = (invItem: typeof allItems[0]) => {
    // Check if already added
    if (form.items.some(i => i.inventoryId === invItem.id)) {
      toast.info(`${invItem.name} sudah ada dalam daftar`);
      return;
    }
    const price = priceList.find(p => p.inventoryId === invItem.id);
    const newItem: SuratPerjanjianItem = {
      inventoryId:   invItem.id,
      inventoryName: invItem.name,
      inventoryCode: invItem.code,
      categoryId:    invItem.categoryId,
      categoryName:  invItem.categoryName,
      hargaGanti:    price?.hargaGanti ?? 0,
      hargaSewa:     price?.hargaSewa ?? 0,
      satuan:        price?.satuan ?? invItem.unit,
      qty:           0,
      jumlah:        0,
      itemOrder:     form.items.length,
    };
    setForm(f => ({ ...f, items: [...f.items, newItem] }));
  };

  const updateItem = (idx: number, key: keyof SuratPerjanjianItem, value: string | number) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      // Recalculate jumlah
      if (key === "qty" || key === "hargaSewa") {
        const qty       = key === "qty" ? Number(value) : items[idx].qty;
        const hargaSewa = key === "hargaSewa" ? Number(value) : items[idx].hargaSewa;
        items[idx].jumlah = qty * hargaSewa;
      }
      // Recalculate total
      const subtotal = items.reduce((s, i) => s + i.jumlah, 0);
      const total    = subtotal + (f.transportFee ?? 0) + (f.uangJaminan ?? 0);
      return { ...f, items, total };
    });
  };

  const removeItem = (idx: number) => {
    setForm(f => {
      const items = f.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, itemOrder: i }));
      const subtotal = items.reduce((s, i) => s + i.jumlah, 0);
      const total    = subtotal + (f.transportFee ?? 0) + (f.uangJaminan ?? 0);
      return { ...f, items, total };
    });
  };

  // Recalculate total when transport/jaminan changes
  const handleFeeChange = (key: "transportFee" | "uangJaminan", value: number) => {
    setForm(f => {
      const subtotal = f.items.reduce((s, i) => s + i.jumlah, 0);
      const newForm  = { ...f, [key]: value };
      newForm.total  = subtotal + newForm.transportFee + newForm.uangJaminan;
      return newForm;
    });
  };

  const grandTotal  = form.items.reduce((s, i) => s + i.jumlah, 0) + form.transportFee + form.uangJaminan;
  const itemsSubtotal = form.items.reduce((s, i) => s + i.jumlah, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pihakPertamaName) { toast.error("Pihak Pertama wajib diisi"); return; }
    if (!form.customerName)     { toast.error("Pihak Kedua wajib diisi"); return; }
    onSubmit({ ...form, total: grandTotal });
  };

  // Build options
  const pihak1Options = pihakPertamaList.map(p => ({
    value: p.id, label: p.name, description: p.position
  }));
  const customerOptions = customers.filter(c => c.status === "active").map(c => ({
    value: c.id, label: c.name, description: c.company
  }));
  const categoryOptions = [
    { value: "all", label: "Semua Kategori" },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.number}` : "Buat Surat Perjanjian Baru"}
      size="xl"
    >
      <form id="sp-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left Column: Header Info ── */}
          <div className="space-y-4">
            {/* Tanggal + Status */}
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Tanggal"
                type="date"
                required
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={val => setForm(f => ({ ...f, status: val as SuratPerjanjian["status"] }))}
                options={[
                  { value: "draft",     label: "Draft" },
                  { value: "active",    label: "Aktif" },
                  { value: "completed", label: "Selesai" },
                  { value: "cancelled", label: "Batal" },
                ]}
              />
            </div>

            {/* ── Pihak I ── */}
            <div className="card p-4 space-y-3 bg-blue-50/30 border border-blue-100">
              <p className="text-[12px] font-bold text-blue-700 uppercase tracking-wide">Pihak Pertama (I)</p>
              <SearchSelect
                label="Pilih Pihak Pertama"
                placeholder="Pilih perwakilan perusahaan..."
                value={form.pihakPertamaId ?? ""}
                onChange={handleSelectPihak1}
                options={pihak1Options}
              />
              <TextInput
                label="Nama"
                required
                value={form.pihakPertamaName}
                onChange={e => setForm(f => ({ ...f, pihakPertamaName: e.target.value }))}
              />
              <Textarea
                label="Alamat"
                rows={2}
                value={form.pihakPertamaAddress}
                onChange={e => setForm(f => ({ ...f, pihakPertamaAddress: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Telepon"
                  value={form.pihakPertamaPhone}
                  onChange={e => setForm(f => ({ ...f, pihakPertamaPhone: e.target.value }))}
                />
                <TextInput
                  label="Jabatan"
                  value={form.pihakPertamaPosition}
                  onChange={e => setForm(f => ({ ...f, pihakPertamaPosition: e.target.value }))}
                />
              </div>
            </div>

            {/* ── Pihak II ── */}
            <div className="card p-4 space-y-3 bg-purple-50/30 border border-purple-100">
              <p className="text-[12px] font-bold text-purple-700 uppercase tracking-wide">Pihak Kedua (II)</p>
              <SearchSelect
                label="Pilih Pelanggan"
                placeholder="Cari pelanggan..."
                value={form.customerId ?? ""}
                onChange={handleSelectCustomer}
                options={customerOptions}
              />
              <TextInput
                label="Nama"
                required
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
              />
              <Textarea
                label="Alamat"
                rows={2}
                value={form.customerAddress}
                onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Telepon"
                  value={form.customerPhone ?? ""}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                />
                <TextInput
                  label="Fax"
                  value={form.customerFax ?? ""}
                  onChange={e => setForm(f => ({ ...f, customerFax: e.target.value }))}
                />
              </div>
              <TextInput
                label="Diwakili Oleh"
                value={form.customerWakil ?? ""}
                onChange={e => setForm(f => ({ ...f, customerWakil: e.target.value }))}
              />
            </div>

            {/* ── Info Sewa ── */}
            <div className="card p-4 space-y-3 bg-gray-50/50 border border-gray-100">
              <p className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">Info Sewa</p>

              {/* Pilih proyek dari data customer */}
              {customerProjects.length > 0 && (
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Pilih Proyek</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    value={projectOptions.find(o => o.value === form.projectLocation)?.value ?? ""}
                    onChange={e => {
                      const selected = customerProjects.find(p => (p.location ?? p.name) === e.target.value);
                      setForm(f => ({
                        ...f,
                        projectLocation: e.target.value,
                        customerWakil: selected?.recipientName ?? f.customerWakil,
                        customerPhone: selected?.recipientPhone ?? f.customerPhone,
                      }));
                    }}
                  >
                    {projectOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Pilih proyek untuk auto-isi lokasi & penerima</p>
                </div>
              )}

              <TextInput
                label="Tempat Proyek / Usaha"
                value={form.projectLocation ?? ""}
                onChange={e => setForm(f => ({ ...f, projectLocation: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Lama Sewa"
                  placeholder="e.g. 1 bulan"
                  value={form.lamaSewa ?? ""}
                  onChange={e => setForm(f => ({ ...f, lamaSewa: e.target.value }))}
                />
                <TextInput
                  label="Pembayaran Selanjutnya"
                  placeholder="e.g. Setelah 1 bulan"
                  value={form.pembayaranSelanjutnya ?? ""}
                  onChange={e => setForm(f => ({ ...f, pembayaranSelanjutnya: e.target.value }))}
                />
              </div>
              <Select
                label="Cara Pembayaran"
                value={form.caraPembayaran}
                onChange={val => setForm(f => ({ ...f, caraPembayaran: val }))}
                options={[
                  { value: "Cash",     label: "Cash" },
                  { value: "Transfer", label: "Transfer" },
                  { value: "Check",    label: "Cek / Giro" },
                ]}
              />
            </div>
          </div>

          {/* ── Right Column: Item Selection & Table ── */}
          <div className="space-y-4">
            {/* Category + Item picker */}
            <div
              className="card border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setShowItemPanel(!showItemPanel)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">
                  Pilih Barang Berdasarkan Kategori
                </span>
                {showItemPanel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showItemPanel && (
                <div className="p-3 space-y-3">
                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedCategoryId(opt.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          selectedCategoryId === opt.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Item list */}
                  <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                    {filteredInventoryItems.length === 0 ? (
                      <p className="text-[12px] text-gray-400 text-center py-6">
                        Tidak ada item untuk kategori ini
                      </p>
                    ) : filteredInventoryItems.map(item => {
                      const price    = priceList.find(p => p.inventoryId === item.id);
                      const isAdded  = form.items.some(i => i.inventoryId === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 text-[12px] transition-colors ${
                            isAdded ? "bg-emerald-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isAdded ? "text-emerald-700" : "text-gray-800"}`}>
                              {item.name}
                            </p>
                            <p className="text-gray-400 text-[10px]">
                              {price ? `Sewa: ${formatCurrency(price.hargaSewa)}/${price.satuan}/bln` : "Belum ada harga"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addItem(item)}
                            disabled={isAdded}
                            className={`ml-2 p-1 rounded-lg transition-colors shrink-0 ${
                              isAdded
                                ? "text-emerald-600 cursor-default"
                                : "text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {priceList.length === 0 && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">
                        Belum ada harga di daftar harga. Silakan isi terlebih dahulu di menu <strong>Daftar Harga Sewa</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">
                  Daftar Item ({form.items.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                {form.items.length === 0 ? (
                  <p className="text-[12px] text-gray-400 text-center py-8">
                    Belum ada item. Pilih barang dari panel di atas.
                  </p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Nama Barang</th>
                        <th className="text-right px-2 py-2 font-semibold text-gray-500">H. Ganti</th>
                        <th className="text-right px-2 py-2 font-semibold text-gray-500">H. Sewa</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-500">Sat</th>
                        <th className="text-center px-2 py-2 font-semibold text-gray-500">Qty</th>
                        <th className="text-right px-2 py-2 font-semibold text-gray-500">Jumlah</th>
                        <th className="px-1 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1.5">
                            <p className="font-medium text-gray-800 leading-tight">{item.inventoryName}</p>
                            <p className="text-gray-400 text-[10px]">{item.categoryName}</p>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" min={0}
                              className="input-field py-1 px-1.5 w-24 text-right text-[11px]"
                              value={item.hargaGanti || ""}
                              onChange={e => updateItem(idx, "hargaGanti", parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" min={0}
                              className="input-field py-1 px-1.5 w-24 text-right text-[11px]"
                              value={item.hargaSewa || ""}
                              onChange={e => updateItem(idx, "hargaSewa", parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className="input-field py-1 px-1.5 w-14 text-center text-[11px]"
                              value={item.satuan}
                              onChange={e => updateItem(idx, "satuan", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" min={0}
                              className="input-field py-1 px-1.5 w-16 text-center text-[11px]"
                              value={item.qty || ""}
                              onChange={e => updateItem(idx, "qty", parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-gray-700">
                            {item.jumlah > 0 ? formatCurrency(item.jumlah) : "-"}
                          </td>
                          <td className="px-1 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Subtotals */}
              <div className="border-t border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500">Subtotal Sewa</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(itemsSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500">Transport</span>
                  <input
                    type="number" min={0}
                    className="input-field py-1 px-2 w-36 text-right text-[11px]"
                    value={form.transportFee || ""}
                    placeholder="0"
                    onChange={e => handleFeeChange("transportFee", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500">Uang Jaminan</span>
                  <input
                    type="number" min={0}
                    className="input-field py-1 px-2 w-36 text-right text-[11px]"
                    value={form.uangJaminan || ""}
                    placeholder="0"
                    onChange={e => handleFeeChange("uangJaminan", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center justify-between text-[13px] border-t pt-2 border-gray-200">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-blue-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <Textarea
              label="Catatan (opsional)"
              rows={2}
              value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" form="sp-form" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : (initial ? "Simpan Perubahan" : "Buat Surat Perjanjian")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Builder ──────────────────────────────────────────────────────────────────
function buildInitial(initial: SuratPerjanjian | null | undefined, today: string): FormSP {
  if (initial) {
    const { id: _id, createdAt: _c, number: _n, ...rest } = initial;
    return rest;
  }
  return {
    date:                     today,
    pihakPertamaId:           undefined,
    pihakPertamaName:         "",
    pihakPertamaAddress:      "",
    pihakPertamaPhone:        "",
    pihakPertamaPosition:     "Manager Marketing",
    customerId:               undefined,
    customerName:             "",
    customerAddress:          "",
    customerPhone:            "",
    customerFax:              "",
    customerWakil:            "",
    projectLocation:          "",
    lamaSewa:                 "",
    pembayaranSelanjutnya:    "",
    caraPembayaran:           "Cash",
    transportFee:             0,
    uangJaminan:              0,
    total:                    0,
    status:                   "draft",
    notes:                    "",
    items:                    [],
  };
}
