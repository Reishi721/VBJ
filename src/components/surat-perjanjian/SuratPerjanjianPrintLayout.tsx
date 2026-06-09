/**
 * SuratPerjanjianPrintLayout
 * Layout cetak Surat Perjanjian Sewa Menyewa
 * Kop surat mengikuti desain Invoice (data dari Company Settings)
 * Halaman 1: Kop + Pihak I & II + Tabel Item + Footer Info
 * Halaman 2: Syarat dan Ketentuan + Tanda Tangan
 */
import { useCompanySettings } from "../../hooks/useSettings";
import type { SuratPerjanjian } from "../../types";

interface Props {
  doc: SuratPerjanjian;
}

function formatCurrencyPrint(n: number): string {
  if (!n) return "0";
  return n.toLocaleString("id-ID");
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function SuratPerjanjianPrintLayout({ doc }: Props) {
  const { data: settingsData } = useCompanySettings();
  const company = settingsData?.company || {
    name: "PT. Victory Bersatu Jaya",
    tagline: "EXCELLENT SPIRIT IN BUSINESS",
    addressLine1: "Pusat Penjualan & Penyewaan Peralatan Scaffolding",
    addressLine2: "Batam - Indonesia",
    phone: "",
    fax: "",
    logoUrl: "",
  };

  // items sorted by order
  const tableItems = [...doc.items].sort((a, b) => a.itemOrder - b.itemOrder);

  const subtotal = tableItems.reduce((s, it) => s + it.jumlah, 0);
  const grandTotal = subtotal + doc.transportFee + doc.uangJaminan;

  const spNumber = doc.number?.split("-").pop() ?? "";

  const TERMS = [
    "Kondisi barang saat disewakan adalah dalam keadaan baik dan layak pakai, dan pada saat pengembalian barang tersebut harus dalam keadaan baik juga.",
    "Pihak Kedua/Penyewa harus memastikan bahwa peralatan scaffolding telah terpasang dengan baik dan memenuhi persyaratan teknis pembangunan.",
    "Kesalahan penggunaan barang sewaan dan kecelakaan kerja yang terjadi pada kegiatan Pihak Kedua/Penyewa bukan menjadi tanggung jawab dari Pihak Pertama/Pemilik.",
    "Penambahan jumlah barang sewaan, akan menambah Uang Jaminan Sewa juga.",
    "Apabila terdapat kerusakan atau kehilangan, maka Pihak Kedua/Penyewa akan bertanggung jawab penuh untuk menggantikan dengan barang yang dalam kondisi baik dan siap pakai.",
    "Atau mengganti dengan uang sesuai dengan harga yang tertera dalam Surat Perjanjian Sewa ini.",
    "Pihak Kedua/Penyewa wajib membayar uang perpanjangan sewa dimuka setiap bulan, apabila Pihak Kedua/Penyewa menunggak melebihi 3 (tiga) hari dari tanggal jatuh tempo, maka",
    "Pihak Pertama/Pemilik berhak untuk menarik barang sewaan dan dimana biaya-biaya yang timbul akan dibebankan kepada Pihak Kedua/ Penyewa",
    "dengan ketentuan biaya bongkar barang sewaan yang masih terpasang sebesar Rp. 25.000,- per set.",
    "Apabila ada perpanjangan sewa Pihak Kedua/Penyewa wajib memberitahukan kepada Pihak Pertama/Pemilik 1 (satu) minggu sebelum masa jatuh tempo berakhir.",
    "Keterlambatan pengembalian barang melebihi 3 (tiga) hari dari akhir masa sewa, akan dihitung uang sewa per hari.",
    "Uang Jaminan Sewa tidak dapat digunakan untuk memotong uang perpanjangan sewa.",
    "Uang Jaminan Sewa akan dikembalikan setelah semua barang sewaan telah dikembalikan dalam keadaan baik dan siap pakai.",
    "Transaksi dan kesepakatan Perjanjian Sewa ini didasari dengan itikad baik dengan kondisi Sadar dan tanpa paksaan dari pihak manapun.",
    "Demikian surat Perjanjian ini kami buat dengan sebenarnya dan mempunyai kekuatan hukum yang dapat dipatuhi.",
  ];

  /* ─── Shared KOP SURAT (identik dengan InvoicePrintLayout) ─── */
  const KopSurat = () => (
    <>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginBottom: 8, fontFamily: '"Times New Roman", Times, serif' }}>

        {/* Logo — 100 × 100 px, sama dengan invoice */}
        <div style={{ width: 100, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 60, fontWeight: 900, color: "#c0392b", lineHeight: 1 }}>V</div>
          )}
        </div>

        {/* Company info */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* Nama perusahaan — 25 px, Rockwell, MERAH, uppercase (= invoice h1) */}
          <div style={{
            fontFamily: '"Rockwell Extra Bold", Rockwell, serif',
            fontSize: 25,
            fontWeight: 900,
            color: "#c0392b",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}>
            {company.name}
          </div>

          {/* Tagline — 18 px, bold, uppercase (= invoice h2) */}
          <div style={{ fontSize: 18, fontWeight: "bold", textTransform: "uppercase" }}>
            {company.tagline}
          </div>

          {/* Address lines — sama dengan invoice */}
          <div style={{ fontSize: 12 }}>{company.addressLine1}</div>
          <div style={{ fontSize: 12 }}>Telp : {company.phone}{company.fax ? ` / ${company.fax}` : ""}</div>
          <div style={{ fontSize: 12 }}>{company.addressLine2}</div>
        </div>

        {/* Doc number — top right */}
        <div style={{ marginLeft: "auto", textAlign: "right", verticalAlign: "top", minWidth: 70, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: "#555" }}>No.</div>
          <div style={{
            fontSize: 14, fontWeight: "bold",
            borderBottom: "1px solid #000",
            paddingBottom: 2, minWidth: 60, display: "inline-block",
          }}>
            {spNumber}
          </div>
        </div>
      </div>

      {/* Silver rule — 3 px, sama dengan invoice */}
      <div style={{ borderTop: "3px solid #C0C0C0", marginBottom: 10 }} />
    </>
  );


  return (
    <div
      className="sp-pages-wrapper"
      style={{
        display: "flex",
        flexDirection: "row",
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#000",
        width: "100%",
      }}
    >
      {/* ═══════════════════════ PAGE 1 ═══════════════════════ */}
      <div
        className="sp-page"
        style={{ flex: "0 0 50%", width: "50%", padding: "16px 28px 24px", boxSizing: "border-box" }}
      >

        <KopSurat />

        {/* Title */}
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 10 }}>
          SURAT PERJANJIAN SEWA MENYEWA
        </div>

        <div style={{ marginBottom: 6, fontSize: 10 }}>Yang bertanda tangan di bawah ini :</div>

        {/* Pihak I */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ width: 14, verticalAlign: "top", fontWeight: "bold" }}>I.</td>
              <td style={{ width: 80, verticalAlign: "top" }}>Nama</td>
              <td style={{ width: 12 }}>:</td>
              <td style={{ fontWeight: "bold" }}>{doc.pihakPertamaName}</td>
            </tr>
            <tr>
              <td />
              <td>Alamat</td>
              <td>:</td>
              <td>{doc.pihakPertamaAddress}</td>
            </tr>
            <tr>
              <td />
              <td>Telp</td>
              <td>:</td>
              <td>{doc.pihakPertamaPhone}</td>
            </tr>
            <tr>
              <td />
              <td>Jabatan</td>
              <td>:</td>
              <td>
                {doc.pihakPertamaPosition}&nbsp;
                <span style={{ fontStyle: "italic" }}>"{company.name}"</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ paddingLeft: 90, fontSize: 10, marginBottom: 6, fontStyle: "italic" }}>
          selanjutnya disebut Pihak Pertama
        </div>

        {/* Pihak II */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ width: 14, verticalAlign: "top", fontWeight: "bold" }}>II.</td>
              <td style={{ width: 80, verticalAlign: "top" }}>Nama</td>
              <td style={{ width: 12 }}>:</td>
              <td style={{ fontWeight: "bold" }}>
                {doc.customerName}
                {doc.customerWakil && ` ( ${doc.customerWakil} )`}
              </td>
            </tr>
            <tr>
              <td />
              <td>Alamat</td>
              <td>:</td>
              <td>{doc.customerAddress}</td>
            </tr>
            <tr>
              <td />
              <td>Telp / Fax</td>
              <td>:</td>
              <td>{[doc.customerPhone, doc.customerFax].filter(Boolean).join(" / ")}</td>
            </tr>
            <tr>
              <td />
              <td>Diwakili Oleh</td>
              <td>:</td>
              <td>{doc.customerWakil ?? ""}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ paddingLeft: 90, fontSize: 10, marginBottom: 8, fontStyle: "italic" }}>
          selanjutnya disebut Pihak Kedua
        </div>

        <div style={{ fontSize: 10, marginBottom: 6 }}>
          Pihak Pertama telah menyewakan scaffolding dan perlengkapannya kepada Pihak Kedua dengan perincian sebagai berikut :
        </div>

        <div style={{ fontWeight: "bold", fontSize: 10, marginBottom: 4 }}>01. Jenis dan kondisi Barang :</div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: "#d0e4f0" }}>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 22 }}>no</th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center" }}>Nama Barang</th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 90 }}>Harga Ganti Rugi</th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 60 }}>Jumlah Barang</th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 28 }}></th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 90 }}>Harga Sewa</th>
              <th style={{ border: "1px solid #999", padding: "3px 5px", textAlign: "center", width: 70 }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map((item, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "center" }}>{i + 1}</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }}>{item.inventoryName}</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "right" }}>
                  {formatCurrencyPrint(item.hargaGanti)}
                  <span style={{ color: "#555", fontSize: 8 }}> /{item.satuan}</span>
                </td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "center" }}>
                  {item.qty > 0 ? item.qty : ""}
                </td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "center", fontSize: 8 }}>
                  {item.satuan}
                </td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "right" }}>
                  {formatCurrencyPrint(item.hargaSewa)}
                  <span style={{ color: "#555", fontSize: 8 }}> /{item.satuan}/bln</span>
                </td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "right" }}>
                  {item.jumlah > 0 ? formatCurrencyPrint(item.jumlah) : ""}
                </td>
              </tr>
            ))}

            {/* Transport row */}
            {doc.transportFee > 0 && (
              <tr>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "center" }}>98</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }}>Transport</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "right" }}>
                  {formatCurrencyPrint(doc.transportFee)}
                </td>
              </tr>
            )}

            {/* Uang Jaminan row */}
            {doc.uangJaminan > 0 && (
              <tr>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "center" }}>99</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }}>Uang Jaminan</td>
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px" }} />
                <td style={{ border: "1px solid #bbb", padding: "2px 5px", textAlign: "right" }}>
                  {formatCurrencyPrint(doc.uangJaminan)}
                </td>
              </tr>
            )}

            {/* Grand Total row */}
            <tr>
              <td
                colSpan={6}
                style={{ border: "1px solid #bbb", padding: "3px 5px", textAlign: "right", fontWeight: "bold" }}
              >
                Jumlah :
              </td>
              <td
                style={{
                  border: "1px solid #bbb", padding: "3px 5px",
                  textAlign: "right", fontWeight: "bold", background: "#f0f0f0",
                }}
              >
                {formatCurrencyPrint(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Info */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: 24 }}>02.</td>
              <td style={{ width: 160 }}>Tempat Proyek / Usaha</td>
              <td style={{ width: 12 }}>:</td>
              <td>{doc.projectLocation ?? "-"}</td>
            </tr>
            <tr>
              <td>03.</td>
              <td>Lama Sewa</td>
              <td>:</td>
              <td>{doc.lamaSewa ?? "-"}</td>
            </tr>
            <tr>
              <td>04.</td>
              <td>Pembayaran Selanjutnya</td>
              <td>:</td>
              <td>{doc.pembayaranSelanjutnya ?? "-"}</td>
            </tr>
            <tr>
              <td>05.</td>
              <td>Cara Pembayaran</td>
              <td>:</td>
              <td>{doc.caraPembayaran}</td>
            </tr>
          </tbody>
        </table>

        {/* Page footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", color: "#c0392b", fontSize: 9, fontStyle: "italic", marginTop: 8 }}>
          {doc.customerName} &nbsp;&nbsp; Page 1 of 2
        </div>
      </div>

      {/* Vertical divider between pages */}
      <div style={{ width: 1, background: "#d1d5db", flexShrink: 0, margin: "0 4px" }} />

      {/* ═══════════════════════ PAGE 2 ═══════════════════════ */}
      <div
        className="sp-page"
        style={{ flex: "0 0 50%", width: "50%", padding: "16px 28px 24px", boxSizing: "border-box" }}
      >

        <KopSurat />

        {/* Title */}
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>
          SYARAT DAN KETENTUAN
        </div>

        {/* Terms */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 10, lineHeight: 1.8 }}>
          {TERMS.map((term, i) => (
            <li key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
              <span>-</span>
              <span>{term}</span>
            </li>
          ))}
        </ul>

        {/* Signature area */}
        <div style={{ marginTop: 32, fontSize: 10 }}>
          <div style={{ marginBottom: 20 }}>
            Batam, &nbsp; {formatDateLong(doc.date)}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", verticalAlign: "top" }}>
                  <div style={{ color: "#c0392b", fontWeight: "bold", marginBottom: 2 }}>Pihak Pertama</div>
                  <div style={{ marginBottom: 48 }}>{company.name}</div>
                  <div style={{ borderTop: "1px solid #333", paddingTop: 4, width: 180 }}>
                    {doc.pihakPertamaPosition}
                  </div>
                </td>
                <td style={{ width: "50%", verticalAlign: "top", textAlign: "right" }}>
                  <div style={{ color: "#c0392b", fontWeight: "bold", marginBottom: 2 }}>Pihak Kedua</div>
                  <div style={{ marginBottom: 48 }}>&nbsp;</div>
                  <div
                    style={{
                      borderTop: "1px solid #333", paddingTop: 4,
                      display: "inline-block", minWidth: 180,
                    }}
                  >
                    Penyewa
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Page footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", color: "#c0392b", fontSize: 9, fontStyle: "italic", marginTop: 16 }}>
          {doc.customerName} &nbsp;&nbsp; Page 2 of 2
        </div>
      </div>

    </div>
  );
}
