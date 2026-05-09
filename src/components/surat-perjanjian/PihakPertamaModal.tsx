/**
 * PihakPertamaModal — CRUD untuk data Pihak Pertama (perwakilan perusahaan)
 */
import { useState } from "react";
import { Plus, Pencil, Trash2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import type { PihakPertama } from "../../types";
import {
  usePihakPertama,
  useAddPihakPertama,
  useUpdatePihakPertama,
  useDeletePihakPertama,
} from "../../hooks/useSuratPerjanjian";
import { Button, TextInput, Textarea, Modal, ConfirmDialog } from "../ui";

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  name:      "",
  address:   "",
  phone:     "",
  position:  "Manager Marketing",
  isDefault: false,
};

export default function PihakPertamaModal({ open, onClose }: Props) {
  const { data: list = [] } = usePihakPertama();
  const { mutate: add,    isPending: adding   } = useAddPihakPertama();
  const { mutate: update, isPending: updating } = useUpdatePihakPertama();
  const { mutate: remove                      } = useDeletePihakPertama();

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState(emptyForm);
  const [delId,    setDelId]    = useState<string | null>(null);

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: PihakPertama) => {
    setForm({ name: p.name, address: p.address, phone: p.phone, position: p.position, isDefault: p.isDefault });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nama wajib diisi"); return; }

    if (editId) {
      update(
        { id: editId, input: form },
        {
          onSuccess: () => { toast.success("Pihak Pertama diperbarui"); setShowForm(false); },
          onError: (err: any) => toast.error(err.message),
        }
      );
    } else {
      add(form, {
        onSuccess: () => { toast.success("Pihak Pertama ditambahkan"); setShowForm(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  const handleDelete = (id: string) => {
    remove(id, {
      onSuccess: () => { toast.success("Data dihapus"); setDelId(null); },
      onError: (err: any) => toast.error(err.message),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Kelola Pihak Pertama" size="lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Data perwakilan perusahaan sebagai Pihak Pertama dalam surat perjanjian.</p>
          <Button size="sm" leftIcon={Plus} onClick={openCreate}>Tambah</Button>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Belum ada data Pihak Pertama. Klik "Tambah" untuk menambahkan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
            {list.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{p.name}</p>
                    {p.isDefault && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <Star className="w-2.5 h-2.5" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{p.position} — {p.phone}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-modal: form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editId ? "Edit Pihak Pertama" : "Tambah Pihak Pertama"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <TextInput
                label="Nama"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
              />
              <Textarea
                label="Alamat"
                rows={2}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Telepon"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
                <TextInput
                  label="Jabatan"
                  value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  {form.isDefault ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <StarOff className="w-3.5 h-3.5 text-gray-400" />}
                  Jadikan default
                </span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" disabled={adding || updating}>
                  {adding || updating ? "Menyimpan..." : (editId ? "Simpan" : "Tambah")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => delId && handleDelete(delId)}
        title="Hapus Pihak Pertama?"
        description="Data ini akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Hapus"
        variant="danger"
      />
    </Modal>
  );
}
