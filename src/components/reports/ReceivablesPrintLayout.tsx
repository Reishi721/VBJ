import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { useCompanySettings } from "../../hooks/useSettings";
import { format } from "date-fns";
import { id } from "date-fns/locale";


interface ReceivablesGroup {
  key: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  totalInvoice: number;
  totalPaid: number;
  totalRemaining: number;
  invoiceCount: number;
}

interface Props {
  data: ReceivablesGroup[];
}

const ReceivablesPrintLayout = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const { data: settingsData } = useCompanySettings();
  const company = settingsData?.company || { name: "", tagline: "", logoUrl: "" };
  const currentDate = format(new Date(), "dd MMMM yyyy", { locale: id });

  const grandTotalRemaining = data.reduce((sum, g) => sum + g.totalRemaining, 0);
  const grandTotalInvoice = data.reduce((sum, g) => sum + g.totalInvoice, 0);
  const grandTotalPaid = data.reduce((sum, g) => sum + g.totalPaid, 0);

  const printRoot = document.getElementById("print-root") || document.body;

  return createPortal(
    <div ref={ref} style={{ fontFamily: "Arial, sans-serif" }} className="hidden print:block w-full bg-white text-black p-8 text-[12px]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2 pb-3 border-b-2 border-gray-800">
        {company.logoUrl && (
          <img src={company.logoUrl} alt="Logo" className="h-14 w-14 object-contain" />
        )}
        <div>
          <div className="text-[18px] font-bold uppercase">{company.name || "PERUSAHAAN"}</div>
          {company.tagline && <div className="text-[11px] text-gray-600">{company.tagline}</div>}
        </div>
      </div>

      <div className="text-center font-bold text-[16px] uppercase underline mb-1 mt-4">
        LAPORAN PIUTANG PELANGGAN
      </div>
      <div className="text-center text-[12px] text-gray-600 mb-4">
        Daftar Saldo Hutang (Detail)
      </div>

      <div className="flex justify-between items-end mb-4">
        <div>
          <p>Tanggal Cetak : {currentDate}</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[12px]">
        <thead>
          <tr className="bg-gray-100 font-bold text-center">
            <td className="border border-black p-2 w-8">No</td>
            <td className="border border-black p-2">Nama Pelanggan</td>
            <td className="border border-black p-2">Proyek</td>
            <td className="border border-black p-2 w-16">Jml Inv</td>
            <td className="border border-black p-2 w-32">Total Tagihan (Rp)</td>
            <td className="border border-black p-2 w-32">Telah Dibayar (Rp)</td>
            <td className="border border-black p-2 w-32">Sisa Piutang (Rp)</td>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-black p-4 text-center italic">
                Tidak ada data piutang.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.key}>
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5">{row.customerName}</td>
                <td className="border border-black p-1.5">{row.projectId ? row.projectName : "—"}</td>
                <td className="border border-black p-1.5 text-center">{row.invoiceCount}</td>
                <td className="border border-black p-1.5 text-right">{new Intl.NumberFormat("id-ID").format(row.totalInvoice)}</td>
                <td className="border border-black p-1.5 text-right">{new Intl.NumberFormat("id-ID").format(row.totalPaid)}</td>
                <td className="border border-black p-1.5 text-right font-bold text-red-700">{new Intl.NumberFormat("id-ID").format(row.totalRemaining)}</td>
              </tr>
            ))
          )}
          {data.length > 0 && (
            <tr className="font-bold bg-gray-100">
              <td colSpan={4} className="border border-black p-2 text-right">TOTAL KESELURUHAN</td>
              <td className="border border-black p-2 text-right">{new Intl.NumberFormat("id-ID").format(grandTotalInvoice)}</td>
              <td className="border border-black p-2 text-right">{new Intl.NumberFormat("id-ID").format(grandTotalPaid)}</td>
              <td className="border border-black p-2 text-right text-red-700">{new Intl.NumberFormat("id-ID").format(grandTotalRemaining)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8 flex justify-between items-end">
        <div className="text-[11px] text-gray-500">
          {currentDate}
        </div>
        <div className="w-48 text-center">
          <p className="mb-16">Mengetahui,</p>
          <div className="border-b border-black"></div>
          <p className="mt-1">Admin / Keuangan</p>
        </div>
      </div>
    </div>,
    printRoot
  );
});

ReceivablesPrintLayout.displayName = "ReceivablesPrintLayout";
export default ReceivablesPrintLayout;
