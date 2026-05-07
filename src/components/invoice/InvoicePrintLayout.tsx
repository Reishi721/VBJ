import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Invoice } from "../../types";
import { useCompanySettings, useBanks } from "../../hooks/useSettings";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Props {
  invoice: Invoice;
}

const formatRupiahPrint = (val: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// Helper durasi
const isWholeMonths = (days: number) => days > 0 && days % 30 === 0;
const formatDuration = (days?: number) => {
  if (!days) return "";
  return isWholeMonths(days) ? `${days / 30} Bln` : `${days} Hari`;
};
const formatPriceUnit = (days?: number) => {
  if (!days) return "/ hari";
  return isWholeMonths(days) ? "/ bln" : "/ hari";
};

const terbilang = (angka: number): string => {
  const bilangan = [
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"
  ];
  let temp = "";
  if (angka < 12) {
    temp = " " + bilangan[angka];
  } else if (angka < 20) {
    temp = terbilang(angka - 10) + " belas";
  } else if (angka < 100) {
    temp = terbilang(Math.floor(angka / 10)) + " puluh" + terbilang(angka % 10);
  } else if (angka < 200) {
    temp = " seratus" + terbilang(angka - 100);
  } else if (angka < 1000) {
    temp = terbilang(Math.floor(angka / 100)) + " ratus" + terbilang(angka % 100);
  } else if (angka < 2000) {
    temp = " seribu" + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    temp = terbilang(Math.floor(angka / 1000)) + " ribu" + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    temp = terbilang(Math.floor(angka / 1000000)) + " juta" + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    temp = terbilang(Math.floor(angka / 1000000000)) + " milyar" + terbilang(angka % 1000000000);
  }
  return temp;
};

const InvoicePrintLayout = forwardRef<HTMLDivElement, Props>(({ invoice }, ref) => {
  const { data: settingsData } = useCompanySettings();
  const { data: banks = [] } = useBanks();
  const company = settingsData?.company || { name: "", addressLine1: "", addressLine2: "", phone: "", fax: "" };
  const invSettings = settingsData?.invoice || { remarks: "", managerName: "", managerTitle: "" };

  const formattedDate = format(new Date(invoice.date), "dd MMMM yyyy", { locale: id });
  const useDateStart = format(new Date(invoice.date), "dd MMMM yyyy", { locale: id });
  const useDateEnd = format(new Date(invoice.dueDate), "dd MMMM yyyy", { locale: id });
  const defaultBank = banks[0];

  const [printRoot, setPrintRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPrintRoot(document.getElementById("print-root"));
  }, []);

  if (!printRoot) return null;

  return createPortal(
    <div ref={ref} style={{ fontFamily: "Arial, sans-serif" }} className="hidden print:block w-full bg-white text-black text-[12px] leading-tight p-8">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ fontFamily: '"Times New Roman", Times, serif' }} className="flex items-start gap-4 mb-2">
        {/* Logo box */}
        <div className="w-[100px] h-[100px] border-2 border-black p-1 flex flex-col items-center justify-center shrink-0">

          {company.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="text-[60px] font-bold text-red-600 leading-none">V</div>
          )}
        </div>

        {/* Company Info */}


        <div className="mt-1">
          <h1 className="text-[25px] font-black  font-bold text-blue-800 uppercase tracking-wide">{company.name}</h1>
          <h2 className="text-[18px] font-bold uppercase ">{company.tagline}</h2>
          <p>{company.addressLine1}</p>
          <p>Telp : {company.phone}</p>
          <p>Fax : {company.fax}</p>
          <p>{company.addressLine2}</p>
        </div>
      </div>


      <div className="border-t-2 border-black w-full mb-4"></div>

      {/* ─── INFO SECTION ────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-4">
        {/* TO block */}
        <div className="w-[45%] border-2 border-black p-2 min-h-[120px]">
          <p className="font-bold mb-1">TO :</p>
          <p>{invoice.customerName}</p>
          <p>{invoice.customerAddress}</p>

          <table className="mt-2 w-full text-[12px]">
            <tbody>
              <tr>
                <td className="w-16 align-top">Proyek</td>
                <td className="w-4 align-top">:</td>
                <td className="align-top">{invoice.projectName || "—"}</td>
              </tr>
              <tr>
                <td className="align-top">Up</td>
                <td className="align-top">:</td>
                <td className="align-top">{invoice.upName || "—"}</td>
              </tr>
              <tr>
                <td className="align-top">Tel/Fax</td>
                <td className="align-top">:</td>
                <td className="align-top">{invoice.upPhone || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Invoice Info */}
        <div className="w-[50%]">
          <p className="text-left">Batam, {formattedDate}</p>
          <h2 style={{ fontFamily: '"Times New Roman", Times, serif' }} className="text-6xl font-black text-left text-gray-800 drop-shadow-sm">
            INVOICE
          </h2>
          <table className="w-full text-[12px]">
            <tbody>
              <tr>
                <td className="w-24">Invoice No.</td>
                <td className="w-4">:</td>
                <td>{invoice.number}</td>
              </tr>
              <tr>
                <td>Use Date</td>
                <td>:</td>
                <td>{useDateStart} - {useDateEnd}</td>
              </tr>
              <tr>
                <td>PO. No</td>
                <td>:</td>
                <td>{invoice.poNumber || "—"}</td>
              </tr>
              <tr><td colSpan={3} className="h-4"></td></tr>
              <tr>
                <td>Tagihan Ke</td>
                <td>:</td>
                <td>{invoice.billingCycle || "—"}</td>
                <td className="text-right font-bold text-[10px]">IDR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── TABLE ───────────────────────────────────────────────────────── */}
      <table className="w-full border-collapse border-2 border-black mb-1">
        <thead>
          <tr className="border-b-2 border-black text-center font-bold">
            <th className="border-r-2 border-black py-1 w-[45%]">DESCRIPTION</th>
            <th className="border-r-2 border-black py-1 w-[15%]">QUANTITY</th>
            <th className="border-r-2 border-black py-1 w-[20%]">UNIT PRICE</th>
            <th className="py-1 w-[20%]">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr className="min-h-[100px] align-top">
            <td className="border-r-2 border-black p-2 h-[80px]">
              {invoice.summaryDescription}
            </td>
            <td className="border-r-2 border-black p-2 text-center">Terlampir</td>
            <td className="border-r-2 border-black p-2 text-center">Terlampir</td>
            <td className="p-2 text-right">{formatRupiahPrint(invoice.total)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer Table */}
      <div className="flex justify-between items-center mb-6 text-[12px]">
        <p className="italic"><span className="font-bold">Kode Langganan :</span> {invoice.customerName}</p>
        <div className="flex w-[40%] border-2 border-black">
          <div className="w-1/2 p-1 font-bold text-center border-r-2 border-black">TOTAL :</div>
          <div className="w-1/2 p-1 font-bold text-right">{formatRupiahPrint(invoice.total)}</div>
        </div>
      </div>

      {/* ─── REMARKS ─────────────────────────────────────────────────────── */}
      <div className="border border-black mb-2">
        <div className="bg-gray-100 font-bold px-2 py-0.5 border-b border-black">REMARKS :</div>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className="w-[60%] text-[11px] whitespace-pre-line leading-snug">
          {invSettings.remarks}

          <div className="mt-4 italic font-bold">
            <p>Our Bank Account :</p>
            {defaultBank ? (
              <>
                <p>{defaultBank.bankName}</p>
                <p>A/C. {defaultBank.accountNumber}</p>
                <p>{defaultBank.accountName}</p>
              </>
            ) : (
              <p>—</p>
            )}
          </div>
        </div>
        <div className="w-[30%] flex flex-col items-center justify-end h-[100px]">
          <p>{company.name}</p>
          <div className="mt-auto border-t border-black w-full text-center pt-1 font-bold">
            {invSettings.managerTitle}
          </div>
        </div>
      </div>

      {/* ─── CUT HERE ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 my-6 font-bold italic">
        <span>Cut Here &gt;&gt;</span>
        <div className="border-b border-dotted border-black flex-1 mt-1"></div>
      </div>

      {/* ─── PAYABLE VOUCHER ─────────────────────────────────────────────── */}
      <div>
        <h3 className="font-bold mb-2">PAYABLE VOUCHER</h3>
        <table className="mb-4">
          <tbody>
            <tr>
              <td className="w-24">To</td>
              <td className="w-4">:</td>
              <td className="font-bold">{company.name}</td>
            </tr>
            <tr>
              <td>Total Amount</td>
              <td>:</td>
              <td className="font-bold border-b border-blue-600 w-64 pb-1">
                {formatRupiahPrint(invoice.total)}
              </td>
            </tr>
            <tr>
              <td>Terbilang</td>
              <td>:</td>
              <td className="italic border-b border-blue-600 pb-1">
                {terbilang(invoice.total).trim()} Rupiah
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8">
          <div className="w-64">
            <p className="text-left">Acknowledge/Approved By,</p>
            <div className="h-20"></div> {/* Spacer for signature */}
            <p className="text-center font-bold">{invoice.customerName}</p>
            <div className="border-b border-blue-600 mt-1"></div>
            <p className="text-center text-[10px] mt-1">Authorized Signature</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE BREAK for RINCIAN ──────────────────────────────────────── */}
      <div style={{ pageBreakBefore: "always" }} className="pt-8 w-full bg-white text-black">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-[20px] font-bold">{company.name}</h1>
            <table className="mt-2 text-[13px]">
              <tbody>
                <tr>
                  <td className="w-20">Pemilik</td>
                  <td className="w-4">:</td>
                  <td>{company.name}</td>
                </tr>
                <tr>
                  <td>Penyewa</td>
                  <td>:</td>
                  <td>{invoice.customerName}</td>
                </tr>
                <tr>
                  <td>Lokasi</td>
                  <td>:</td>
                  <td>{invoice.projectName || invoice.customerAddress || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h1 className="text-[22px] font-bold uppercase underline tracking-wide">RINCIAN SEWA SCAFFOLDING</h1>
            <table className="mt-2 text-[13px] ml-auto">
              <tbody>
                <tr>
                  <td className="w-28">No Invoice</td>
                  <td className="w-4 text-center">:</td>
                  <td className="font-bold text-left">{invoice.number}</td>
                </tr>
                <tr>
                  <td>Tagihan ke</td>
                  <td className="text-center">:</td>
                  <td className="font-bold text-left">{invoice.billingCycle || "1"}</td>
                </tr>
                <tr>
                  <td>Periode tagihan</td>
                  <td className="text-center">:</td>
                  <td className="text-left">{invoice.billingCycle === "1" ? "Sewa Baru" : "Perpanjangan"}</td>
                </tr>
                <tr>
                  <td>Tanggal Invoice</td>
                  <td className="text-center">:</td>
                  <td className="text-left">{format(new Date(invoice.date), "dd-MMM-yy", { locale: id })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="text-[14px] font-bold uppercase underline mb-2">RINCIAN BIAYA PENYEWAAN</h2>

        <table className="w-full border-collapse border border-black text-[12px]">
          <thead className="table-header-group">
            <tr className="text-center font-bold bg-white">
              <td rowSpan={2} className="border border-black p-1">No</td>
              <td rowSpan={2} className="border border-black p-1">Uraian</td>
              <td rowSpan={2} className="border border-black p-1">No Surat<br />Jalan<br />Pengiriman</td>
              <td colSpan={2} className="border border-black p-1">Periode Sewa</td>
              <td rowSpan={2} className="border border-black p-1">Jumlah</td>
              <td rowSpan={2} className="border border-black p-1">Total<br />Lama<br />Sewa</td>
              <td rowSpan={2} className="border border-black p-1">Harga<br />Sewa<br />(Rp.)</td>
              <td rowSpan={2} className="border border-black p-1">Total<br />Harga<br />(Rp.)</td>
            </tr>
            <tr className="text-center font-bold bg-white">
              <td className="border border-black p-1">Mulai</td>
              <td className="border border-black p-1">Selesai</td>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const isMonths = item.rentalDays && item.rentalDays % 30 === 0;
              const lamaSewaDisplay = item.rentalDays
                ? isMonths ? item.rentalDays / 30 : item.rentalDays
                : "";
              return (
                <tr key={idx}>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>{idx + 1}</td>
                  <td className="p-1 align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>{item.description}</td>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>{format(new Date(invoice.date), "dd-MMM-yyyy", { locale: id })}</td>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>{format(new Date(invoice.dueDate), "dd-MMM-yyyy", { locale: id })}</td>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>{item.qty ? `${item.qty.toLocaleString("id-ID", { minimumFractionDigits: 1 })} ${item.unit}` : ""}</td>
                  <td className="p-1 text-center align-top font-semibold" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>
                    {lamaSewaDisplay}
                  </td>
                  <td className="p-1 text-center align-top" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>
                    {item.unitPrice ? `${new Intl.NumberFormat("id-ID").format(item.unitPrice)} ${formatPriceUnit(item.rentalDays)}` : ""}
                  </td>
                  <td className="p-1 text-right align-top" style={{ borderBottom: '1px dotted black' }}>{formatRupiahPrint(item.subtotal)}</td>
                </tr>
              );
            })}
            {Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map((_, i) => (
              <tr key={`pad-${i}`}>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}>&nbsp;</td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderRight: '1px solid black', borderBottom: '1px dotted black' }}></td>
                 <td className="p-1" style={{ borderBottom: '1px dotted black' }}></td>
              </tr>
            ))}
            {/* ── Transport PP di dalam tabel ── */}
            {(invoice.transportFee || 0) > 0 && (
              <tr style={{ borderTop: '1.5px solid black' }}>
                <td colSpan={7} className="p-1 text-right font-bold" style={{ borderRight: '1px solid black' }}>Transport PP :</td>
                <td className="p-1 text-center" style={{ borderRight: '1px solid black' }}>Rp</td>
                <td className="p-1 text-right font-semibold italic">{formatRupiahPrint(invoice.transportFee || 0)}</td>
              </tr>
            )}
            {/* ── Jaminan di dalam tabel ── */}
            {(invoice.depositFee || 0) > 0 && (
              <tr>
                <td colSpan={7} className="p-1 text-right font-bold" style={{ borderRight: '1px solid black' }}>Jaminan :</td>
                <td className="p-1 text-center" style={{ borderRight: '1px solid black' }}>Rp</td>
                <td className="p-1 text-right font-semibold italic">{formatRupiahPrint(invoice.depositFee || 0)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end mt-2 text-[12px]">
          <table className="w-[350px]">
            <tbody>
              <tr>
                <td className="text-right py-1">Total Biaya Penyewaan :</td>
                <td className="w-8 text-center">Rp</td>
                <td className="text-right italic">{formatRupiahPrint(invoice.subtotal)}</td>
              </tr>
              {invoice.discount > 0 && (
                <tr>
                  <td className="text-right py-1">Diskon :</td>
                  <td className="w-8 text-center">Rp</td>
                  <td className="text-right italic">({formatRupiahPrint(invoice.discount)})</td>
                </tr>
              )}
              {invoice.tax > 0 && (
                <tr>
                  <td className="text-right py-1">PPN {invoice.tax}% :</td>
                  <td className="w-8 text-center">Rp</td>
                  <td className="text-right italic">{formatRupiahPrint(invoice.taxAmount)}</td>
                </tr>
              )}
              <tr>
                <td className="text-right py-1">Total Tagihan :</td>
                <td className="w-8 text-center">Rp</td>
                <td className="text-right italic">{formatRupiahPrint(invoice.total)}</td>
              </tr>
              <tr>
                <td className="text-right py-1">Dibulatkan :</td>
                <td className="w-8 text-center">Rp</td>
                <td className="text-right font-bold italic">{formatRupiahPrint(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-[1.5px] border-black p-2 mt-4 text-[13px] font-bold flex gap-2 w-full">
          <span className="w-24">Terbilang :</span>
          <span className="italic">{terbilang(invoice.total).trim()} Rupiah</span>
        </div>
      </div>

    </div>,
    printRoot
  );
});

InvoicePrintLayout.displayName = "InvoicePrintLayout";
export default InvoicePrintLayout;
