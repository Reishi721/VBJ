import { useState, useMemo, useCallback } from "react";
import { useInvoices, usePayments, useAddInvoice, useUpdateInvoice, useDeleteInvoice, useAddPayment } from "../hooks/useInvoices";
import { useCustomers } from "../hooks/useCustomers";
import type { Invoice, InvoiceStatus } from "../types";
import { Plus, Pencil, Trash2, Eye, FileText, CreditCard, Clock, AlertTriangle } from "lucide-react";
import {
  Button, SearchBar, TextInput, Select, SearchSelect, Textarea,
  Modal, ConfirmDialog, SectionHeader, StatsRow, DataTable, DatePicker
} from "../components/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { lazy, Suspense } from "react";
const InvoiceDetailModal = lazy(() => import("../components/invoice/InvoiceDetailModal"));
const PaymentModal = lazy(() => import("../components/invoice/PaymentModal"));
import { formatRupiah, InvoiceStatusBadge, PaymentProgress } from "../components/invoice/InvoiceHelpers";

// ─── Formatted Number Input ───────────────────────────────────────────────────
function FormattedNumberInput({
  value, onChange, min = 0, prefix, className = "", decimal = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  prefix?: string;
  className?: string;
  decimal?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  // Format display when not focused
  const formatDisplay = (num: number) => {
    const pfx = prefix ? `${prefix} ` : "";
    if (decimal && !Number.isInteger(num)) {
      const [intPart, decPart] = num.toString().split(".");
      return pfx + Number(intPart).toLocaleString("id-ID") + "," + (decPart ?? "");
    }
    return pfx + num.toLocaleString("id-ID");
  };

  const display = focused ? raw : formatDisplay(value);

  const handleFocus = () => {
    setRaw(value === 0 ? "" : value.toString().replace(".", ","));
    setFocused(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let cleaned = e.target.value;
    if (decimal) {
      cleaned = cleaned.replace(/[^0-9.,]/g, "");
      const parts = cleaned.split(/[.,]/);
      if (parts.length > 2) cleaned = parts[0] + "," + parts.slice(1).join("");
      setRaw(cleaned);
      const parsed = parseFloat(cleaned.replace(",", "."));
      onChange(isNaN(parsed) ? 0 : parsed);
    } else {
      cleaned = cleaned.replace(/[^0-9]/g, "");
      setRaw(cleaned);
      onChange(cleaned === "" ? 0 : Number(cleaned));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (decimal) {
      const parsed = parseFloat(raw.replace(",", "."));
      if (!isNaN(parsed)) onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={display}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all ${className}`}
    />
  );
}



// ─── Empty Form ───────────────────────────────────────────────────────────────
const emptyForm = {
  summaryDescription: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  poNumber: "", billingCycle: "",
  customerId: "", customerName: "", customerAddress: "",
  projectId: "", projectName: "",
  upName: "", upPhone: "",
  subtotal: 0,
  transportFee: 0, depositFee: 0,
  discount: 0, tax: 11,
  status: "draft" as InvoiceStatus, notes: "",
  items: [] as Invoice["items"],
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const { data: payments = [] }                        = usePayments();
  const { data: customers = [] }                       = useCustomers();
  
  const { mutate: addInvoice }    = useAddInvoice();
  const { mutate: updateInvoice } = useUpdateInvoice();
  const { mutate: deleteInvoice } = useDeleteInvoice();
  const { mutate: addPayment }    = useAddPayment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [viewInv, setViewInv] = useState<Invoice | null>(null);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [delId, setDelId] = useState<string | null>(null);


  // ─ Derived data ─
  const selectedCustomer = customers.find(c => c.id === form.customerId);
  const projectOptions = useMemo(() =>
    selectedCustomer?.projects.map(p => ({ value: p.id, label: p.name, description: p.location })) ?? [],
    [selectedCustomer]);

  const customerOptions = useMemo(() =>
    customers.map(c => ({ value: c.id, label: c.name, description: c.company || c.phone })),
    [customers]);

  // ─ Filtered list ─
  const filtered = useMemo(() =>
    invoices.filter(inv => {
      const matchSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.projectName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    }), [invoices, search, statusFilter]);

  // ─ Stats ─
  const totalReceivables = invoices.reduce((s, i) => s + (i.status !== "cancelled" ? i.remainingAmount : 0), 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const paidThisMonth = payments.filter(p => p.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, p) => s + p.amount, 0);

  // ─ Handlers ─
  const openCreate = useCallback(() => {
    setForm({ ...emptyForm });
    setEditingId(null); setShowForm(true);
  }, []);

  const openEdit = useCallback((inv: Invoice) => {
    setForm({
      summaryDescription: inv.summaryDescription, date: inv.date, dueDate: inv.dueDate,
      poNumber: inv.poNumber || "", billingCycle: inv.billingCycle || "",
      customerId: inv.customerId, customerName: inv.customerName, customerAddress: inv.customerAddress || "",
      projectId: inv.projectId || "", projectName: inv.projectName || "",
      upName: inv.upName || "", upPhone: inv.upPhone || "",
      subtotal: inv.subtotal,
      transportFee: inv.transportFee || 0, depositFee: inv.depositFee || 0,
      discount: inv.discount, tax: inv.tax,
      status: inv.status, notes: inv.notes || "",
      items: [],
    });
    setEditingId(inv.id); setShowForm(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.subtotal <= 0) return alert("Isi subtotal tagihan terlebih dahulu.");
    const taxAmt = Math.round(((form.subtotal - form.discount) * form.tax) / 100);
    const total  = form.subtotal - form.discount + taxAmt + (form.transportFee || 0) + (form.depositFee || 0);
    const payload = { ...form, items: [], taxAmount: taxAmt, total, remainingAmount: total, paidAmount: 0 };
    if (editingId) updateInvoice({ id: editingId, input: payload });
    else addInvoice(payload);
    setShowForm(false);
  };

  // ─ Columns ─
  const columns = useMemo<ColumnDef<Invoice>[]>(() => [
    {
      header: "Nomor & Ringkasan",
      id: "number",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-[13px] font-bold text-blue-600 mb-1">{row.original.number}</p>
          <p className="text-[11px] text-gray-500 line-clamp-1" title={row.original.summaryDescription}>{row.original.summaryDescription}</p>
        </div>
      ),
    },
    {
      header: "Pelanggan",
      id: "customer",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{inv.customerName}</p>
            {inv.projectName && <p className="text-[11px] text-gray-400">{inv.projectName}</p>}
          </div>
        );
      },
    },
    {
      header: "Tanggal & Jatuh Tempo",
      id: "dates",
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] text-gray-500">Tgl: <span className="font-medium text-gray-900">{row.original.date}</span></p>
          <p className="text-[12px] text-gray-500">JT: <span className="font-medium text-red-600">{row.original.dueDate}</span></p>
        </div>
      ),
    },
    {
      header: "Tagihan & Pembayaran",
      id: "amounts",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="min-w-[150px]">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[11px] text-gray-400">Total:</span>
              <span className="text-[13px] font-bold text-gray-900">{formatRupiah(inv.total)}</span>
            </div>
            <PaymentProgress paid={inv.paidAmount} total={inv.total} />
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      header: "Aksi",
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setViewInv(inv)} title="Lihat detail">
              <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600" />
            </Button>
            {inv.remainingAmount > 0 && inv.status !== "cancelled" && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => setPayInv(inv)} title="Catat Pembayaran">
                <CreditCard className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
              </Button>
            )}
            {(inv.status === "draft" || inv.status === "sent") && inv.paidAmount === 0 && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(inv)} title="Edit">
                <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
              </Button>
            )}
            {inv.paidAmount === 0 && (
              <Button variant="ghost" size="sm" className="px-2" onClick={() => setDelId(inv.id)} title="Hapus">
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [openEdit]);

  // Form calculations for display
  const formSubtotal = form.items.reduce((s, i) => s + (i.qty * i.unitPrice * (i.rentalDays || 1)), 0);
  const formTaxAmount = Math.round(((formSubtotal - form.discount) * form.tax) / 100);
  const formTotal = formSubtotal - form.discount + formTaxAmount + (form.transportFee || 0) + (form.depositFee || 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Invoice & Penagihan"
        description="Kelola tagihan, piutang, dan penerimaan pembayaran pelanggan"
        action={<Button leftIcon={Plus} onClick={openCreate}>Buat Invoice</Button>}
      />

      <StatsRow stats={[
        { label: "Total Invoice", value: invoices.length, icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Total Piutang", value: formatRupiah(totalReceivables), icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        { label: "Overdue", value: overdueCount, icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-500" },
        { label: "Penerimaan Bulan Ini", value: formatRupiah(paidThisMonth), icon: CreditCard, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      ]} />

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-gray-100/80 rounded-xl p-1 w-fit flex-wrap">
          {(["all", "draft", "sent", "partial", "paid", "overdue"] as const).map((s) => {
            const labels: Record<string, string> = { all: "Semua", draft: "Draft", sent: "Dikirim", partial: "Sebagian", paid: "Lunas", overdue: "Overdue" };
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari nomor, pelanggan, proyek..." />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />

      {/* ─── Detail Modal ─── */}
      {viewInv && <Suspense fallback={null}><InvoiceDetailModal invoice={viewInv} payments={payments} onClose={() => setViewInv(null)} onAddPayment={() => { setPayInv(viewInv); setViewInv(null); }} /></Suspense>}

      {/* ─── Payment Modal ─── */}
      {payInv && <Suspense fallback={null}><PaymentModal invoice={payInv} onClose={() => setPayInv(null)} onSubmit={(p) => { addPayment(p); setPayInv(null); }} /></Suspense>}

      {/* ─── Form Modal ─── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? "Edit Invoice" : "Buat Invoice"} size="xl">
        <form id="inv-form" onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer & Project */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-3">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Informasi Pelanggan</p>
              <SearchSelect label="Pelanggan" required placeholder="Pilih pelanggan..."
                value={form.customerId}
                onChange={val => {
                  const cust = customers.find(c => c.id === val);
                  setForm(f => ({ ...f, customerId: val, customerName: cust?.name || "", projectId: "", projectName: "", customerAddress: cust?.address || "" }));
                }}
                options={customerOptions} />
              {projectOptions.length > 0 && (
                <Select label="Proyek (Opsional)" placeholder="Pilih proyek..." value={form.projectId}
                  onChange={val => {
                    const proj = selectedCustomer?.projects.find(p => p.id === val);
                    setForm(f => ({ ...f, projectId: val, projectName: proj?.name || "" }));
                  }}
                  options={[{ value: "", label: "— Tanpa Proyek —" }, ...projectOptions]} />
              )}
              <TextInput label="Alamat (Otomatis)" disabled value={form.customerAddress} />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <TextInput label="UP / PIC" placeholder="Contoh: Bp. Fendi" value={form.upName} onChange={e => setForm(f => ({ ...f, upName: e.target.value }))} />
                <TextInput label="Telp / Fax" placeholder="0812-..." value={form.upPhone} onChange={e => setForm(f => ({ ...f, upPhone: e.target.value }))} />
              </div>
            </div>

            {/* Dates & Status */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-3">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Detail Invoice & Cetak</p>
              <TextInput label="Deskripsi Ringkasan Tagihan" required placeholder="Contoh: Sewa Scaffolding Bulan April 2026"
                value={form.summaryDescription} onChange={e => setForm(f => ({ ...f, summaryDescription: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <DatePicker label="Tanggal Invoice" required value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
                <DatePicker label="Jatuh Tempo" required value={form.dueDate} onChange={val => setForm(f => ({ ...f, dueDate: val }))} />
              </div>

              <div className="pt-2 border-t border-gray-200 mt-1 mb-1"></div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput label="PO No." placeholder="Opsional" value={form.poNumber} onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))} />
                <TextInput label="Tagihan Ke" placeholder="Contoh: Sewa ke 01" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))} />
              </div>

              <div className="pt-2 border-t border-gray-200 mt-1 mb-1"></div>

              <Select label="Status Awal" value={form.status}
                onChange={val => setForm(f => ({ ...f, status: val as InvoiceStatus }))}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Terkirim" },
                ]} />
            </div>
          </div>

          {/* ─── Totals ─── */}
          <div className="flex flex-col sm:flex-row gap-6 justify-end pt-4 border-t border-gray-100">
            <div className="w-full sm:w-72 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-700 font-semibold">Subtotal Biaya Sewa (Rp)</span>
                <input required type="number" min={0} value={form.subtotal || ""}
                  placeholder="0"
                  onChange={e => setForm(f => ({ ...f, subtotal: Number(e.target.value) }))}
                  className="w-36 px-3 py-1.5 rounded-lg border border-gray-300 text-[13px] text-right font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-medium">Transport PP (Rp)</span>
                <input type="number" min={0} value={form.transportFee || ""} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, transportFee: Number(e.target.value) }))}
                  className="w-36 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] text-right font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-medium">Jaminan (Rp)</span>
                <input type="number" min={0} value={form.depositFee || ""} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, depositFee: Number(e.target.value) }))}
                  className="w-36 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] text-right font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-medium">Diskon (Rp)</span>
                <input type="number" min={0} value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                  className="w-36 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] text-right text-emerald-600 font-semibold outline-none focus:border-emerald-400" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-gray-500 font-medium">PPN (%)</span>
                <div className="flex items-center gap-2">
                  <Select value={String(form.tax)} onChange={val => setForm(f => ({ ...f, tax: Number(val) }))}
                    options={[{ value: "0", label: "0%" }, { value: "11", label: "11%" }]} />
                  <span className="text-[13px] font-semibold text-gray-900 w-24 text-right">
                    {formatRupiah(Math.round(((form.subtotal - form.discount) * form.tax) / 100))}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-[14px] font-bold text-gray-900">Total Tagihan</span>
                <span className="text-[16px] font-bold text-blue-600">
                  {formatRupiah(
                    form.subtotal
                    - form.discount
                    + Math.round(((form.subtotal - form.discount) * form.tax) / 100)
                    + (form.transportFee || 0)
                    + (form.depositFee || 0)
                  )}
                </span>
              </div>
            </div>
          </div>


          <Textarea label="Catatan Tambahan" rows={2} placeholder="Misal: Pembayaran ditransfer ke rekening BCA 123456789 a/n Perusahaan"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </form>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
          <Button type="submit" form="inv-form">{editingId ? "Simpan Perubahan" : "Buat Invoice"}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)}
        onConfirm={() => { if (delId) deleteInvoice(delId); setDelId(null); }}
        title="Hapus Invoice?"
        description="Invoice beserta data pembayaran yang terkait akan dihapus permanen."
        confirmLabel="Hapus" variant="danger" />
    </div>
  );
}
