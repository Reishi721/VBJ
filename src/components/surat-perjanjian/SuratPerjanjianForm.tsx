/**
 * SuratPerjanjianForm
 * Form untuk buat/edit Surat Perjanjian Sewa Menyewa
 * - Pihak I: pilih dari data pihak pertama
 * - Pihak II: pilih dari data pelanggan
 * - Items: pilih via ItemPickerModal (kategori + harga otomatis dari price list)
 *
 * Layout:
 *   Left  → Pihak I + Pihak II
 *   Right → Tanggal/Status + Item trigger + Info Sewa + Catatan
 */
import { useState, useEffect } from "react";
import { Package2 } from "lucide-react";
import { toast } from "sonner";
import type { SuratPerjanjian, Customer } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { Button, TextInput, Textarea, Select, SearchSelect, Modal } from "../ui";
import ItemPickerModal from "./ItemPickerModal";

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

export default function SuratPerjanjianForm({
  open, onClose, onSubmit, initial, customers, pihakPertamaList, isLoading,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm]           = useState<FormSP>(() => buildInitial(initial, today));
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => { setForm(buildInitial(initial, today)); }, [initial, today]);

  // ─── Pihak I ──────────────────────────────────────────────────
  const handleSelectPihak1 = (id: string) => {
    const p = pihakPertamaList.find(x => x.id === id);
    if (!p) return;
    setForm(f => ({ ...f, pihakPertamaId: p.id, pihakPertamaName: p.name, pihakPertamaAddress: p.address, pihakPertamaPhone: p.phone, pihakPertamaPosition: p.position }));
  };

  // ─── Pihak II ─────────────────────────────────────────────────
  const handleSelectCustomer = (id: string) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setForm(f => ({ ...f, customerId: c.id, customerName: c.name, customerAddress: c.address, customerPhone: c.phone, projectLocation: "" }));
  };

  const selectedCustomer  = customers.find(c => c.id === form.customerId);
  const customerProjects  = selectedCustomer?.projects ?? [];
  const projectOptions    = [
    { value: "", label: "— Isi Manual —" },
    ...customerProjects.map(p => ({ value: p.location ?? p.name, label: `${p.name}${p.location ? ` — ${p.location}` : ""}` })),
  ];

  // ─── Fee ──────────────────────────────────────────────────────
  const handleFeeChange = (key: "transportFee" | "uangJaminan", value: number) => {
    setForm(f => {
      const subtotal = f.items.reduce((s, i) => s + i.jumlah, 0);
      const updated  = { ...f, [key]: value };
      updated.total  = subtotal + updated.transportFee + updated.uangJaminan;
      return updated;
    });
  };

  // ─── Totals ───────────────────────────────────────────────────
  const itemsSubtotal = form.items.reduce((s, i) => s + i.jumlah, 0);
  const grandTotal    = itemsSubtotal + form.transportFee + form.uangJaminan;

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pihakPertamaName) { toast.error("Pihak Pertama wajib diisi"); return; }
    if (!form.customerName)     { toast.error("Pihak Kedua wajib diisi"); return; }
    onSubmit({ ...form, total: grandTotal });
  };

  // ─── Options ──────────────────────────────────────────────────
  const pihak1Options   = pihakPertamaList.map(p => ({ value: p.id, label: p.name, description: p.position }));
  const customerOptions = customers.filter(c => c.status === "active").map(c => ({ value: c.id, label: c.name, description: c.company }));

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit ${initial.number}` : "Buat Surat Perjanjian Baru"} size="xl">
      <form id="sp-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ══════════ LEFT: Pihak I + Pihak II ══════════ */}
          <div className="space-y-4">

            {/* Pihak I */}
            <div className="card p-4 space-y-3 bg-blue-50/30 border border-blue-100">
              <p className="text-[12px] font-bold text-blue-700 uppercase tracking-wide">Pihak Pertama (I)</p>
              <SearchSelect label="Pilih Pihak Pertama" placeholder="Pilih perwakilan perusahaan..."
                value={form.pihakPertamaId ?? ""} onChange={handleSelectPihak1} options={pihak1Options} />
              <TextInput label="Nama" required value={form.pihakPertamaName}
                onChange={e => setForm(f => ({ ...f, pihakPertamaName: e.target.value }))} />
              <Textarea label="Alamat" rows={2} value={form.pihakPertamaAddress}
                onChange={e => setForm(f => ({ ...f, pihakPertamaAddress: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Telepon" value={form.pihakPertamaPhone}
                  onChange={e => setForm(f => ({ ...f, pihakPertamaPhone: e.target.value }))} />
                <TextInput label="Jabatan" value={form.pihakPertamaPosition}
                  onChange={e => setForm(f => ({ ...f, pihakPertamaPosition: e.target.value }))} />
              </div>
            </div>

            {/* Pihak II */}
            <div className="card p-4 space-y-3 bg-purple-50/30 border border-purple-100">
              <p className="text-[12px] font-bold text-purple-700 uppercase tracking-wide">Pihak Kedua (II)</p>
              <SearchSelect label="Pilih Pelanggan" placeholder="Cari pelanggan..."
                value={form.customerId ?? ""} onChange={handleSelectCustomer} options={customerOptions} />
              <TextInput label="Nama" required value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
              <Textarea label="Alamat" rows={2} value={form.customerAddress}
                onChange={e => setForm(f => ({ ...f, customerAddress: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Telepon" value={form.customerPhone ?? ""}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
                <TextInput label="Fax" value={form.customerFax ?? ""}
                  onChange={e => setForm(f => ({ ...f, customerFax: e.target.value }))} />
              </div>
              <TextInput label="Diwakili Oleh" value={form.customerWakil ?? ""}
                onChange={e => setForm(f => ({ ...f, customerWakil: e.target.value }))} />
            </div>
          </div>

          {/* ══════════ RIGHT: Meta + Items + Info Sewa ══════════ */}
          <div className="space-y-4">

            {/* Tanggal + Status */}
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Tanggal" type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Select label="Status" value={form.status}
                onChange={val => setForm(f => ({ ...f, status: val as SuratPerjanjian["status"] }))}
                options={[
                  { value: "draft",     label: "Draft" },
                  { value: "active",    label: "Aktif" },
                  { value: "completed", label: "Selesai" },
                  { value: "cancelled", label: "Batal" },
                ]}
              />
            </div>

            {/* Item trigger button */}
            <button
              type="button"
              onClick={() => setShowItemModal(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                  <Package2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-blue-700">
                    {form.items.length === 0 ? "Tambah Item Barang" : `${form.items.length} Item Dipilih`}
                  </p>
                  <p className="text-[11px] text-blue-400 mt-0.5">
                    {form.items.length === 0
                      ? "Klik untuk pilih barang berdasarkan kategori"
                      : `Subtotal: ${formatCurrency(itemsSubtotal)}`}
                  </p>
                </div>
              </div>
              <span className="text-[12px] font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-xl group-hover:bg-blue-200 transition-colors shrink-0">
                Kelola →
              </span>
            </button>

            {/* Cost summary — only when items exist */}
            {form.items.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ringkasan Biaya</p>
                {[
                  { label: "Subtotal Sewa", value: itemsSubtotal },
                  { label: "Transport",     value: form.transportFee },
                  { label: "Uang Jaminan",  value: form.uangJaminan },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[13px]">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(r.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[15px] font-black border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}

            {/* Info Sewa */}
            <div className="card p-4 space-y-3 bg-amber-50/30 border border-amber-100">
              <p className="text-[12px] font-bold text-amber-700 uppercase tracking-wide">Info Sewa</p>

              {customerProjects.length > 0 && (
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Pilih Proyek</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    value={projectOptions.find(o => o.value === form.projectLocation)?.value ?? ""}
                    onChange={e => {
                      const sel = customerProjects.find(p => (p.location ?? p.name) === e.target.value);
                      setForm(f => ({
                        ...f,
                        projectLocation: e.target.value,
                        customerWakil: sel?.recipientName ?? f.customerWakil,
                        customerPhone:  sel?.recipientPhone ?? f.customerPhone,
                      }));
                    }}
                  >
                    {projectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Auto-isi lokasi &amp; penerima dari proyek</p>
                </div>
              )}

              <TextInput label="Tempat Proyek / Usaha" value={form.projectLocation ?? ""}
                onChange={e => setForm(f => ({ ...f, projectLocation: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Lama Sewa" placeholder="e.g. 1 bulan" value={form.lamaSewa ?? ""}
                  onChange={e => setForm(f => ({ ...f, lamaSewa: e.target.value }))} />
                <TextInput label="Pembayaran Selanjutnya" placeholder="e.g. Setelah 1 bulan"
                  value={form.pembayaranSelanjutnya ?? ""}
                  onChange={e => setForm(f => ({ ...f, pembayaranSelanjutnya: e.target.value }))} />
              </div>
              <Select label="Cara Pembayaran" value={form.caraPembayaran}
                onChange={val => setForm(f => ({ ...f, caraPembayaran: val }))}
                options={[
                  { value: "Cash",     label: "Cash" },
                  { value: "Transfer", label: "Transfer" },
                  { value: "Check",    label: "Cek / Giro" },
                ]}
              />
            </div>

            {/* Catatan */}
            <Textarea label="Catatan (opsional)" rows={2} value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
          <Button type="submit" form="sp-form" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : (initial ? "Simpan Perubahan" : "Buat Surat Perjanjian")}
          </Button>
        </div>
      </form>

      {showItemModal && (
        <ItemPickerModal
          items={form.items}
          transportFee={form.transportFee}
          uangJaminan={form.uangJaminan}
          onItemsChange={items => {
            const subtotal = items.reduce((s, i) => s + i.jumlah, 0);
            setForm(f => ({ ...f, items, total: subtotal + f.transportFee + f.uangJaminan }));
          }}
          onFeeChange={(key, value) => handleFeeChange(key, value)}
          onClose={() => setShowItemModal(false)}
        />
      )}
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
    date: today, pihakPertamaId: undefined, pihakPertamaName: "", pihakPertamaAddress: "",
    pihakPertamaPhone: "", pihakPertamaPosition: "Manager Marketing",
    customerId: undefined, customerName: "", customerAddress: "", customerPhone: "",
    customerFax: "", customerWakil: "", projectLocation: "", lamaSewa: "",
    pembayaranSelanjutnya: "", caraPembayaran: "Cash",
    transportFee: 0, uangJaminan: 0, total: 0, status: "draft", notes: "", items: [],
  };
}