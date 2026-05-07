import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Maximize2, RotateCcw, FileText } from "lucide-react";
import type { SuratJalan } from "../../types";
import SuratJalanPrintLayout from "./SuratJalanPrintLayout";

interface Props {
  sj: SuratJalan;
  onClose: () => void;
}

/* ── Paper Presets ──────────────────────────────────────────── */
const PRESETS = [
  { label: "A4", w: 210, h: 297 },
  { label: "A5", w: 148, h: 210 },
  { label: "Letter", w: 216, h: 279 },
  { label: "Legal", w: 216, h: 356 },
  { label: "F4", w: 210, h: 330 },
  { label: "Half A4", w: 210, h: 148 },
];

export default function SuratJalanPrintModal({ sj, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [paperWidth, setPaperWidth] = useState(210);
  const [paperHeight, setPaperHeight] = useState(297);
  const [activePreset, setActivePreset] = useState("A4");

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setPaperWidth(preset.w);
    setPaperHeight(preset.h);
    setActivePreset(preset.label);
  };

  const resetToDefault = () => {
    setPaperWidth(210);
    setPaperHeight(297);
    setActivePreset("A4");
  };

  const handlePrint = () => {
    // Inject dynamic print styles
    const styleId = "sj-print-style";
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
        #sj-print-container, #sj-print-container * {
          visibility: visible !important;
        }
        #sj-print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: ${paperWidth}mm;
          min-height: ${paperHeight}mm;
        }
        #root { display: none !important; }
        #print-root { display: none !important; }
      }
    `;
    window.print();
  };

  const typeLabel = sj.type === "pengiriman" ? "Pengiriman" : "Pengembalian";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex print:hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Content */}
      <div className="relative flex w-full h-full">
        {/* ── Left: Controls Panel ──────────────────────────── */}
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-2xl">
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Cetak Surat Jalan</h3>
                <p className="text-[11px] text-gray-400">{typeLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SJ Info */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="font-mono text-[13px] font-bold text-blue-600">{sj.number}</span>
            </div>
            <p className="text-[12px] text-gray-600 truncate">{sj.customerName}</p>
            {sj.projectName && (
              <p className="text-[11px] text-gray-400 truncate">{sj.projectName}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">{sj.items.length} item · {sj.date}</p>
          </div>

          {/* Paper Size Controls */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Presets */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Ukuran Kertas
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                      activePreset === p.label
                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
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
                Lebar Kertas (mm)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={420}
                  value={paperWidth}
                  onChange={(e) => {
                    setPaperWidth(Number(e.target.value));
                    setActivePreset("");
                  }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min={100}
                  max={420}
                  value={paperWidth}
                  onChange={(e) => {
                    setPaperWidth(Number(e.target.value));
                    setActivePreset("");
                  }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Custom Height */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                Tinggi Kertas (mm)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={500}
                  value={paperHeight}
                  onChange={(e) => {
                    setPaperHeight(Number(e.target.value));
                    setActivePreset("");
                  }}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min={100}
                  max={500}
                  value={paperHeight}
                  onChange={(e) => {
                    setPaperHeight(Number(e.target.value));
                    setActivePreset("");
                  }}
                  className="w-16 px-2 py-1.5 text-center text-[13px] font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
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
              {activePreset && (
                <p className="text-[11px] text-blue-600 font-medium mt-1">Preset: {activePreset}</p>
              )}
              {!activePreset && (
                <p className="text-[11px] text-amber-600 font-medium mt-1">Ukuran Kustom</p>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={resetToDefault}
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-[14px] shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Printer className="w-4.5 h-4.5" />
              Cetak Sekarang
            </button>
          </div>
        </div>

        {/* ── Right: Preview Area ───────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gray-800/95 p-8 flex items-start justify-center z-10">
          <div
            className="bg-white shadow-2xl shadow-black/30 rounded-sm"
            style={{
              transform: "scale(0.85)",
              transformOrigin: "top center",
            }}
          >
            <div id="sj-print-container">
              <SuratJalanPrintLayout
                ref={printRef}
                sj={sj}
                paperWidth={paperWidth}
                paperHeight={paperHeight}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
