import { useState } from "react";
import type { Invoice, Payment } from "../../types";
import { Modal, Button } from "../ui";
import { formatRupiah, InvoiceStatusBadge, PaymentProgress } from "./InvoiceHelpers";
import { FileText, MapPin, CreditCard, Building2, Printer, FileSpreadsheet } from "lucide-react";
import InvoicePrintLayout from "./InvoicePrintLayout";

// Helper: format durasi sewa (kelipatan 30 → tampil bulan)
const isWholeMonths = (days: number) => days > 0 && days % 30 === 0;
const formatDuration = (days?: number) => {
  if (!days) return "—";
  return isWholeMonths(days) ? `${days / 30} bln` : `${days} hari`;
};
const priceUnitLabel = (days?: number) => {
  if (!days) return "";
  return isWholeMonths(days) ? "/bln" : "/hari";
};

interface Props { invoice: Invoice; payments: Payment[]; onClose: () => void; onAddPayment: () => void; }

export default function InvoiceDetailModal({ invoice: inv, payments, onClose, onAddPayment }: Props) {
  const invPayments = payments.filter(p => p.invoiceId === inv.id);

  return (
    <>
      <Modal open onClose={onClose} title={inv.number} size="xl"
        description={`Tanggal: ${inv.date}`}>
        <div className="space-y-5">

          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <InvoiceStatusBadge status={inv.status} />
            <span className="text-[12px] text-gray-400">Jatuh tempo: <span className="font-semibold text-gray-700">{inv.dueDate}</span></span>
          </div>

          {/* Customer + Project */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pelanggan</p>
                <p className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" />{inv.customerName}</p>
                {inv.customerAddress && <p className="text-[11px] text-gray-500 flex items-start gap-1.5 mt-0.5"><MapPin className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />{inv.customerAddress}</p>}
              </div>
            </div>
            <div>
              {inv.projectName && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Proyek</p>
                  <p className="text-[13px] font-semibold text-gray-900">{inv.projectName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rincian Tagihan</p>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase">Deskripsi</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-semibold text-gray-900">{inv.summaryDescription}</p>
                    </td>
                    <td className="px-4 py-4 text-right text-[13px] font-semibold text-gray-900">{formatRupiah(inv.subtotal)}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50/50">
                  <tr><td className="px-4 py-1.5 text-right text-[12px] text-gray-500">Subtotal</td><td className="px-4 py-1.5 text-right text-[13px] font-semibold">{formatRupiah(inv.subtotal)}</td></tr>
                  {(inv.transportFee || 0) > 0 && <tr><td className="px-4 py-1.5 text-right text-[12px] text-gray-500">Transport PP</td><td className="px-4 py-1.5 text-right text-[13px] font-semibold">{formatRupiah(inv.transportFee || 0)}</td></tr>}
                  {(inv.depositFee || 0) > 0 && <tr><td className="px-4 py-1.5 text-right text-[12px] text-gray-500">Jaminan</td><td className="px-4 py-1.5 text-right text-[13px] font-semibold">{formatRupiah(inv.depositFee || 0)}</td></tr>}
                  {inv.discount > 0 && <tr><td className="px-4 py-1.5 text-right text-[12px] text-emerald-600">Diskon</td><td className="px-4 py-1.5 text-right text-[13px] font-semibold text-emerald-600">- {formatRupiah(inv.discount)}</td></tr>}
                  {inv.tax > 0 && <tr><td className="px-4 py-1.5 text-right text-[12px] text-gray-500">PPN {inv.tax}%</td><td className="px-4 py-1.5 text-right text-[13px] font-semibold">{formatRupiah(inv.taxAmount)}</td></tr>}
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-3 text-right text-[13px] font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-right text-[15px] font-bold text-gray-900">{formatRupiah(inv.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment summary */}
          <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Pembayaran</p>
            <PaymentProgress paid={inv.paidAmount} total={inv.total} />
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Total</p>
                <p className="text-[13px] font-bold text-gray-900 mt-0.5">{formatRupiah(inv.total)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">Dibayar</p>
                <p className="text-[13px] font-bold text-emerald-700 mt-0.5">{formatRupiah(inv.paidAmount)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-[10px] font-semibold text-red-500 uppercase">Sisa</p>
                <p className="text-[13px] font-bold text-red-600 mt-0.5">{formatRupiah(inv.remainingAmount)}</p>
              </div>
            </div>

            {/* Payment history */}
            {invPayments.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Riwayat Pembayaran</p>
                {invPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-[12px]">
                    <span className="text-gray-500">{p.date} · {p.method === "transfer" ? "Transfer" : p.method === "cash" ? "Tunai" : "Cek"}</span>
                    {p.reference && <span className="font-mono text-gray-400">{p.reference}</span>}
                    <span className="font-bold text-emerald-700">{formatRupiah(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {inv.notes && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Catatan</p>
              <p className="text-[13px] text-amber-900">{inv.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="ghost" size="sm" leftIcon={Printer} onClick={() => { requestAnimationFrame(() => requestAnimationFrame(() => window.print())); }}>Cetak</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            {inv.remainingAmount > 0 && (
              <Button leftIcon={CreditCard} onClick={onAddPayment}>Catat Pembayaran</Button>
            )}
          </div>
        </div>
      </Modal>
      <InvoicePrintLayout invoice={inv} />
    </>
  );
}
