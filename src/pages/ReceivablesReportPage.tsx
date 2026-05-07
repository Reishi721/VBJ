import React, { useState, useMemo } from "react";
import { useInvoices } from "../hooks/useInvoices";
import { useCustomers } from "../hooks/useCustomers";
import { formatRupiah } from "../components/invoice/InvoiceHelpers";
import { SectionHeader, SearchSelect } from "../components/ui";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { FileText, Printer, Building2 } from "lucide-react";

// --- Types ---
interface ReportRow {
  id: string;
  noInv: string;
  tanggal: string;
  periode: string;
  jaminan: number;
  penjualan: number;
  barangHilang: number;
  barangRusak: number;
  perpSewa: number;
  sewaBaru: number;
  transportasi: number;
  totalNilai: number;
  ttlPenerimaan: number;
  nilaiHutang: number;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  rows: ReportRow[];
  summary: Omit<ReportRow, "id" | "noInv" | "tanggal" | "periode">;
}

interface PeriodGroup {
  periodLabel: string; // e.g. "April 2026"
  periodValue: string; // e.g. "2026-04"
  customers: CustomerGroup[];
  summary: Omit<ReportRow, "id" | "noInv" | "tanggal" | "periode">;
}

function calculateInvoiceRow(inv: any): ReportRow {
  // Extract values based on user requirements:
  // Sewa Baru = if billingCycle includes "1", else Perp. Sewa
  const isSewaBaru = inv.billingCycle === "1" || inv.billingCycle?.toLowerCase()?.includes("sewa ke 1");
  
  // Base rental logic (subtotal minus discount plus tax proportion for simplicity, or just subtotal?)
  // The image shows total values. We'll use subtotal for the rental part.
  const sewaValue = inv.subtotal - inv.discount; 
  const perpSewa = isSewaBaru ? 0 : sewaValue;
  const sewaBaru = isSewaBaru ? sewaValue : 0;

  // For Penjualan, Barang Hilang, Barang Rusak -> extract from items if available
  let penjualan = 0;
  let barangHilang = 0;
  let barangRusak = 0;
  
  (inv.items || []).forEach((item: any) => {
    const desc = (item.description || "").toLowerCase();
    const val = item.subtotal || 0;
    if (desc.includes("hilang")) {
      barangHilang += val;
    } else if (desc.includes("rusak")) {
      barangRusak += val;
    } else if (desc.includes("jual") || desc.includes("penjualan")) {
      penjualan += val;
    }
  });

  return {
    id: inv.id,
    noInv: inv.number,
    tanggal: inv.date,
    periode: inv.summaryDescription || inv.billingCycle || "-",
    jaminan: inv.depositFee || 0,
    penjualan,
    barangHilang,
    barangRusak,
    perpSewa,
    sewaBaru,
    transportasi: inv.transportFee || 0,
    totalNilai: inv.total,
    ttlPenerimaan: inv.paidAmount,
    nilaiHutang: inv.remainingAmount,
  };
}

function emptySummary(): Omit<ReportRow, "id" | "noInv" | "tanggal" | "periode"> {
  return {
    jaminan: 0, penjualan: 0, barangHilang: 0, barangRusak: 0,
    perpSewa: 0, sewaBaru: 0, transportasi: 0, totalNilai: 0,
    ttlPenerimaan: 0, nilaiHutang: 0
  };
}

function addSummary(a: any, b: any) {
  return {
    jaminan: a.jaminan + b.jaminan,
    penjualan: a.penjualan + b.penjualan,
    barangHilang: a.barangHilang + b.barangHilang,
    barangRusak: a.barangRusak + b.barangRusak,
    perpSewa: a.perpSewa + b.perpSewa,
    sewaBaru: a.sewaBaru + b.sewaBaru,
    transportasi: a.transportasi + b.transportasi,
    totalNilai: a.totalNilai + b.totalNilai,
    ttlPenerimaan: a.ttlPenerimaan + b.ttlPenerimaan,
    nilaiHutang: a.nilaiHutang + b.nilaiHutang,
  };
}

export default function ReceivablesReportPage() {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const customerOptions = useMemo(() => {
    return customers.map(c => ({ value: c.id, label: c.name }));
  }, [customers]);

  // Grouping logic
  const groupedData = useMemo(() => {
    if (!selectedCustomerId) return []; // Require search/selection

    const filteredInvoices = invoices.filter(inv => 
      inv.status !== "cancelled" && inv.status !== "draft" &&
      inv.customerId === selectedCustomerId
    );

    // Group by period (YYYY-MM) -> customerId -> rows
    const periodsMap = new Map<string, Map<string, ReportRow[]>>();

    filteredInvoices.forEach(inv => {
      const date = parseISO(inv.date);
      const periodKey = format(date, "yyyy-MM");
      const custId = inv.customerId;
      
      if (!periodsMap.has(periodKey)) {
        periodsMap.set(periodKey, new Map());
      }
      
      const custMap = periodsMap.get(periodKey)!;
      if (!custMap.has(custId)) {
        custMap.set(custId, []);
      }
      
      custMap.get(custId)!.push(calculateInvoiceRow(inv));
    });

    // Convert map to array and sort
    const result: PeriodGroup[] = Array.from(periodsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Descending period
      .map(([periodKey, custMap]) => {
        const periodDate = parseISO(`${periodKey}-01`);
        const periodLabel = format(periodDate, "MMMM yyyy", { locale: idLocale });
        
        let periodSummary = emptySummary();
        
        const custGroups: CustomerGroup[] = Array.from(custMap.entries())
          .map(([custId, rows]) => {
            let custSummary = emptySummary();
            rows.forEach(r => { custSummary = addSummary(custSummary, r) as any; });
            periodSummary = addSummary(periodSummary, custSummary) as any;
            
            const custName = customers.find(c => c.id === custId)?.name || "Unknown";
            
            return {
              customerId: custId,
              customerName: custName,
              rows: rows.sort((a, b) => a.noInv.localeCompare(b.noInv)),
              summary: custSummary
            };
          })
          .sort((a, b) => a.customerName.localeCompare(b.customerName));

        return {
          periodLabel,
          periodValue: periodKey,
          customers: custGroups,
          summary: periodSummary
        };
      });

    return result;
  }, [invoices, selectedCustomerId, customers]);

  const grandTotal = useMemo(() => {
    let t = emptySummary();
    groupedData.forEach(p => { t = addSummary(t, p.summary) as any; });
    return t;
  }, [groupedData]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Laporan Piutang (Daftar Saldo Hutang)"
        description="Pantau tagihan, penerimaan, dan sisa piutang berdasarkan pelanggan dan periode"
      />

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-80">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Filter Pelanggan</p>
          <SearchSelect 
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            options={customerOptions}
            placeholder="Cari pelanggan..."
          />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold text-[13px] transition-all border border-gray-200" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Report Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto p-6 printable-report">
        <div className="min-w-[1200px]">
          {/* Header Branding for Print */}
          <div className="hidden print:flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl">V</div>
            <div>
              <h1 className="text-xl font-bold text-blue-900">VICTORY GLOBALINDO JAYA</h1>
              <p className="text-sm font-semibold text-blue-600">EXCELLENT SPIRIT IN BUSINESS</p>
              <p className="text-md font-bold text-gray-800 mt-1">Daftar Saldo Hutang (Detail)</p>
            </div>
          </div>

          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-y-2 border-blue-600 bg-blue-50/50">
                <th className="py-2.5 px-3 text-left font-bold text-blue-900">No. Inv</th>
                <th className="py-2.5 px-3 text-left font-bold text-blue-900">Tanggal</th>
                <th className="py-2.5 px-3 text-left font-bold text-blue-900">Periode / Ket</th>
                <th className="py-2.5 px-3 text-left font-bold text-blue-900">Cur</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Jaminan</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Penjualan</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Brg Hilang</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Brg Rusak</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Perp. Sewa</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Sewa Baru</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Transport</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Total Nilai</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Penerimaan</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-900">Nilai Hutang</th>
              </tr>
            </thead>
            <tbody>
              {!selectedCustomerId ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-gray-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-[14px]">Pilih pelanggan terlebih dahulu</p>
                    <p className="text-[12px] mt-1">Gunakan kotak pencarian di atas untuk memuat laporan piutang pelanggan.</p>
                  </td>
                </tr>
              ) : groupedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">Tidak ada data piutang untuk pelanggan ini.</p>
                  </td>
                </tr>
              ) : null}
              
              {groupedData.map((period) => (
                <React.Fragment key={period.periodValue}>
                  {/* Period Header */}
                  <tr>
                    <td colSpan={14} className="py-4 px-3">
                      <h2 className="text-lg font-extrabold text-gray-900">Periode : {period.periodLabel}</h2>
                    </td>
                  </tr>

                  {period.customers.map((cust) => (
                    <React.Fragment key={cust.customerId}>
                      {/* Customer Header */}
                      <tr>
                        <td colSpan={14} className="py-2 px-3">
                          <p className="text-[14px] font-bold text-blue-800 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Kode Langganan: <span className="text-gray-800 italic">{cust.customerName}</span>
                          </p>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {cust.rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-3 font-mono text-gray-600">{row.noInv}</td>
                          <td className="py-2 px-3 text-gray-700">{format(parseISO(row.tanggal), "dd-MMM-yy", { locale: idLocale })}</td>
                          <td className="py-2 px-3 text-gray-600 truncate max-w-[200px]" title={row.periode}>{row.periode}</td>
                          <td className="py-2 px-3 text-gray-500">IDR</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.jaminan ? formatRupiah(row.jaminan) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.penjualan ? formatRupiah(row.penjualan) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.barangHilang ? formatRupiah(row.barangHilang) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.barangRusak ? formatRupiah(row.barangRusak) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.perpSewa ? formatRupiah(row.perpSewa) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.sewaBaru ? formatRupiah(row.sewaBaru) : "0,00"}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{row.transportasi ? formatRupiah(row.transportasi) : "0,00"}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{formatRupiah(row.totalNilai)}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{row.ttlPenerimaan ? formatRupiah(row.ttlPenerimaan) : "0,00"}</td>
                          <td className="py-2 px-3 text-right font-bold text-red-600">{row.nilaiHutang ? formatRupiah(row.nilaiHutang) : "0,00"}</td>
                        </tr>
                      ))}

                      {/* Customer Summary */}
                      <tr className="bg-emerald-50/50 border-t border-emerald-100">
                        <td colSpan={4} className="py-2.5 px-3 italic text-emerald-800 font-semibold text-right">
                          Summary for '{cust.customerName}' :
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.jaminan ? formatRupiah(cust.summary.jaminan) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.penjualan ? formatRupiah(cust.summary.penjualan) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.barangHilang ? formatRupiah(cust.summary.barangHilang) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.barangRusak ? formatRupiah(cust.summary.barangRusak) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.perpSewa ? formatRupiah(cust.summary.perpSewa) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.sewaBaru ? formatRupiah(cust.summary.sewaBaru) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.transportasi ? formatRupiah(cust.summary.transportasi) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-900 font-bold">{formatRupiah(cust.summary.totalNilai)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">{cust.summary.ttlPenerimaan ? formatRupiah(cust.summary.ttlPenerimaan) : "0,00"}</td>
                        <td className="py-2.5 px-3 text-right text-red-700 font-bold">{cust.summary.nilaiHutang ? formatRupiah(cust.summary.nilaiHutang) : "0,00"}</td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* Period Summary */}
                  <tr className="bg-amber-50/50 border-t border-amber-100">
                    <td colSpan={4} className="py-3 px-3 italic text-amber-900 font-bold text-right">
                      Summary for Bulan '{period.periodLabel}' :
                    </td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.jaminan ? formatRupiah(period.summary.jaminan) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.penjualan ? formatRupiah(period.summary.penjualan) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.barangHilang ? formatRupiah(period.summary.barangHilang) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.barangRusak ? formatRupiah(period.summary.barangRusak) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.perpSewa ? formatRupiah(period.summary.perpSewa) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.sewaBaru ? formatRupiah(period.summary.sewaBaru) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.transportasi ? formatRupiah(period.summary.transportasi) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-amber-900 font-extrabold">{formatRupiah(period.summary.totalNilai)}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-bold">{period.summary.ttlPenerimaan ? formatRupiah(period.summary.ttlPenerimaan) : "0,00"}</td>
                    <td className="py-3 px-3 text-right text-red-700 font-extrabold">{period.summary.nilaiHutang ? formatRupiah(period.summary.nilaiHutang) : "0,00"}</td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Grand Total */}
              {groupedData.length > 0 && (
                <tr className="border-t-[3px] border-double border-gray-400 mt-8">
                  <td colSpan={4} className="py-4 px-3 italic text-gray-900 font-extrabold text-right">
                    GRAND TOTAL :
                  </td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.jaminan ? formatRupiah(grandTotal.jaminan) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.penjualan ? formatRupiah(grandTotal.penjualan) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.barangHilang ? formatRupiah(grandTotal.barangHilang) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.barangRusak ? formatRupiah(grandTotal.barangRusak) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.perpSewa ? formatRupiah(grandTotal.perpSewa) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.sewaBaru ? formatRupiah(grandTotal.sewaBaru) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-gray-900 font-bold border-x border-gray-200">{grandTotal.transportasi ? formatRupiah(grandTotal.transportasi) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-black font-extrabold border-x border-gray-200">{formatRupiah(grandTotal.totalNilai)}</td>
                  <td className="py-4 px-3 text-right text-emerald-700 font-extrabold border-x border-gray-200">{grandTotal.ttlPenerimaan ? formatRupiah(grandTotal.ttlPenerimaan) : "0,00"}</td>
                  <td className="py-4 px-3 text-right text-red-700 font-extrabold border-l border-gray-200">{grandTotal.nilaiHutang ? formatRupiah(grandTotal.nilaiHutang) : "0,00"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
}
