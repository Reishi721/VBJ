import { useState, useCallback, useRef } from "react";

interface UseDraftGuardOptions<T extends Record<string, unknown>> {
  /** Form state saat ini */
  form: T;
  /** Form state kosong/awal untuk perbandingan dirty check */
  emptyForm: T;
  /** Callback saat user pilih "Buang" atau form tidak dirty */
  onDiscard: () => void;
  /** Callback saat user pilih "Simpan Draft" */
  onSaveDraft: () => void | Promise<void>;
  /**
   * Custom dirty checker — jika tidak disediakan, akan cek apakah
   * ada field string yang non-empty atau array yang tidak kosong
   */
  isDirty?: (form: T) => boolean;
  /** Field name utama untuk ditampilkan di dialog (misal "customerName") */
  primaryField?: keyof T;
}

interface DraftGuardResult {
  /** Apakah dialog konfirmasi sedang terbuka */
  showGuard: boolean;
  /** Sedang menyimpan draft (untuk loading state) */
  savingDraft: boolean;
  /** Nilai field utama yang sudah diisi (untuk ditampilkan di dialog) */
  filledName: string;
  /** Panggil ini saat user klik tombol tutup / X modal */
  handleClose: () => void;
  /** Konfirmasi: buang perubahan dan tutup */
  confirmDiscard: () => void;
  /** Konfirmasi: simpan draft dan tutup */
  confirmSaveDraft: () => Promise<void>;
  /** Batal: tutup dialog, lanjut edit */
  cancelGuard: () => void;
}

/**
 * Hook untuk mencegah user kehilangan data saat menutup form yang sudah diisi.
 * Menampilkan dialog konfirmasi "Simpan Draft / Buang / Lanjut Edit".
 */
export function useDraftGuard<T extends Record<string, unknown>>({
  form,
  emptyForm,
  onDiscard,
  onSaveDraft,
  isDirty: customIsDirty,
  primaryField,
}: UseDraftGuardOptions<T>): DraftGuardResult {
  const [showGuard, setShowGuard] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const pendingDiscard = useRef(false);

  // Use refs for values that change frequently to keep callbacks stable
  const formRef = useRef(form);
  const emptyFormRef = useRef(emptyForm);
  const customIsDirtyRef = useRef(customIsDirty);
  formRef.current = form;
  emptyFormRef.current = emptyForm;
  customIsDirtyRef.current = customIsDirty;

  // ── Dirty check (stable callback — doesn't change on every keystroke) ──────
  const checkDirty = useCallback((): boolean => {
    const currentForm = formRef.current;
    const currentEmpty = emptyFormRef.current;
    const currentCustom = customIsDirtyRef.current;

    if (currentCustom) return currentCustom(currentForm);

    return Object.keys(currentEmpty).some((key) => {
      const val   = currentForm[key];
      const empty = currentEmpty[key];

      if (typeof val === "string" && typeof empty === "string") {
        return val.trim() !== "" && val.trim() !== empty.trim();
      }
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      // Angka/boolean: berbeda dari default
      return val !== empty && val !== undefined && val !== null && val !== 0 && val !== false;
    });
  }, []); // Stable — reads from refs

  // Nilai field utama untuk ditampilkan di dialog
  const filledName = primaryField
    ? String(form[primaryField] ?? "").trim()
    : (() => {
        // Auto-detect dari field bernama *name*, *customerName*, *supplierName*, *title*
        const nameKeys = ["name", "customerName", "supplierName", "title", "number"] as Array<keyof T>;
        for (const k of nameKeys) {
          const v = String(form[k] ?? "").trim();
          if (v) return v;
        }
        return "";
      })();

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (checkDirty()) {
      setShowGuard(true);
    } else {
      onDiscard();
    }
  }, [checkDirty, onDiscard]);

  const confirmDiscard = useCallback(() => {
    pendingDiscard.current = true;
    setShowGuard(false);
    onDiscard();
  }, [onDiscard]);

  const confirmSaveDraft = useCallback(async () => {
    setSavingDraft(true);
    try {
      await onSaveDraft();
    } finally {
      setSavingDraft(false);
      setShowGuard(false);
    }
  }, [onSaveDraft]);

  const cancelGuard = useCallback(() => {
    setShowGuard(false);
  }, []);

  return {
    showGuard,
    savingDraft,
    filledName,
    handleClose,
    confirmDiscard,
    confirmSaveDraft,
    cancelGuard,
  };
}
