/**
 * RentalPriceListPage
 * Halaman untuk mengatur harga ganti rugi, harga sewa, dan satuan per item barang
 */
import { useState, useMemo, useCallback } from "react";
import { useInventory } from "../hooks/useInventory";
import { useRentalPriceList, useUpsertRentalPrice } from "../hooks/useSuratPerjanjian";
import { formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import { Button, SectionHeader, SearchBar, usePagination, Pagination } from "../components/ui";
import {
  DollarSign, Save, Tag, Package, Filter,
  CheckCircle2, AlertCircle, ChevronDown,
} from "lucide-react";

interface PriceRow {
  inventoryId: string;
  inventoryName: string;
  inventoryCode: string;
  categoryId: string;
  categoryName: string;
  hargaGanti: number;
  hargaSewa: number;
  satuan: string;
  priceId?: string;
}

// Category color palette (cycles through)
const CAT_COLORS = [
  { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400" },
  { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-400" },
  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-400" },
  { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-400" },
  { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400" },
  { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-400" },
];

export default function RentalPriceListPage() {
  const { data: inventoryData } = useInventory();
  const { data: priceList = [] } = useRentalPriceList();
  const { mutate: upsertPrice, isPending } = useUpsertRentalPrice();

  const items = inventoryData?.items ?? [];
  const categories = inventoryData?.categories ?? [];

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [localPrices, setLocalPrices] = useState<Record<string, { hargaGanti: number; hargaSewa: number; satuan: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  // Build category color map
  const catColorMap = useMemo(() => {
    const map: Record<string, typeof CAT_COLORS[0]> = {};
    categories.forEach((c, i) => { map[c.id] = CAT_COLORS[i % CAT_COLORS.length]; });
    return map;
  }, [categories]);

  const rows = useMemo<PriceRow[]>(() => {
    return items.map(item => {
      const price = priceList.find(p => p.inventoryId === item.id);
      return {
        inventoryId:   item.id,
        inventoryName: item.name,
        inventoryCode: item.code,
        categoryId:    item.categoryId,
        categoryName:  item.categoryName,
        hargaGanti:    price?.hargaGanti ?? 0,
        hargaSewa:     price?.hargaSewa ?? 0,
        satuan:        price?.satuan ?? item.unit,
        priceId:       price?.id,
      };
    });
  }, [items, priceList]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch =
        r.inventoryName.toLowerCase().includes(search.toLowerCase()) ||
        r.inventoryCode.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || r.categoryId === filterCategory;
      return matchSearch && matchCat;
    });
  }, [rows, search, filterCategory]);

  const getLocal = useCallback((id: string, key: "hargaGanti" | "hargaSewa" | "satuan", fallback: number | string) => {
    return localPrices[id]?.[key] ?? fallback;
  }, [localPrices]);

  const setLocal = (id: string, key: "hargaGanti" | "hargaSewa" | "satuan", value: number | string) => {
    setLocalPrices(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const handleSave = (row: PriceRow) => {
    const local = localPrices[row.inventoryId];
    const hargaGanti = local?.hargaGanti !== undefined ? local.hargaGanti : row.hargaGanti;
    const hargaSewa  = local?.hargaSewa  !== undefined ? local.hargaSewa  : row.hargaSewa;
    const satuan     = local?.satuan     !== undefined ? local.satuan     : row.satuan;
    setSaving(row.inventoryId);
    upsertPrice(
      { id: row.priceId, inventoryId: row.inventoryId, inventoryName: row.inventoryName,
        inventoryCode: row.inventoryCode, categoryId: row.categoryId, categoryName: row.categoryName,
        hargaGanti, hargaSewa, satuan },
      {
        onSuccess: () => {
          toast.success(`Harga ${row.inventoryName} disimpan`);
          setSaving(null);
          setLocalPrices(prev => { const n = { ...prev }; delete n[row.inventoryId]; return n; });
        },
        onError: (err: any) => { toast.error(err.message); setSaving(null); },
      }
    );
  };

  const isDirty = (id: string) => localPrices[id] !== undefined;

  // ── Pagination ──────────────────────────────────────────────────────────────
  const { page, pageSize, pageCount, setPage, setPageSize, paginate } = usePagination(filtered.length, 25);
  const pagedRows = paginate(filtered);
  const filledCount  = priceList.length;
  const totalCount   = items.length;
  const pctFilled    = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  const selectedCatLabel = filterCategory === "all"
    ? "Semua Kategori"
    : categories.find(c => c.id === filterCategory)?.name ?? "Kategori";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daftar Harga Sewa"
        description="Atur harga ganti rugi, harga sewa, dan satuan per item barang"
      />

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Item */}
        <div className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Item</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>

        {/* Sudah Ada Harga */}
        <div className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sudah Ada Harga</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">{filledCount}</p>
                <p className="text-[12px] text-emerald-600 font-semibold mb-0.5">{pctFilled}%</p>
              </div>
              <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${pctFilled}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Belum Ada Harga */}
        <div className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Belum Ada Harga</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount - filledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 max-w-sm">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama barang atau kode..." />
        </div>

        {/* Custom category dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCatDropdown(v => !v)}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-[13px] font-semibold text-gray-700 shadow-sm transition-all min-w-[180px]"
          >
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-left truncate">{selectedCatLabel}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showCatDropdown ? "rotate-180" : ""}`} />
          </button>
          {showCatDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-xl z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setFilterCategory("all"); setShowCatDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-gray-50 transition-colors ${filterCategory === "all" ? "text-blue-600 bg-blue-50/50" : "text-gray-700"}`}
                >
                  Semua Kategori
                </button>
                {categories.map(c => {
                  const col = catColorMap[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setFilterCategory(c.id); setShowCatDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 ${filterCategory === c.id ? "text-blue-600 bg-blue-50/50" : "text-gray-700"}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col?.dot ?? "bg-gray-400"}`} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Dirty count badge */}
        {Object.keys(localPrices).length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] font-semibold text-amber-700">
              {Object.keys(localPrices).length} perubahan belum disimpan
            </span>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nama Barang</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Kategori</th>
                <th className="text-center px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-24">Satuan</th>
                <th className="text-right px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Harga Ganti Rugi</th>
                <th className="text-right px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Harga Sewa / Bln</th>
                <th className="text-center px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-[13px] font-semibold text-gray-400">Tidak ada barang ditemukan</p>
                    <p className="text-[12px] text-gray-300 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : pagedRows.map((row, i) => {
                const currentGanti  = getLocal(row.inventoryId, "hargaGanti", row.hargaGanti) as number;
                const currentSewa   = getLocal(row.inventoryId, "hargaSewa",  row.hargaSewa)  as number;
                const currentSatuan = getLocal(row.inventoryId, "satuan",     row.satuan)     as string;
                const dirty   = isDirty(row.inventoryId);
                const isSaving = saving === row.inventoryId;
                const col     = catColorMap[row.categoryId];
                const hasPrice = row.hargaGanti > 0 || row.hargaSewa > 0;

                return (
                  <tr
                    key={row.inventoryId}
                    className={`group transition-colors ${
                      dirty ? "bg-amber-50/30" : "hover:bg-gray-50/60"
                    }`}
                  >
                    {/* # */}
                    <td className="px-5 py-3 text-[12px] text-gray-400 font-medium">{page * pageSize + i + 1}</td>

                    {/* Nama Barang */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${col?.bg ?? "bg-gray-50"} flex items-center justify-center shrink-0`}>
                          <Package className={`w-4 h-4 ${col?.text ?? "text-gray-500"}`} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">{row.inventoryName}</p>
                          <p className="text-[11px] font-mono text-gray-400">{row.inventoryCode}</p>
                        </div>
                        {hasPrice && !dirty && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${col?.bg ?? "bg-gray-50"} ${col?.text ?? "text-gray-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${col?.dot ?? "bg-gray-400"}`} />
                        {row.categoryName}
                      </span>
                    </td>

                    {/* Satuan */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <input
                          className="w-20 text-center text-[13px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                          value={currentSatuan}
                          onChange={e => setLocal(row.inventoryId, "satuan", e.target.value)}
                          placeholder="pcs"
                        />
                      </div>
                    </td>

                    {/* Harga Ganti Rugi */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1">
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">Rp</span>
                        <input
                          type="number"
                          min={0}
                          className="w-36 text-right text-[13px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                          value={currentGanti === 0 ? "" : currentGanti}
                          onChange={e => setLocal(row.inventoryId, "hargaGanti", parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      {row.hargaGanti > 0 && !dirty && (
                        <p className="text-[10px] text-emerald-500 text-right mt-0.5 font-medium">{formatCurrency(row.hargaGanti)}</p>
                      )}
                    </td>

                    {/* Harga Sewa */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1">
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">Rp</span>
                        <input
                          type="number"
                          min={0}
                          className="w-36 text-right text-[13px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                          value={currentSewa === 0 ? "" : currentSewa}
                          onChange={e => setLocal(row.inventoryId, "hargaSewa", parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      {row.hargaSewa > 0 && !dirty && (
                        <p className="text-[10px] text-emerald-500 text-right mt-0.5 font-medium">{formatCurrency(row.hargaSewa)}/bln</p>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3 text-center">
                      {dirty ? (
                        <button
                          onClick={() => handleSave(row)}
                          disabled={isSaving || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[12px] font-semibold transition-all shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          {isSaving ? "Simpan..." : "Simpan"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-300 font-medium">
                          {hasPrice ? (
                            <span className="flex items-center justify-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Tersimpan
                            </span>
                          ) : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <Pagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ── Category Summary ─────────────────────────────────────── */}
      {Object.keys(
        (() => {
          const map: Record<string, number> = {};
          priceList.forEach(p => { const cat = p.categoryName ?? "Tanpa Kategori"; map[cat] = (map[cat] ?? 0) + 1; });
          return map;
        })()
      ).length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-gray-400" />
            <h3 className="text-[13px] font-bold text-gray-700">Ringkasan per Kategori</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter(c => priceList.some(p => p.categoryId === c.id))
              .map(c => {
                const count = priceList.filter(p => p.categoryId === c.id).length;
                const col = catColorMap[c.id];
                return (
                  <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${col?.bg ?? "bg-gray-50"} border-transparent`}>
                    <span className={`w-2 h-2 rounded-full ${col?.dot ?? "bg-gray-400"}`} />
                    <span className={`text-[12px] font-semibold ${col?.text ?? "text-gray-700"}`}>{c.name}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{count} item</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
