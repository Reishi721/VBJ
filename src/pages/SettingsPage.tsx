import { useState, useEffect } from "react";
import { useCompanySettings, useBanks, useUpdateCompanySettings, useAddBank, useUpdateBank, useDeleteBank, useSuratJalanTypes, useAddSuratJalanType, useUpdateSuratJalanType, useDeleteSuratJalanType } from "../hooks/useSettings";
import type { BankAccount, CompanySettings, InvoiceSettings } from "../stores/useSettingsStore";
import { SectionHeader, Button, TextInput, Textarea, ConfirmDialog, Modal } from "../components/ui";
import { Save, Plus, Trash2, Pencil, Landmark, Building2, FileText, Upload, Loader2, X, FileSignature } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SettingsPage() {
  const { data: settingsData } = useCompanySettings();
  const { data: banks = [] } = useBanks();
  const { mutate: updateSettings } = useUpdateCompanySettings();
  const { mutate: addBank } = useAddBank();
  const { mutate: updateBank } = useUpdateBank();
  const { mutate: deleteBank } = useDeleteBank();

  // Company Local State
  const [cForm, setCForm] = useState<CompanySettings>({
    name: "", tagline: "", addressLine1: "", addressLine2: "", phone: "", fax: "", logoUrl: ""
  });
  const [invForm, setInvForm] = useState<InvoiceSettings>({
    remarks: "", managerName: "", managerTitle: ""
  });

  useEffect(() => {
    if (settingsData) {
      setCForm(settingsData.company);
      setInvForm(settingsData.invoice);
    }
  }, [settingsData]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError]         = useState<string | null>(null);

  // Bank Form Local State
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<Omit<BankAccount, "id">>({ bankName: "", accountNumber: "", accountName: "" });
  const [delBank, setDelBank] = useState<string | null>(null);

  const { data: sjTypes = [] } = useSuratJalanTypes();
  const { mutate: addSjType } = useAddSuratJalanType();
  const { mutate: updateSjType } = useUpdateSuratJalanType();
  const { mutate: deleteSjType } = useDeleteSuratJalanType();

  // Surat Jalan Types Local State
  const [showSjTypeForm, setShowSjTypeForm] = useState(false);
  const [editingSjTypeId, setEditingSjTypeId] = useState<string | null>(null);
  const [sjTypeForm, setSjTypeForm] = useState({ name: "", prefix: "" });
  const [delSjType, setDelSjType] = useState<string | null>(null);

  const handleSaveSjType = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSjTypeId) {
      updateSjType({ id: editingSjTypeId, input: sjTypeForm });
    } else {
      addSjType({ id: sjTypeForm.name.toLowerCase().replace(/\s+/g, "_"), ...sjTypeForm });
    }
    setShowSjTypeForm(false);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ id: settingsData?.id, company: cForm, invoice: invForm });
    alert("Pengaturan berhasil disimpan.");
  };

  /** Upload logo ke Supabase Storage bucket "company-assets" */
  const handleLogoUpload = async (file: File) => {
    setLogoError(null);
    setLogoUploading(true);
    try {
      // Nama file tetap: logo.png (overwrite jika upload ulang)
      const ext  = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo/company-logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      // Ambil public URL
      const { data } = supabase.storage
        .from("company-assets")
        .getPublicUrl(path);

      // Tambahkan cache-buster agar browser tidak pakai versi lama
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      setCForm(f => ({ ...f, logoUrl: publicUrl }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      if (msg.includes("Bucket not found")) {
        setLogoError("Bucket 'company-assets' belum dibuat. Jalankan supabase_storage_bucket.sql di Supabase SQL Editor terlebih dahulu.");
      } else if (msg.includes("row-level security") || msg.includes("policy")) {
        setLogoError("Tidak punya izin upload. Pastikan sudah login dan RLS policy sudah benar.");
      } else {
        setLogoError(`Upload gagal: ${msg}`);
      }
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBankId) {
      updateBank({ id: editingBankId, input: bankForm });
    } else {
      addBank(bankForm);
    }
    setShowBankForm(false);
  };

  const openAddBank = () => {
    setBankForm({ bankName: "", accountNumber: "", accountName: "" });
    setEditingBankId(null);
    setShowBankForm(true);
  };

  const openEditBank = (b: BankAccount) => {
    setBankForm({ bankName: b.bankName, accountNumber: b.accountNumber, accountName: b.accountName });
    setEditingBankId(b.id);
    setShowBankForm(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Pengaturan Sistem" description="Kelola Kop Surat, Nomor Rekening, dan Ketentuan Invoice" />

      <form onSubmit={handleSaveCompany} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Company Settings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h3 className="font-bold text-lg text-gray-900">Data Perusahaan (Kop Surat)</h3>
            </div>
            
            <TextInput label="Nama Perusahaan" required value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} />
            <TextInput label="Tagline / Slogan" value={cForm.tagline} onChange={e => setCForm({ ...cForm, tagline: e.target.value })} />
            <TextInput label="Alamat (Baris 1)" value={cForm.addressLine1} onChange={e => setCForm({ ...cForm, addressLine1: e.target.value })} />
            <TextInput label="Alamat (Baris 2)" value={cForm.addressLine2} onChange={e => setCForm({ ...cForm, addressLine2: e.target.value })} />
            
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="Nomor Telepon" value={cForm.phone} onChange={e => setCForm({ ...cForm, phone: e.target.value })} />
              <TextInput label="Nomor Fax" value={cForm.fax} onChange={e => setCForm({ ...cForm, fax: e.target.value })} />
            </div>

            {/* Logo Section */}
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-700">Logo Perusahaan</label>
              <div className="flex items-start gap-4">

                {/* Preview */}
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {logoUploading ? (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : cForm.logoUrl ? (
                    <img src={cForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-3xl font-black text-gray-300">V</span>
                  )}
                </div>

                {/* Upload controls */}
                <div className="flex-1 space-y-2">

                  {/* Upload button */}
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-semibold transition-colors w-fit cursor-pointer ${
                    logoUploading
                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}>
                    {logoUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</>
                      : <><Upload className="w-4 h-4" /> Upload ke Supabase</>
                    }
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                        e.target.value = ""; // reset agar bisa upload file sama lagi
                      }}
                    />
                  </label>

                  <p className="text-[11px] text-gray-400">
                    PNG, JPG, SVG, atau WebP · Maks. 2 MB · Disimpan di Supabase Storage
                  </p>

                  {/* Error message */}
                  {logoError && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                      <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-700 font-medium">{logoError}</p>
                    </div>
                  )}

                  {/* URL fallback */}
                  <div className="pt-1">
                    <p className="text-[11px] text-gray-400 mb-1">Atau masukkan URL langsung:</p>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={cForm.logoUrl?.includes("supabase") || cForm.logoUrl?.startsWith("data:")
                        ? ""
                        : cForm.logoUrl || ""}
                      onChange={e => setCForm(f => ({ ...f, logoUrl: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] outline-none focus:border-blue-400"
                    />
                  </div>

                  {/* Current URL display */}
                  {cForm.logoUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[220px]">
                        {cForm.logoUrl.startsWith("data:") ? "(base64 lokal)" : cForm.logoUrl}
                      </span>
                      <button type="button"
                        onClick={() => { setCForm(f => ({ ...f, logoUrl: "" })); setLogoError(null); }}
                        className="text-[11px] text-red-500 hover:underline shrink-0 ml-2">
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>


          </div>

          {/* Invoice Settings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <h3 className="font-bold text-lg text-gray-900">Ketentuan Invoice & TTD</h3>
            </div>

            <Textarea label="Remarks / Catatan Kaki" rows={4} value={invForm.remarks} onChange={e => setInvForm({ ...invForm, remarks: e.target.value })} />
            
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="Nama Manager (Opsional)" value={invForm.managerName} onChange={e => setInvForm({ ...invForm, managerName: e.target.value })} />
              <TextInput label="Jabatan Penandatangan" required value={invForm.managerTitle} onChange={e => setInvForm({ ...invForm, managerTitle: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" leftIcon={Save}>Simpan Pengaturan</Button>
        </div>
      </form>

      {/* Bank Accounts Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold text-lg text-gray-900">Rekening Bank Perusahaan</h3>
          </div>
          <Button size="sm" variant="outline" leftIcon={Plus} onClick={openAddBank}>Tambah Rekening</Button>
        </div>

        {banks.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4">Belum ada rekening bank yang ditambahkan.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {banks.map((b) => (
              <div key={b.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 relative group">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditBank(b)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-white shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDelBank(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-white shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="font-bold text-gray-900">{b.bankName}</p>
                <p className="font-mono text-sm text-blue-600 mt-1">{b.accountNumber}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase">A.N. {b.accountName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Surat Jalan Types Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold text-lg text-gray-900">Tipe Surat Jalan & Prefix</h3>
          </div>
          <Button size="sm" variant="outline" leftIcon={Plus} onClick={() => { setSjTypeForm({ name: "", prefix: "" }); setEditingSjTypeId(null); setShowSjTypeForm(true); }}>Tambah Tipe</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {sjTypes.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 relative group">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSjTypeForm({ name: t.name, prefix: t.prefix }); setEditingSjTypeId(t.id); setShowSjTypeForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-white shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDelSjType(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-white shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <p className="font-bold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500 mt-1">Prefix Penomoran: <span className="font-bold text-blue-600 ml-1">{t.prefix}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Form Modal */}
      <Modal open={showBankForm} onClose={() => setShowBankForm(false)} title={editingBankId ? "Edit Rekening Bank" : "Tambah Rekening Bank"} size="sm">
        <form id="bank-form" onSubmit={handleSaveBank} className="space-y-4">
          <TextInput label="Nama Bank" required placeholder="Contoh: BCA" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} />
          <TextInput label="Nomor Rekening" required placeholder="Contoh: 1234567890" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
          <TextInput label="Atas Nama" required placeholder="Contoh: PT. ABC" value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })} />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowBankForm(false)}>Batal</Button>
          <Button type="submit" form="bank-form">Simpan</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delBank} onClose={() => setDelBank(null)} title="Hapus Rekening?" 
        onConfirm={() => { if (delBank) deleteBank(delBank); setDelBank(null); }} />

      {/* SJ Type Form Modal */}
      <Modal open={showSjTypeForm} onClose={() => setShowSjTypeForm(false)} title={editingSjTypeId ? "Edit Tipe Surat Jalan" : "Tambah Tipe Surat Jalan"} size="sm">
        <form id="sj-type-form" onSubmit={handleSaveSjType} className="space-y-4">
          <TextInput label="Nama Tipe" required placeholder="Contoh: Pemindahan" value={sjTypeForm.name} onChange={e => setSjTypeForm({ ...sjTypeForm, name: e.target.value })} />
          <TextInput label="Prefix Angka (1 Digit)" required placeholder="Contoh: 4" maxLength={1} value={sjTypeForm.prefix} onChange={e => setSjTypeForm({ ...sjTypeForm, prefix: e.target.value.replace(/\D/g, '') })} />
        </form>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowSjTypeForm(false)}>Batal</Button>
          <Button type="submit" form="sj-type-form">Simpan</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delSjType} onClose={() => setDelSjType(null)} title="Hapus Tipe Surat Jalan?" 
        onConfirm={() => { if (delSjType) deleteSjType(delSjType); setDelSjType(null); }} />
    </div>
  );
}
