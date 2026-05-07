import { useState } from "react";
import type { Invoice, Payment } from "../../types";
import { Modal, Button, TextInput, Select, Textarea, DatePicker } from "../ui";
import { formatRupiah } from "./InvoiceHelpers";

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (payment: Omit<Payment, "id" | "createdAt">) => void;
}

export default function PaymentModal({ invoice, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    amount: invoice.remainingAmount,
    method: "transfer" as Payment["method"],
    date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return alert("Jumlah pembayaran harus lebih dari 0.");
    if (form.amount > invoice.remainingAmount) return alert("Jumlah pembayaran melebihi sisa tagihan.");

    onSubmit({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      ...form,
    });
  };

  return (
    <Modal open onClose={onClose} title="Catat Pembayaran" size="sm" description={`Invoice: ${invoice.number}`}>
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Info Box */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-2 text-[12px]">
            <span className="text-gray-500">Total Tagihan</span>
            <span className="font-semibold text-gray-900">{formatRupiah(invoice.total)}</span>
          </div>
          <div className="flex justify-between items-center mb-2 text-[12px]">
            <span className="text-gray-500">Sudah Dibayar</span>
            <span className="font-semibold text-emerald-600">{formatRupiah(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-[13px] font-bold text-gray-700">Sisa Tagihan</span>
            <span className="text-[14px] font-bold text-red-600">{formatRupiah(invoice.remainingAmount)}</span>
          </div>
        </div>

        <TextInput
          label="Jumlah Pembayaran (Rp)"
          type="number"
          required
          min={1}
          max={invoice.remainingAmount}
          value={String(form.amount)}
          onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Metode"
            required
            value={form.method}
            onChange={(val) => setForm({ ...form, method: val as Payment["method"] })}
            options={[
              { value: "transfer", label: "Transfer Bank" },
              { value: "cash", label: "Tunai" },
              { value: "check", label: "Cek / Giro" },
            ]}
          />
          <DatePicker
            label="Tanggal"
            required
            value={form.date}
            onChange={(val) => setForm({ ...form, date: val })}
          />
        </div>

        <TextInput
          label="Nomor Referensi"
          placeholder="Contoh: TF/BCA/001"
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
          hint="Opsional. Nomor referensi transfer atau cek."
        />

        <Textarea
          label="Catatan"
          rows={2}
          placeholder="Catatan tambahan (opsional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </form>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" form="payment-form">Simpan Pembayaran</Button>
      </div>
    </Modal>
  );
}
