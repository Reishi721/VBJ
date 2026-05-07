import { useState, useCallback } from "react";
import { useAddProject, useUpdateProject, useDeleteProject } from "../../hooks/useCustomers";
import { formatDate } from "../../lib/utils";
import type { Customer, CustomerProject } from "../../types";
import { Plus, Pencil, Trash2, MapPin, Calendar, FolderOpen, User, Phone } from "lucide-react";
import {
  Button,
  TextInput,
  Textarea,
  Select,
  DatePicker,
  StatusBadge,
  Modal,
  ConfirmDialog
} from "../ui";

const emptyProject = { name: "", location: "", status: "active" as const, startDate: "", endDate: "", description: "", recipientName: "", recipientPhone: "" };

interface Props { customer: Customer; onClose: () => void; }

export default function ProjectModal({ customer, onClose }: Props) {
  const { mutate: addProject } = useAddProject();
  const { mutate: updateProject } = useUpdateProject();
  const { mutate: deleteProject } = useDeleteProject();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string; location: string; status: CustomerProject["status"];
    startDate: string; endDate: string; description: string;
    recipientName: string; recipientPhone: string;
  }>(emptyProject);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setForm(emptyProject);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((p: CustomerProject) => {
    setForm({
      name: p.name,
      location: p.location,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate || "",
      description: p.description || "",
      recipientName: p.recipientName || "",
      recipientPhone: p.recipientPhone || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateProject({ id: editingId, input: form });
    else addProject({ ...form, customerId: customer.id });
    setShowForm(false);
  };

  const handleCloseForm = useCallback(() => setShowForm(false), []);

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title={`Proyek: ${customer.name}`}
        description={`Marketing: ${customer.marketingName || "-"}`}
        size="lg"
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-700">Daftar Proyek</h4>
          <Button size="sm" leftIcon={Plus} onClick={openCreate}>Tambah Proyek</Button>
        </div>

        {customer.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FolderOpen className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium">Belum ada proyek</p>
            <p className="text-xs mt-1">Klik "Tambah Proyek" untuk menambahkan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customer.projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:bg-white hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[14px] font-semibold text-gray-900">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />{p.location}
                      </span>
                      <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(p.startDate)}{p.endDate ? ` — ${formatDate(p.endDate)}` : ""}
                      </span>
                      {p.recipientName && (
                        <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />{p.recipientName}
                        </span>
                      )}
                      {p.recipientPhone && (
                        <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />{p.recipientPhone}
                        </span>
                      )}
                    </div>
                    {p.description && <p className="text-[12px] text-gray-500 mt-2 line-clamp-2">{p.description}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelConfirm(p.id)}>
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ✅ FIX: Unmount sepenuhnya saat tidak dipakai, bukan hanya hide dengan open=false */}
      {showForm && (
        <Modal
          open={true}
          onClose={handleCloseForm}
          title={editingId ? "Edit Proyek" : "Tambah Proyek"}
          closeOnOverlay={false}
        >
          <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Nama Proyek"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextInput
              label="Lokasi"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label="Nama Penerima"
                placeholder="Nama penanggung jawab proyek"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              />
              <TextInput
                label="No. Telepon Penerima"
                placeholder="08xxxxxxxxxx"
                value={form.recipientPhone}
                onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                label="Tanggal Mulai"
                required
                value={form.startDate}
                onChange={(val) => setForm({ ...form, startDate: val })}
              />
              <DatePicker
                label="Tanggal Selesai"
                value={form.endDate}
                onChange={(val) => setForm({ ...form, endDate: val })}
              />
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(val) => setForm({ ...form, status: val as CustomerProject["status"] })}
              options={[
                { value: "active", label: "Aktif" },
                { value: "pending", label: "Pending" },
                { value: "completed", label: "Selesai" },
                { value: "cancelled", label: "Dibatalkan" }
              ]}
            />
            <Textarea
              label="Deskripsi"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </form>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={handleCloseForm}>Batal</Button>
            <Button type="submit" form="project-form">{editingId ? "Simpan" : "Tambah"}</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!delConfirm}
        onClose={() => setDelConfirm(null)}
        onConfirm={() => { if (delConfirm) deleteProject(delConfirm); setDelConfirm(null); }}
        title="Hapus Proyek?"
        description="Data proyek ini tidak dapat dikembalikan."
        confirmLabel="Hapus"
        variant="danger"
      />
    </>
  );
}