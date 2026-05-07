import { forwardRef } from "react";
import type { SuratJalan } from "../../types";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Props {
  sj: SuratJalan;
  paperWidth: number;   // in mm
  paperHeight: number;  // in mm
}

const SuratJalanPrintLayout = forwardRef<HTMLDivElement, Props>(
  ({ sj, paperWidth, paperHeight }, ref) => {


    const formattedDate = format(new Date(sj.date), "dd MMMM yyyy", { locale: idLocale });
    const typeLabel = sj.type === "pengiriman" ? "PENGIRIMAN" : "PENGEMBALIAN";

    return (
      <div
        ref={ref}
        className="sj-print-page"
        style={{
          width: `${paperWidth}mm`,
          minHeight: `${paperHeight}mm`,
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "12px",
          color: "#000",
          background: "#fff",
          padding: "8mm 10mm",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* ── Title ────────────────────────────────────────────── */}
        <div style={{ textAlign: "right", marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 900,
              letterSpacing: "2px",
              margin: 0,
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            {typeLabel}
          </h1>
        </div>

        {/* ── Separator ────────────────────────────────────────── */}
        <div style={{ borderBottom: "2px solid #1a3a8a", marginBottom: "12px" }} />

        {/* ── Customer Info Box ─────────────────────────────────── */}
        <div
          style={{
            border: "1.5px solid #1a3a8a",
            padding: "10px 14px",
            marginBottom: "14px",
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Kepada :</strong>
          </p>
          <p style={{ margin: 0 }}>
            {sj.customerName}
            {sj.projectName ? ` - ${sj.projectName}` : ""}
          </p>
          <p style={{ margin: 0 }}>{sj.deliveryAddress}</p>
          <table style={{ marginTop: "4px", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td style={{ width: "60px", verticalAlign: "top" }}>Proyek</td>
                <td style={{ width: "12px", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top" }}>{sj.projectName || "—"}</td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "top" }}>UP</td>
                <td style={{ verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top" }}>{sj.recipientName || "—"}</td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "top" }}>Tel/Fax</td>
                <td style={{ verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top" }}>{sj.recipientPhone || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Items Table ──────────────────────────────────────── */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "6px",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  borderTop: "1.5px solid #1a3a8a",
                  borderBottom: "1.5px solid #1a3a8a",
                  padding: "6px 10px",
                  textAlign: "center",
                  color: "#1a3a8a",
                  fontStyle: "italic",
                  fontWeight: "bold",
                  width: "45%",
                }}
              >
                Nama Barang
              </th>
              <th
                style={{
                  borderTop: "1.5px solid #1a3a8a",
                  borderBottom: "1.5px solid #1a3a8a",
                  padding: "6px 10px",
                  textAlign: "center",
                  color: "#1a3a8a",
                  fontStyle: "italic",
                  fontWeight: "bold",
                  width: "15%",
                }}
              >
                Volume
              </th>
              <th
                style={{
                  borderTop: "1.5px solid #1a3a8a",
                  borderBottom: "1.5px solid #1a3a8a",
                  padding: "6px 10px",
                  textAlign: "center",
                  color: "#1a3a8a",
                  fontStyle: "italic",
                  fontWeight: "bold",
                  width: "15%",
                }}
              >
                Satuan
              </th>
              <th
                style={{
                  borderTop: "1.5px solid #1a3a8a",
                  borderBottom: "1.5px solid #1a3a8a",
                  padding: "6px 10px",
                  textAlign: "center",
                  color: "#1a3a8a",
                  fontStyle: "italic",
                  fontWeight: "bold",
                  width: "25%",
                }}
              >
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody>
            {sj.items.map((item, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    padding: "4px 10px",
                    borderBottom: "0.5px solid #ccc",
                  }}
                >
                  {item.inventoryName}
                </td>
                <td
                  style={{
                    padding: "4px 10px",
                    textAlign: "center",
                    borderBottom: "0.5px solid #ccc",
                  }}
                >
                  {item.qty}
                </td>
                <td
                  style={{
                    padding: "4px 10px",
                    textAlign: "center",
                    borderBottom: "0.5px solid #ccc",
                  }}
                >
                  {item.unit}
                </td>
                <td
                  style={{
                    padding: "4px 10px",
                    textAlign: "center",
                    borderBottom: "0.5px solid #ccc",
                  }}
                >
                  {item.note || ""}
                </td>
              </tr>
            ))}
            {/* Padding rows to fill space */}
            {Array.from({ length: Math.max(0, 8 - sj.items.length) }).map((_, i) => (
              <tr key={`pad-${i}`}>
                <td style={{ padding: "4px 10px", borderBottom: "0.5px solid #eee" }}>&nbsp;</td>
                <td style={{ padding: "4px 10px", borderBottom: "0.5px solid #eee" }}>&nbsp;</td>
                <td style={{ padding: "4px 10px", borderBottom: "0.5px solid #eee" }}>&nbsp;</td>
                <td style={{ padding: "4px 10px", borderBottom: "0.5px solid #eee" }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── SJ Number footer ─────────────────────────────────── */}
        <div style={{ textAlign: "right", fontSize: "11px", color: "#1a3a8a", marginBottom: "20px" }}>
          No SJ : {sj.number} - {sj.customerName}
          {sj.projectName ? ` - ${sj.projectName}` : ""}
        </div>

        {/* ── NB Note ──────────────────────────────────────────── */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#1a3a8a", fontWeight: "bold" }}>
            NB: Barang telah diperiksa dan diterima dalam jumlah dan kondisi yang baik
          </p>
          {sj.notes && (
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#555" }}>
              Catatan: {sj.notes}
            </p>
          )}
        </div>

        {/* ── Signatures ───────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            fontSize: "12px",
          }}
        >
          {/* Left: 3 signature columns */}
          <div style={{ display: "flex", gap: "24px" }}>
            {["Diterima oleh", "Dikirim oleh", "Dikeluarkan oleh"].map((label) => (
              <div key={label} style={{ textAlign: "center", width: "120px" }}>
                <p style={{ margin: "0 0 60px 0", fontWeight: "bold", fontSize: "11px" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "11px" }}>
                  (..................................)
                </p>
              </div>
            ))}
          </div>

          {/* Right: date + Mengetahui */}
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>
              Batam, {formattedDate}
            </p>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 60px 0", fontWeight: "bold", fontSize: "11px" }}>
                Mengetahui oleh,
              </p>
              <p style={{ margin: 0, fontSize: "11px" }}>
                (..................................)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SuratJalanPrintLayout.displayName = "SuratJalanPrintLayout";
export default SuratJalanPrintLayout;
