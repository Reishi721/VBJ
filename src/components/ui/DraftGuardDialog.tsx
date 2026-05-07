import { FileText, Trash2, ArrowLeft } from "lucide-react";

interface DraftGuardDialogProps {
  open: boolean;
  /** Nama entitas, misal "Surat Jalan", "Invoice", "Purchase Order" */
  entityName?: string;
  /** Nama yang sudah diisi user (ditampilkan di pesan) */
  filledName?: string;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  savingDraft?: boolean;
}

export function DraftGuardDialog({
  open,
  entityName = "Formulir",
  filledName,
  onSaveDraft,
  onDiscard,
  onCancel,
  savingDraft = false,
}: DraftGuardDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-150"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden">
        {/* Accent top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

        <div className="p-6 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-500" />
          </div>

          {/* Title */}
          <h3 className="text-[17px] font-bold text-gray-900 leading-tight">
            {entityName} Belum Tersimpan
          </h3>

          {/* Message */}
          <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
            {filledName ? (
              <>
                <span className="font-semibold text-gray-700">"{filledName}"</span> sudah Anda isi
                tapi belum disimpan.{" "}
              </>
            ) : (
              "Anda sudah mengisi beberapa data. "
            )}
            Simpan sebagai <span className="font-semibold text-amber-600">Draft</span> agar bisa
            dilanjutkan nanti?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 mt-6">
            {/* Primary: Save Draft */}
            <button
              onClick={onSaveDraft}
              disabled={savingDraft}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                text-white font-semibold text-[14px] transition-all shadow-sm
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              {savingDraft ? "Menyimpan..." : "Simpan sebagai Draft"}
            </button>

            {/* Secondary: Discard */}
            <button
              onClick={onDiscard}
              disabled={savingDraft}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[14px]
                transition-all border border-red-100 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              Buang Perubahan
            </button>

            {/* Tertiary: Continue editing */}
            <button
              onClick={onCancel}
              disabled={savingDraft}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium text-[13px]
                transition-all disabled:opacity-60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Lanjutkan Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
