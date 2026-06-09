/**
 * SuratPerjanjianPrintModal
 * Modal preview + print untuk Surat Perjanjian
 * Zoom / pan / pinch via react-zoom-pan-pinch
 *
 * Print strategy (fixed):
 *   - SuratPerjanjianPrintLayout di-render DI DALAM portal yang sama
 *     (sehingga punya akses ke QueryClientProvider / React context)
 *   - Div wrapper-nya diberi id="sp-print-target" dan TIDAK diberi class
 *     print:hidden, sehingga tetap visible saat @media print
 *   - CSS @media print:
 *       1. Sembunyikan semua children body
 *       2. Tampilkan hanya #sp-print-target
 *   - Ancestor CSS `transform` (dari react-zoom-pan-pinch) TIDAK memengaruhi
 *     print karena #sp-print-target berada di luar semua TransformWrapper
 *   - Setelah afterprint, hapus <style> tag agar tidak bocor ke print lain
 */
import { createPortal } from "react-dom";
import { X, Printer, FileText, RotateCcw, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import type { SuratPerjanjian } from "../../types";
import SuratPerjanjianPrintLayout from "./SuratPerjanjianPrintLayout";

interface Props {
  doc: SuratPerjanjian;
  onClose: () => void;
}

const PRESETS = [
  { label: "A4",    w: 210, h: 297 },
  { label: "F4",    w: 210, h: 330 },
  { label: "Letter",w: 216, h: 279 },
  { label: "Legal", w: 216, h: 356 },
];

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm rounded-xl px-1 py-1 border border-white/10 shadow-xl">
      <button onClick={() => zoomOut(0.2)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={() => resetTransform()} className="px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-[11px] font-bold tracking-wide">
        Reset
      </button>
      <button onClick={() => zoomIn(0.2)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all" title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SuratPerjanjianPrintModal({ doc, onClose }: Props) {
  const [paperWidth,   setPaperWidth]   = useState(210);
  const [paperHeight,  setPaperHeight]  = useState(297);
  const [activePreset, setActivePreset] = useState("A4");

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPaperWidth(p.w);
    setPaperHeight(p.h);
    setActivePreset(p.label);
  };

  const handlePrint = () => {
    // ── Inject @media print CSS ───────────────────────────────
    const styleId = "sp-print-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page { size: ${paperWidth}mm ${paperHeight}mm; margin: 0; }

        /* Hide EVERYTHING, then selectively show print target */
        body > * { visibility: hidden !important; }
        #sp-print-target, #sp-print-target * { visibility: visible !important; }
        #sp-print-target {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
        }

        /* Two-page layout → block for print */
        .sp-pages-wrapper { display: block !important; }
        .sp-page {
          display: block !important;
          width: ${paperWidth}mm !important;
          min-height: ${paperHeight}mm !important;
          flex: none !important;
          box-sizing: border-box !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        /* Hide the visual divider between pages */
        .sp-pages-wrapper > div:not(.sp-page) { display: none !important; }
      }
    `;

    window.print();

    // ── Cleanup style tag after printing (prevents bleeding into invoice print) ──
    const cleanup = () => {
      const stale = document.getElementById("sp-print-style");
      if (stale) stale.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex">
      {/* Overlay — hidden during print */}
      <div className="absolute inset-0 bg-black/50 print:hidden" onClick={onClose} />

      {/* ── Print-only target (outside all transforms, no print:hidden) ── */}
      {/*    Lives inside the portal so it has React context access.       */}
      <div
        id="sp-print-target"
        style={{ position: "fixed", top: 0, left: 0, zIndex: -1, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <SuratPerjanjianPrintLayout doc={doc} />
      </div>

      {/* ── Modal UI (hidden during print) ── */}
      <div className="relative flex w-full h-full overflow-hidden print:hidden">

        {/* ── Left: Controls ─────────────────────────────────── */}
        <div className="w-[300px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-2xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Cetak Surat Perjanjian</h3>
                <p className="text-[11px] text-gray-400">Scroll · Drag · Pinch</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-mono text-[13px] font-bold text-indigo-600">{doc.number}</span>
            </div>
            <p className="text-[12px] text-gray-700 font-medium truncate">{doc.customerName}</p>
            {doc.projectLocation && <p className="text-[11px] text-gray-400 truncate">{doc.projectLocation}</p>}
            <p className="text-[11px] text-gray-400 mt-1">{doc.items.length} item · {doc.date}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Paper presets */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Ukuran Kertas</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                      activePreset === p.label
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >{p.label}</button>
                ))}
              </div>
            </div>

            {/* Width */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Lebar (mm)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={100} max={420} value={paperWidth}
                  onChange={(e) => { setPaperWidth(Number(e.target.value)); setActivePreset(""); }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                <input type="number" min={100} max={420} value={paperWidth}
                  onChange={(e) => { setPaperWidth(Number(e.target.value)); setActivePreset(""); }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tinggi (mm)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={100} max={600} value={paperHeight}
                  onChange={(e) => { setPaperHeight(Number(e.target.value)); setActivePreset(""); }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                <input type="number" min={100} max={600} value={paperHeight}
                  onChange={(e) => { setPaperHeight(Number(e.target.value)); setActivePreset(""); }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Dimension display */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dimensi Aktif</span>
                <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {paperWidth} × {paperHeight} <span className="text-[12px] font-medium text-gray-400">mm</span>
              </p>
              {activePreset
                ? <p className="text-[11px] text-indigo-600 font-medium mt-1">Preset: {activePreset}</p>
                : <p className="text-[11px] text-amber-600 font-medium mt-1">Ukuran Kustom</p>}
            </div>

            <button onClick={() => applyPreset(PRESETS[0])}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Reset ke A4
            </button>

            {/* Navigation tips */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-1">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Navigasi Preview</p>
              <p className="text-[11px] text-blue-600">🖱️ Scroll — zoom in/out</p>
              <p className="text-[11px] text-blue-600">🖱️ Drag — geser dokumen</p>
              <p className="text-[11px] text-blue-600">👌 Pinch — zoom (touchscreen)</p>
              <p className="text-[11px] text-blue-600">🔘 Reset — kembali ke posisi awal</p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100">
            <button onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[14px] shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all">
              <Printer className="w-4 h-4" /> Cetak Sekarang
            </button>
          </div>
        </div>

        {/* ── Right: Preview canvas ─────────────────────────── */}
        <div className="flex-1 flex flex-col bg-gray-800/95 overflow-hidden z-10">
          <div className="flex items-center gap-8 px-6 py-2.5 border-b border-white/10 shrink-0">
            <span className="text-[11px] font-semibold text-white/50 tracking-wider uppercase">
              📄 Halaman 1 — Isi Perjanjian
            </span>
            <span className="text-[11px] font-semibold text-white/50 tracking-wider uppercase">
              📄 Halaman 2 — Syarat &amp; Tanda Tangan
            </span>
          </div>

          <div className="flex-1 relative">
            <TransformWrapper
              initialScale={0.47}
              minScale={0.1}
              maxScale={3}
              centerOnInit
              limitToBounds={false}
              doubleClick={{ mode: "reset" }}
              wheel={{ step: 0.07 }}
              pinch={{ step: 5 }}
            >
              <>
                <ZoomControls />
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%", position: "absolute", inset: 0, cursor: "grab" }}
                  contentStyle={{ padding: "48px" }}
                >
                  {/* Preview (visual only, not used for print) */}
                  <div
                    className="bg-white shadow-2xl shadow-black/60 rounded-sm"
                    style={{ width: `${paperWidth * 2}mm`, minHeight: `${paperHeight}mm` }}
                  >
                    <SuratPerjanjianPrintLayout doc={doc} />
                  </div>
                </TransformComponent>
              </>
            </TransformWrapper>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}