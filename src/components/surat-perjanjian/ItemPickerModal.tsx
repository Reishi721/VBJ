/**
 * ItemPickerModal
 * Modal untuk pilih barang berdasarkan kategori dan edit daftar item Surat Perjanjian
 */
import { useState } from "react";
import { Plus, Trash2, Info, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { SuratPerjanjianItem } from "../../types";
import { useInventory } from "../../hooks/useInventory";
import { useRentalPriceList } from "../../hooks/useSuratPerjanjian";
import { formatCurrency } from "../../lib/utils";
import { toast } from "sonner";

interface Props {
  items: SuratPerjanjianItem[];
  transportFee: number;
  uangJaminan: number;
  onItemsChange: (items: SuratPerjanjianItem[]) => void;
  onFeeChange: (key: "transportFee" | "uangJaminan", value: number) => void;
  onClose: () => void;
}

export default function ItemPickerModal({
  items, transportFee, uangJaminan, onItemsChange, onFeeChange, onClose
}: Props) {
  const { data: inventoryData } = useInventory();
  const { data: priceList = [] } = useRentalPriceList();
  const allItems = inventoryData?.items ?? [];
  const categories = inventoryData?.categories ?? [];

  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const categoryOptions = [
    { value: "all", label: "Semua" },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

  const filteredInventoryItems = selectedCategoryId === "all"
    ? allItems
    : allItems.filter(i => i.categoryId === selectedCategoryId);

  // Check if ALL filtered items are already added
  const allFilteredAdded =
    filteredInventoryItems.length > 0 &&
    filteredInventoryItems.every(inv => items.some(i => i.inventoryId === inv.id));

  const addAll = () => {
    const toAdd = filteredInventoryItems.filter(
      inv => !items.some(i => i.inventoryId === inv.id)
    );
    if (toAdd.length === 0) return;
    const newItems: SuratPerjanjianItem[] = toAdd.map((invItem, offset) => {
      const price = priceList.find(p => p.inventoryId === invItem.id);
      return {
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
        itemOrder:     items.length + offset,
      };
    });
    onItemsChange([...items, ...newItems]);
    toast.success(`${toAdd.length} item ditambahkan`);
  };

  const removeAll = () => {
    const filteredIds = new Set(filteredInventoryItems.map(i => i.id));
    const remaining = items
      .filter(i => !filteredIds.has(i.inventoryId ?? ""))
      .map((it, idx) => ({ ...it, itemOrder: idx }));
    onItemsChange(remaining);
    toast.success(`${items.length - remaining.length} item dihapus`);
  };

  const addItem = (invItem: typeof allItems[0]) => {
    if (items.some(i => i.inventoryId === invItem.id)) {
      toast.info(`${invItem.name} sudah ada`);
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
      itemOrder:     items.length,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (idx: number, key: keyof SuratPerjanjianItem, value: string | number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    if (key === "qty" || key === "hargaSewa") {
      const qty       = key === "qty"       ? Number(value) : updated[idx].qty;
      const hargaSewa = key === "hargaSewa" ? Number(value) : updated[idx].hargaSewa;
      updated[idx].jumlah = qty * hargaSewa;
    }
    onItemsChange(updated);
  };

  const removeItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, itemOrder: i }));
    onItemsChange(updated);
  };

  const subtotal   = items.reduce((s, i) => s + i.jumlah, 0);
  const grandTotal = subtotal + transportFee + uangJaminan;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-stretch print:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full h-full">
        {/* ── Left: Inventory Picker ── */}
        <div className="w-[300px] shrink-0 bg-white border-r border-gray-200 flex flex-col z-10 shadow-2xl">
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">Pilih Barang</h3>
              <p className="text-[11px] text-gray-400">Berdasarkan kategori</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category filter */}
          <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5">
            {categoryOptions.map(opt => (
              <button
                key={opt.value}
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

          {/* Select All toggle */}
          {filteredInventoryItems.length > 0 && (
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {filteredInventoryItems.filter(inv => items.some(i => i.inventoryId === inv.id)).length}
                /{filteredInventoryItems.length} dipilih
              </span>
              <button
                onClick={allFilteredAdded ? removeAll : addAll}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  allFilteredAdded
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                }`}
              >
                {allFilteredAdded ? (
                  <>
                    <span className="text-base leading-none">✕</span> Hapus Semua
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none">✓</span> Pilih Semua
                  </>
                )}
              </button>
            </div>
          )}

          {/* Item list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-1">
            {filteredInventoryItems.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-8">Tidak ada item</p>
            ) : filteredInventoryItems.map(item => {
              const price   = priceList.find(p => p.inventoryId === item.id);
              const isAdded = items.some(i => i.inventoryId === item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 text-[12px] transition-colors ${
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
                    onClick={() => addItem(item)}
                    disabled={isAdded}
                    className={`ml-2 p-1 rounded-lg transition-colors shrink-0 ${
                      isAdded ? "text-emerald-600 cursor-default" : "text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {priceList.length === 0 && (
            <div className="m-3 flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                Belum ada harga. Isi di menu <strong>Daftar Harga Sewa</strong>.
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Item Table ── */}
        <div className="flex-1 bg-gray-50 flex flex-col z-10 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Daftar Item ({items.length})</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">Edit harga, qty, dan satuan</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
            >
              Selesai
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Plus className="w-10 h-10 mb-2 text-gray-200" />
                <p className="text-[13px] font-semibold">Belum ada item</p>
                <p className="text-[12px] mt-1">Pilih barang dari panel kiri</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Nama Barang</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-28">H. Ganti</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-28">H. Sewa</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-16">Sat</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-16">Qty</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-28">Jumlah</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800 leading-tight">{item.inventoryName}</p>
                          <p className="text-gray-400 text-[10px]">{item.categoryName}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0}
                            className="input-field py-1 px-2 w-full text-right text-[12px]"
                            value={item.hargaGanti || ""}
                            onChange={e => updateItem(idx, "hargaGanti", parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min={0}
                            className="input-field py-1 px-2 w-full text-right text-[12px]"
                            value={item.hargaSewa || ""}
                            onChange={e => updateItem(idx, "hargaSewa", parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="input-field py-1 px-1.5 w-full text-center text-[12px]"
                            value={item.satuan}
                            onChange={e => updateItem(idx, "satuan", e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min={0}
                            className="input-field py-1 px-1.5 w-full text-center text-[12px]"
                            value={item.qty || ""}
                            onChange={e => updateItem(idx, "qty", parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-700">
                          {item.jumlah > 0 ? formatCurrency(item.jumlah) : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer: subtotal & fees */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-end justify-between gap-6">
              <div className="flex gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Transport</label>
                  <input
                    type="number" min={0}
                    className="input-field py-1.5 px-3 w-36 text-right text-[13px]"
                    value={transportFee || ""}
                    placeholder="0"
                    onChange={e => onFeeChange("transportFee", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Uang Jaminan</label>
                  <input
                    type="number" min={0}
                    className="input-field py-1.5 px-3 w-36 text-right text-[13px]"
                    value={uangJaminan || ""}
                    placeholder="0"
                    onChange={e => onFeeChange("uangJaminan", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Grand Total</p>
                <p className="text-[20px] font-black text-blue-700">{formatCurrency(grandTotal)}</p>
                <p className="text-[10px] text-gray-400">Subtotal {formatCurrency(subtotal)} + Biaya {formatCurrency(transportFee + uangJaminan)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
