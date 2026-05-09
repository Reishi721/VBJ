/**
 * SuratPerjanjianPrintModal
 * Modal preview + print untuk Surat Perjanjian (menggunakan window.print)
 */
import { createPortal } from "react-dom";
import { X, Printer, FileText, RotateCcw, Maximize2 } from "lucide-react";
import { useState } from "react";
import type { SuratPerjanjian } from "../../types";
import SuratPerjanjianPrintLayout from "./SuratPerjanjianPrintLayout";

interface Props {
  doc: SuratPerjanjian;
  onClose: () => void;
}

const PRESETS = [
  { label: "A4",     w: 210, h: 297 },
  { label: "F4",     w: 210, h: 330 },
  { label: "Letter", w: 216, h: 279 },
  { label: "Legal",  w: 216, h: 356 },
];

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
    const styleId = "sp-print-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page {
          size: ${paperWidth}mm ${paperHeight}mm;
          margin: 0;
        }
        body * { visibility: hidden !important; }
        #sp-print-container, #sp-print-container * {
          visibility: visible !important;
        }
        #sp-print-container {
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
        }
        /* Override flex side-by-side → block for print */
        .sp-pages-wrapper {
          display: block !important;
        }
        .sp-page {
          display: block !important;
          width: ${paperWidth}mm !important;
          min-height: ${paperHeight}mm !important;
          flex: none !important;
          box-sizing: border-box !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        /* hide the vertical divider on print */
        .sp-pages-wrapper > div:not(.sp-page) {
          display: none !important;
        }
      }
    `;
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex print:hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Content */}
      <div className="relative flex w-full h-full">
        {/* ── Left: Controls ─────────────────────────────────── */}
        <div className="w-[300px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Cetak Surat Perjanjian</h3>
                <p className="text-[11px] text-gray-400">Preview & Print</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Doc Info */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-mono text-[13px] font-bold text-indigo-600">{doc.number}</span>
            </div>
            <p className="text-[12px] text-gray-700 font-medium truncate">{doc.customerName}</p>
            {doc.projectLocation && (
              <p className="text-[11px] text-gray-400 truncate">{doc.projectLocation}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">{doc.items.length} item · {doc.date}</p>
          </div>

          {/* Paper Settings */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Presets */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Ukuran Kertas
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                      activePreset === p.label
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Width */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Lebar (mm)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={100} max={420} value={paperWidth}
                  onChange={(e) => { setPaperWidth(Number(e.target.value)); setActivePreset(""); }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
                <input
                  type="number" min={100} max={420} value={paperWidth}
                  onChange={(e) => { setPaperWidth(Number(e.target.value)); setActivePreset(""); }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Custom Height */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Tinggi (mm)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={100} max={600} value={paperHeight}
                  onChange={(e) => { setPaperHeight(Number(e.target.value)); setActivePreset(""); }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                />
                <input
                  type="number" min={100} max={600} value={paperHeight}
                  onChange={(e) => { setPaperHeight(Number(e.target.value)); setActivePreset(""); }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Dimension Display */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dimensi Aktif</span>
                <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {paperWidth} × {paperHeight} <span className="text-[12px] font-medium text-gray-400">mm</span>
              </p>
              {activePreset ? (
                <p className="text-[11px] text-indigo-600 font-medium mt-1">Preset: {activePreset}</p>
              ) : (
                <p className="text-[11px] text-amber-600 font-medium mt-1">Ukuran Kustom</p>
              )}
            </div>

            <button
              onClick={() => applyPreset(PRESETS[0])}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke A4
            </button>
          </div>

          {/* Print Button */}
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-[14px] shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </button>
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-800/95 p-8 flex items-start justify-center z-10">
          <div
            className="bg-white shadow-2xl shadow-black/30 rounded-sm"
            style={{ transform: "scale(0.82)", transformOrigin: "top center" }}
          >
            <div
              id="sp-print-container"
              style={{ width: `${paperWidth * 2}mm`, minHeight: `${paperHeight}mm` }}
            >
              <SuratPerjanjianPrintLayout doc={doc} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
