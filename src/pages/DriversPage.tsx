import { useMemo, useState, useCallback } from "react";
import { formatDate } from "../lib/utils";
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Button, SearchBar, TextInput, Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable, Select, Badge,
} from "../components/ui";
import type { Driver } from "../types";
import { useDrivers } from "../hooks/useDrivers";
import { useAddDriver, useUpdateDriver, useDeleteDriver } from "../hooks/useDrivers";

function DriverStatusBadge({ status }: { status: Driver["status"] }) {
  const map: Record<Driver["status"], { label: string; variant: "emerald" | "gray" }> = {
    active: { label: "Aktif", variant: "emerald" },
    inactive: { label: "Non-Aktif", variant: "gray" },
  };
  const m = map[status];
  return <Badge variant={m.variant} dot>{m.label}</Badge>;
}

const emptyForm = { name: "", phone: "", status: "active" as Driver["status"] };

export default function DriversPage() {
  const { data: drivers = [] } = useDrivers();
  const { mutate: addDriver } = useAddDriver();
  const { mutate: updateDriver } = useUpdateDriver();
  const { mutate: deleteDriver } = useDeleteDriver();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [delId, setDelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.phone || "").toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((d: Driver) => {
    setForm({
      name: d.name,
      phone: d.phone || "",
      status: d.status,
    });
    setEditingId(d.id);
    setShowForm(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateDriver({ id: editingId, input: form });
    else addDriver(form);
    setShowForm(false);
  };

  const columns = useMemo<ColumnDef<Driver>[]>(() => [
    {
      header: "Nama",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <UserRound className="w-4 h-4 text-blue-600" />
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
      cell: ({ row }) => <DriverStatusBadge status={row.original.status} />,
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
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => setDelId(row.original.id)}
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      ),
    },
  ], [openEdit]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Supir"
        description="Kelola data supir pengiriman"
        action={<Button leftIcon={Plus} onClick={openCreate}>Tambah Supir</Button>}
      />

      <StatsRow stats={[
        { label: "Total Supir", value: drivers.length, icon: UserRound, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Aktif", value: drivers.filter((d) => d.status === "active").length, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", icon: UserRound },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nama atau telepon..." />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Supir" : "Tambah Supir"} size="md">
        <form id="driver-form" onSubmit={handleSubmit} className="space-y-4">
          <TextInput label="Nama Supir" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextInput
            label="No. Telepon"
            placeholder="Opsional"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(val) => setForm({ ...form, status: val as Driver["status"] })}
            options={[
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Non-Aktif" },
            ]}
          />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
          <Button type="submit" form="driver-form">{editingId ? "Simpan Perubahan" : "Tambah Supir"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => {
          if (!delId) return;
          deleteDriver(delId);
          setDelId(null);
        }}
        title="Hapus Supir?"
        description="Data supir akan dihapus permanen."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}

