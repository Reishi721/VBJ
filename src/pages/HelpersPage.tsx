import { useMemo, useState, useCallback } from "react";
import { formatDate } from "../lib/utils";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Button, SearchBar, TextInput, Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable, Select, Badge,
} from "../components/ui";
import type { Helper } from "../types";
import { useHelpers } from "../hooks/useHelpers";
import { useAddHelper, useUpdateHelper, useDeleteHelper } from "../hooks/useHelpers";

function HelperStatusBadge({ status }: { status: Helper["status"] }) {
  const map: Record<Helper["status"], { label: string; variant: "emerald" | "gray" }> = {
    active: { label: "Aktif", variant: "emerald" },
    inactive: { label: "Non-Aktif", variant: "gray" },
  };
  const m = map[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

const emptyForm = { name: "", phone: "", status: "active" as Helper["status"] };

export default function HelpersPage() {
  const { data: helpers = [] } = useHelpers();
  const { mutate: addHelper } = useAddHelper();
  const { mutate: updateHelper } = useUpdateHelper();
  const { mutate: deleteHelper } = useDeleteHelper();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return helpers;
    return helpers.filter((h) =>
      h.name.toLowerCase().includes(q) ||
      (h.phone || "").toLowerCase().includes(q)
    );
  }, [helpers, search]);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((h: Helper) => {
    setForm({
      name: h.name,
      phone: h.phone || "",
      status: h.status,
    });
    setEditingId(h.id);
    setShowForm(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateHelper({ id: editingId, input: form });
    else addHelper(form);
    setShowForm(false);
  };

  const columns = useMemo<ColumnDef<Helper>[]>(() => [
    {
      header: "Nama",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
            <UserCog className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{row.original.name}</p>
            {row.original.phone && <p className="text-[11px] text-gray-500">{row.original.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <HelperStatusBadge status={row.original.status} />,
    },
    {
      header: "Dibuat",
      accessorKey: "createdAt",
      cell: ({ row }) => <span className="text-[12px] text-gray-400">{formatDate(row.original.createdAt)}</span>,
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(row.original)}>
            <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(row.original.id)}>
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      ),
    },
  ], [openEdit]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Helper"
        description="Kelola data helper pengiriman"
        action={<Button leftIcon={Plus} onClick={openCreate}>Tambah Helper</Button>}
      />

      <StatsRow stats={[
        { label: "Total Helper", value: helpers.length, icon: UserCog, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
        { label: "Aktif", value: helpers.filter((h) => h.status === "active").length, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", icon: UserCog },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama atau telepon..." />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Helper" : "Tambah Helper"} size="md">
        <form id="helper-form" onSubmit={handleSubmit} className="space-y-4">
          <TextInput label="Nama Helper" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextInput
            label="No. Telepon"
            placeholder="Opsional"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(val) => setForm({ ...form, status: val as Helper["status"] })}
            options={[
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Non-Aktif" },
            ]}
          />
        </form>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
          <Button type="submit" form="helper-form">{editingId ? "Simpan Perubahan" : "Tambah Helper"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => {
          if (!delId) return;
          deleteHelper(delId);
          setDelId(null);
        }}
        title="Hapus Helper?"
        description="Data helper akan dihapus permanen."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}

