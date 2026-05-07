import { useState, useMemo, useCallback } from "react";
import { useCustomers, useAddCustomer, useUpdateCustomer, useDeleteCustomer } from "../hooks/useCustomers";
import { useMarketing } from "../hooks/useMarketing";
import { formatDate } from "../lib/utils";
import type { Customer } from "../types";
import ProjectModal from "../components/customers/ProjectModal";
import { Plus, Pencil, Trash2, Users, FolderOpen, Building2, FolderKanban } from "lucide-react";
import {
  Button,
  SearchBar,
  TextInput,
  Textarea,
  SearchSelect,
  Select,
  Badge,
  Modal,
  ConfirmDialog,
  SectionHeader,
  StatsRow,
  DataTable
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";

const emptyForm = { name: "", company: "", phone: "", email: "", address: "", marketingId: "", status: "active" as const };

export default function CustomerPage() {
  const { data: customers = [] } = useCustomers();
  const { data: marketings = [] } = useMarketing();
  const { mutate: addCustomer } = useAddCustomer();
  const { mutate: updateCustomer } = useUpdateCustomer();
  const { mutate: deleteCustomer } = useDeleteCustomer();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string; company: string; phone: string;
    email: string; address: string; marketingId: string;
    status: Customer["status"];
  }>(emptyForm);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  // ✅ FIX 1: Simpan hanya ID, bukan seluruh object Customer
  const [projectCustomerId, setProjectCustomerId] = useState<string | null>(null);
  const projectCustomer = projectCustomerId
    ? customers.find(c => c.id === projectCustomerId) ?? null
    : null;

  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ),
    [customers, search]);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }, []);

  // ✅ FIX 2: Stable reference dengan useCallback
  const openEdit = useCallback((c: Customer) => {
    setForm({
      name: c.name,
      company: c.company || "",
      phone: c.phone,
      email: c.email || "",
      address: c.address,
      marketingId: c.marketingId,
      status: c.status,
    });
    setEditingId(c.id);
    setShowForm(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateCustomer({ id: editingId, input: form });
    else addCustomer(form);
    setShowForm(false);
  };

  const totalProjects = customers.reduce((s, c) => s + c.projects.length, 0);
  const activeProjects = customers.reduce((s, c) => s + c.projects.filter(p => p.status === "active").length, 0);

  // ✅ FIX 3: Tambahkan openEdit & setProjectCustomerId ke dependency array
  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      header: "#",
      id: "index",
      cell: ({ row }) => <span className="text-[12px] text-gray-400 font-medium">{row.index + 1}</span>,
      enableSorting: false,
    },
    {
      header: "Nama Pelanggan",
      accessorKey: "name",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{c.name}</p>
              {c.company && <p className="text-[11px] text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</p>}
            </div>
          </div>
        );
      }
    },
    {
      header: "Kontak",
      id: "contact",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <p className="text-[12px] text-gray-600">{c.phone}</p>
            {c.email && <p className="text-[11px] text-gray-400">{c.email}</p>}
          </div>
        );
      }
    },
    {
      header: "Marketing",
      accessorKey: "marketingName",
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold">
          {row.original.marketingName || "-"}
        </div>
      )
    },
    {
      header: "Proyek",
      id: "projects",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <button
            onClick={() => setProjectCustomerId(c.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {c.projects.length} Proyek
          </button>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "emerald" : "gray"} dot>
          {row.original.status === "active" ? "Aktif" : "Non-Aktif"}
        </Badge>
      )
    },
    {
      header: "Bergabung",
      accessorKey: "createdAt",
      cell: ({ row }) => <span className="text-[12px] text-gray-400">{formatDate(row.original.createdAt)}</span>
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(c)}>
              <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelConfirm(c.id)}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        );
      }
    }
  ], [openEdit, setProjectCustomerId, setDelConfirm]);

  const marketingOptions = marketings
    .filter(m => m.status === "active" || m.id === form.marketingId)
    .map(m => ({ value: m.id, label: m.name, description: m.position }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Data Pelanggan"
        description="Kelola pelanggan dan proyek mereka"
        action={<Button leftIcon={Plus} onClick={openCreate}>Tambah Pelanggan</Button>}
      />

      <StatsRow stats={[
        { label: "Total Pelanggan", value: customers.length, icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Total Proyek", value: totalProjects, icon: FolderKanban, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
        { label: "Proyek Aktif", value: activeProjects, icon: FolderOpen, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      ]} />

      <div className="max-w-md">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, perusahaan, telepon..."
        />
      </div>

      <DataTable columns={columns} data={filtered} />

      {/* ✅ FIX 1: projectCustomer sekarang selalu fresh dari store */}
      {projectCustomer && (
        <ProjectModal
          customer={projectCustomer}
          onClose={() => setProjectCustomerId(null)}
        />
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Pelanggan" : "Tambah Pelanggan"}
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Nama Pelanggan"
            required
            placeholder="Nama lengkap / perusahaan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextInput
            label="Perusahaan"
            placeholder="Opsional"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="No. Telepon"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextInput
              type="email"
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <Textarea
            label="Alamat"
            required
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchSelect
              label="Marketing PIC"
              required
              placeholder="Pilih marketing..."
              value={form.marketingId}
              onChange={(val) => setForm({ ...form, marketingId: val })}
              options={marketingOptions}
              placement="top"
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
          <Button type="submit" form="customer-form">{editingId ? "Simpan Perubahan" : "Tambah Pelanggan"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delConfirm}
        onClose={() => setDelConfirm(null)}
        onConfirm={() => { if (delConfirm) deleteCustomer(delConfirm); setDelConfirm(null); }}
        title="Hapus Pelanggan?"
        description="Semua proyek pelanggan juga akan terhapus dan tidak dapat dikembalikan."
        confirmLabel="Hapus Data"
        variant="danger"
      />
    </div>
  );
}