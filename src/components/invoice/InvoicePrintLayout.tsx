import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Invoice } from "../../types";
import { useCompanySettings, useBanks } from "../../hooks/useSettings";
import { useCustomers } from "../../hooks/useCustomers";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Props {
  invoice: Invoice;
}

const formatRupiahPrint = (val: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const terbilang = (angka: number): string => {
  if (angka < 0) return "minus" + terbilang(-angka);
  angka = Math.floor(angka);
  if (angka === 0) return " nol";
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
  const { data: customers = [] } = useCustomers();

  const company = settingsData?.company || { name: "", tagline: "", addressLine1: "", addressLine2: "", phone: "", fax: "", logoUrl: "" };
  const invSettings = settingsData?.invoice || { remarks: "", managerName: "", managerTitle: "" };

  const customer = useMemo(() => customers.find(c => c.id === invoice.customerId), [customers, invoice.customerId]);
  const project = useMemo(() => customer?.projects?.find(p => p.id === invoice.projectId), [customer, invoice.projectId]);

  // printDate di-map dari created_at di useInvoices → diubah via input "Tanggal Cetak"
  const formattedDate = format(new Date(invoice.printDate || invoice.date), "dd MMMM yyyy", { locale: id });
  const useDateStart = format(new Date(invoice.date), "dd MMMM yyyy", { locale: id });
  const useDateEnd = format(new Date(invoice.dueDate), "dd MMMM yyyy", { locale: id });
  const defaultBank = banks[0];

  const printRoot = useMemo(() => document.getElementById("print-root"), []);

  if (!printRoot) return null;

  return createPortal(
    <div ref={ref} style={{ fontFamily: "Arial, sans-serif" }} className="hidden print:block w-full bg-white text-black text-[12px] mt-1 leading-tight pl-4 pr-8 pt-1 pb-8">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ fontFamily: '"Times New Roman", Times, serif' }} className="flex items-stretch gap-4 mb-2">
        {/* Logo box — stretches to match kop surat height */}
        <div className="w-[100px] shrink-0 flex items-center justify-center">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="text-[60px] font-bold text-red-600 leading-none">V</div>
          )}
        </div>

        {/* Company Info */}
        <div className="flex flex-col justify-center">
          <h1 style={{ fontFamily: '"Rockwell Extra Bold", Rockwell, serif' }} className="text-[25px] font-black font-bold uppercase tracking-wide">{company.name}</h1>
          <h2 className="text-[18px] font-bold uppercase">{company.tagline}</h2>
          <p>{company.addressLine1}</p>
          <p>Telp : {company.phone}</p>
          <p>Fax : {company.fax}</p>
          <p>{company.addressLine2}</p>
        </div>
      </div>


      <div className="border-t-[3px] border-[#C0C0C0] w-full mb-4"></div>

      {/* ─── INFO SECTION ────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-4">
        {/* TO block */}
        <div className="w-[45%] border-[2px] border-black p-2 min-h-[120px]">
          <p className="font-bold mb-1">TO :</p>
          <p>{invoice.customerName}</p>
          <p>{invoice.customerAddress}</p>

          <table className="mt-2 w-full text-[12px]">
            <tbody>
              <tr>
                <td className="w-16 align-top">Proyek</td>
                <td className="w-4 align-top">:</td>
                <td className="align-top">{project?.location || invoice.projectName || "—"}</td>
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
      <table className="w-full border-collapse border border-black mb-1">
        <thead>
          <tr className="border-b border-black text-center font-bold">
            <th className="border-r border-black py-1 w-[45%]">DESCRIPTION</th>
            <th className="border-r border-black py-1 w-[15%]">QUANTITY</th>
            <th className="border-r border-black py-1 w-[20%]">UNIT PRICE</th>
            <th className="py-1 w-[20%]">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {/* ── Main description row ── */}
          <tr className="align-top">
            <td className="border-r border-black p-2">
              {invoice.summaryDescription}
            </td>
            <td className="border-r border-black p-2 text-center">Terlampir</td>
            <td className="border-r border-black p-2 text-center">Terlampir</td>
            <td className="p-2 text-right">{formatRupiahPrint(invoice.subtotal)}</td>
          </tr>

          {/* ── Jaminan ── */}
          {(invoice.depositFee || 0) > 0 && (
            <tr className="align-top">
              <td className="border-r border-black p-2">Jaminan</td>
              <td className="border-r border-black p-2"></td>
              <td className="border-r border-black p-2"></td>
              <td className="p-2 text-right">{formatRupiahPrint(invoice.depositFee || 0)}</td>
            </tr>
          )}

          {/* ── Transport PP ── */}
          {(invoice.transportFee || 0) > 0 && (
            <tr className="align-top">
              <td className="border-r border-black p-2">Transport PP</td>
              <td className="border-r border-black p-2"></td>
              <td className="border-r border-black p-2"></td>
              <td className="p-2 text-right">{formatRupiahPrint(invoice.transportFee || 0)}</td>
            </tr>
          )}

          {/* ── PPN ── */}
          {invoice.tax > 0 && (
            <tr className="align-top">
              <td className="border-r border-black p-2">PPN {invoice.tax}%</td>
              <td className="border-r border-black p-2"></td>
              <td className="border-r border-black p-2"></td>
              <td className="p-2 text-right">{formatRupiahPrint(invoice.taxAmount)}</td>
            </tr>
          )}

          {/* ── Diskon ── */}
          {invoice.discount > 0 && (
            <tr className="align-top">
              <td className="border-r border-black p-2">Diskon</td>
              <td className="border-r border-black p-2"></td>
              <td className="border-r border-black p-2"></td>
              <td className="p-2 text-right">({formatRupiahPrint(invoice.discount)})</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer Table */}
      <div className="flex justify-between items-center mb-6 text-[12px]">
        <p className="italic"><span className="font-bold">Kode Langganan :</span> {invoice.customerName}</p>
        <div className="flex w-[40%] border-2 border-black">
          <div className="w-1/2 p-1 font-bold text-center border-r border-black">TOTAL :</div>
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
              <td className="font-bold ">{company.name}</td>
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
            <p className="text-center">Acknowledge/Approved By,</p>
            <p className="text-center font-bold mt-1">{invoice.customerName}</p>
            <div className="h-20"></div> {/* Spacer for signature */}
            <div className="border-b border-blue-600"></div>
            <p className="text-center text-[10px] mt-1">Authorized Signature</p>
          </div>
        </div>
      </div>

    </div>,
    printRoot
  );
});

InvoicePrintLayout.displayName = "InvoicePrintLayout";
export default InvoicePrintLayout;
