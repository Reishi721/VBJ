import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, description, size = "md", children, footer, closeOnOverlay = true }: ModalProps) {
  // ✅ FIX: Listener hanya aktif saat modal benar-benar open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ✅ FIX: Unmount sepenuhnya — bukan hanya return null dengan listener masih aktif
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto print:hidden">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 animate-in fade-in-0 duration-150"
          onClick={closeOnOverlay ? onClose : undefined}
        />
        {/* Dialog */}
        <div className={cn(
          "relative w-full bg-white rounded-2xl shadow-2xl shadow-gray-900/20",
          "animate-in fade-in-0 zoom-in-95 duration-200 origin-center",
          "flex flex-col my-8",
          sizeMap[size]
        )}>
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
              {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Body */}
          <div className="p-6">{children}</div>
          {/* Footer */}
          {footer && (
            <div className="p-6 border-t border-gray-100 shrink-0 flex justify-end gap-3">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

const variantStyles = {
  danger: { icon: "🗑️", bg: "bg-red-50", confirmVariant: "danger" as const },
  warning: { icon: "⚠️", bg: "bg-amber-50", confirmVariant: "primary" as const },
  info: { icon: "ℹ️", bg: "bg-blue-50", confirmVariant: "primary" as const },
};

export function ConfirmDialog({
  open, onClose, onConfirm, title, description = "Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Ya, Lanjutkan", cancelLabel = "Batal", variant = "danger", loading
}: ConfirmDialogProps) {
  // ✅ FIX: Keyboard listener untuk ConfirmDialog juga
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ✅ FIX: Unmount sepenuhnya saat tidak open
  if (!open) return null;

  const vs = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-150" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 p-6 text-center">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl", vs.bg)}>
          {vs.icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{description}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={vs.confirmVariant} className="flex-1" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}