/**
 * SuratPerjanjianPage
 * Halaman utama daftar Surat Perjanjian Sewa Menyewa
 */
import { useState, useMemo, useCallback } from "react";
import { Plus, Printer, Pencil, Trash2, FileText, Users, DollarSign, Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { SuratPerjanjian } from "../types";
import {
  useSuratPerjanjian,
  useAddSuratPerjanjian,
  useUpdateSuratPerjanjian,
  useDeleteSuratPerjanjian,
  usePihakPertama,
} from "../hooks/useSuratPerjanjian";
import { useCustomers } from "../hooks/useCustomers";
import { formatDate, formatCurrency } from "../lib/utils";
import {
  Button,
  SearchBar,
  Badge,
  SectionHeader,
  StatsRow,
  ConfirmDialog,
  DataTable,
  Select,
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";
import SuratPerjanjianForm from "../components/surat-perjanjian/SuratPerjanjianForm";
import SuratPerjanjianPrintModal from "../components/surat-perjanjian/SuratPerjanjianPrintModal";
import PihakPertamaModal from "../components/surat-perjanjian/PihakPertamaModal";

const STATUS_LABEL: Record<string, string> = {
  draft:     "Draft",
  active:    "Aktif",
  completed: "Selesai",
  cancelled: "Batal",
};

const STATUS_BADGE: Record<string, "gray" | "emerald" | "blue" | "red"> = {
  draft:     "gray",
  active:    "emerald",
  completed: "blue",
  cancelled: "red",
};

export default function SuratPerjanjianPage() {
  const { data: spList = [],  isLoading } = useSuratPerjanjian();
  const { data: customers = []          } = useCustomers();
  const { data: pihakList  = []         } = usePihakPertama();
  const { mutate: addSP,    isPending: adding   } = useAddSuratPerjanjian();
  const { mutate: updateSP, isPending: updating } = useUpdateSuratPerjanjian();
  const { mutate: deleteSP                       } = useDeleteSuratPerjanjian();

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<SuratPerjanjian | null>(null);
  const [printing,     setPrinting]     = useState<SuratPerjanjian | null>(null);
  const [delId,        setDelId]        = useState<string | null>(null);
  const [showPihak1,   setShowPihak1]   = useState(false);

  // ─── Filters ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return spList.filter(sp => {
      const matchSearch =
        sp.number.toLowerCase().includes(search.toLowerCase()) ||
        sp.customerName.toLowerCase().includes(search.toLowerCase()) ||
        sp.pihakPertamaName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || sp.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [spList, search, filterStatus]);

  // ─── Stats ────────────────────────────────────────────────────
  const totalActive    = spList.filter(s => s.status === "active").length;
  const totalValue     = spList.filter(s => s.status === "active").reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = spList.filter(s => s.status === "completed").length;

  // ─── Handlers ─────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditing(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((sp: SuratPerjanjian) => {
    setEditing(sp);
    setShowForm(true);
  }, []);

  const handleSubmit = (data: Omit<SuratPerjanjian, "id" | "createdAt" | "number">) => {
    if (editing) {
      updateSP(
        { id: editing.id, input: data },
        {
          onSuccess: () => { toast.success("Surat Perjanjian diperbarui"); setShowForm(false); setEditing(null); },
          onError: (err: any) => toast.error(err.message),
        }
      );
    } else {
      addSP(data, {
        onSuccess: () => { toast.success("Surat Perjanjian dibuat"); setShowForm(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteSP(id, {
      onSuccess: () => { toast.success("Surat Perjanjian dihapus"); setDelId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  // ─── Pihak Pertama options ────────────────────────────────────
  const pihakPertamaOptions = pihakList.map(p => ({
    id: p.id, name: p.name, address: p.address, phone: p.phone, position: p.position
  }));

  // ─── Table columns ────────────────────────────────────────────
  const columns = useMemo<ColumnDef<SuratPerjanjian>[]>(() => [
    {
      header: "#",
      id: "index",
      cell: ({ row }) => <span className="text-[12px] text-gray-400">{row.index + 1}</span>,
      enableSorting: false,
    },
    {
      header: "No. Surat",
      accessorKey: "number",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900">{row.original.number}</p>
            <p className="text-[11px] text-gray-400">{formatDate(row.original.date)}</p>
          </div>
        </div>
      )
    },
    {
      header: "Pihak Pertama",
      accessorKey: "pihakPertamaName",
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] font-semibold text-gray-800">{row.original.pihakPertamaName}</p>
          <p className="text-[11px] text-gray-400">{row.original.pihakPertamaPosition}</p>
        </div>
      )
    },
    {
      header: "Pihak Kedua",
      accessorKey: "customerName",
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] font-semibold text-gray-800">{row.original.customerName}</p>
          {row.original.projectLocation && (
            <p className="text-[11px] text-gray-400">{row.original.projectLocation}</p>
          )}
        </div>
      )
    },
    {
      header: "Lama Sewa",
      accessorKey: "lamaSewa",
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-600">{row.original.lamaSewa ?? "-"}</span>
      )
    },
    {
      header: "Total",
      accessorKey: "total",
      cell: ({ row }) => (
        <span className="text-[13px] font-bold text-emerald-700">
          {formatCurrency(row.original.total)}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge variant={STATUS_BADGE[s] ?? "gray"} dot>
            {STATUS_LABEL[s] ?? s}
          </Badge>
        );
      }
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => {
        const sp = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost" size="sm" className="px-2"
              onClick={() => setPrinting(sp)}
            >
              <Printer className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
            </Button>
            <Button
              variant="ghost" size="sm" className="px-2"
              onClick={() => openEdit(sp)}
            >
              <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button
              variant="ghost" size="sm" className="px-2"
              onClick={() => setDelId(sp.id)}
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      }
    }
  ], [openEdit]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Surat Perjanjian Sewa Menyewa"
        description="Kelola dokumen perjanjian sewa antara perusahaan dan pelanggan"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={Settings2}
              onClick={() => setShowPihak1(true)}
            >
              Pihak Pertama
            </Button>
            <Button leftIcon={Plus} onClick={openCreate}>
              Buat Surat Perjanjian
            </Button>
          </div>
        }
      />

      <StatsRow stats={[
        { label: "Total Dokumen",  value: spList.length,   icon: FileText,   iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
        { label: "Aktif",          value: totalActive,      icon: Users,      iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { label: "Selesai",        value: totalCompleted,   icon: TrendingUp, iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
        { label: "Total Nilai Aktif", value: formatCurrency(totalValue), icon: DollarSign, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
      ]} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cari nomor, pelanggan, pihak pertama..."
          />
        </div>
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: "all",       label: "Semua Status" },
            { value: "draft",     label: "Draft" },
            { value: "active",    label: "Aktif" },
            { value: "completed", label: "Selesai" },
            { value: "cancelled", label: "Batal" },
          ]}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <SuratPerjanjianForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
          initial={editing}
          customers={customers}
          pihakPertamaList={pihakPertamaOptions}
          isLoading={adding || updating}
        />
      )}

      {/* Print Modal */}
      {printing && (
        <SuratPerjanjianPrintModal
          doc={printing}
          onClose={() => setPrinting(null)}
        />
      )}

      {/* Pihak Pertama CRUD Modal */}
      <PihakPertamaModal
        open={showPihak1}
        onClose={() => setShowPihak1(false)}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => delId && handleDelete(delId)}
        title="Hapus Surat Perjanjian?"
        description="Dokumen ini beserta semua itemnya akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
