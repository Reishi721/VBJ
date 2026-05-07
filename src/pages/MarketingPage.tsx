import { useState, useMemo } from "react";
import { useMarketing, useAddMarketing, useUpdateMarketing, useDeleteMarketing } from "../hooks/useMarketing";
import { formatDate } from "../lib/utils";
import type { Marketing } from "../types";
import { Plus, Pencil, Trash2, UserCheck, UserX, Phone, Mail, Briefcase, Users } from "lucide-react";
import {
  Button,
  SearchBar,
  TextInput,
  Select,
  Badge,
  Modal,
  ConfirmDialog,
  SectionHeader,
  StatsRow,
  DataTable
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";

const emptyForm = { name: "", phone: "", email: "", position: "", status: "active" as const };

export default function MarketingPage() {
  const { data: marketings = [] } = useMarketing();
  const { mutate: addMarketing } = useAddMarketing();
  const { mutate: updateMarketing } = useUpdateMarketing();
  const { mutate: deleteMarketing } = useDeleteMarketing();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string; phone: string; email: string;
    position: string; status: Marketing["status"];
  }>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => 
    marketings.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
    ),
  [marketings, search]);

  const activeCount = marketings.filter((m) => m.status === "active").length;

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMarketing({ id: editingId, input: form });
    else addMarketing(form);
    setShowForm(false);
  };

  const columns = useMemo<ColumnDef<Marketing>[]>(() => [
    {
      header: "Nama",
      accessorKey: "name",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[13px] font-semibold text-gray-900">{m.name}</span>
          </div>
        );
      }
    },
    {
      header: "Kontak",
      id: "contact",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="space-y-1">
            <p className="text-[12px] text-gray-600 flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{m.phone}</p>
            <p className="text-[12px] text-gray-400 flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" />{m.email}</p>
          </div>
        );
      }
    },
    {
      header: "Jabatan",
      accessorKey: "position",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600">
          <Briefcase className="w-3 h-3 text-gray-400" />{row.original.position}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={status === "active" ? "emerald" : "gray"} dot>
            {status === "active" ? "Aktif" : "Non-Aktif"}
          </Badge>
        );
      }
    },
    {
      header: "Terdaftar",
      accessorKey: "createdAt",
      cell: ({ row }) => <span className="text-[12px] text-gray-400">{formatDate(row.original.createdAt)}</span>
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={(e) => { 
              e.stopPropagation(); 
              setForm({ name: m.name, phone: m.phone, email: m.email, position: m.position, status: m.status });
              setEditingId(m.id); setShowForm(true);
            }}>
              <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(m.id); }}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      }
    }
  ], []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Data Marketing"
        description="Kelola tim marketing perusahaan"
        action={<Button leftIcon={Plus} onClick={openCreate}>Tambah Marketing</Button>}
      />

      <StatsRow stats={[
        { label: "Total", value: marketings.length, icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Aktif", value: activeCount, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { label: "Non-Aktif", value: marketings.length - activeCount, icon: UserX, iconBg: "bg-red-50", iconColor: "text-red-500" },
      ]} />

      <div className="max-w-md">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, email, atau telepon..."
        />
      </div>

      <DataTable columns={columns} data={filtered} />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Marketing" : "Tambah Marketing"}
        description="Lengkapi informasi marketing di bawah ini."
      >
        <form id="marketing-form" onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Nama Lengkap"
            required
            placeholder="Contoh: Budi Santoso"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="No. Telepon"
              required
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextInput
              type="email"
              label="Email"
              required
              placeholder="budi@contoh.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Jabatan"
              required
              placeholder="Contoh: Senior Marketing"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(val) => setForm({ ...form, status: val as "active" | "inactive" })}
              options={[
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Non-Aktif" }
              ]}
            />
          </div>
        </form>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
          <Button type="submit" form="marketing-form">{editingId ? "Simpan Perubahan" : "Tambah"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if(deleteConfirm) deleteMarketing(deleteConfirm); setDeleteConfirm(null); }}
        title="Hapus Marketing?"
        description="Data marketing yang dihapus tidak dapat dikembalikan lagi."
        confirmLabel="Hapus Data"
        variant="danger"
      />
    </div>
  );
}
