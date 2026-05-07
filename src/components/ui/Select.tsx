import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placement?: "bottom" | "top";
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi",
  label,
  error,
  disabled,
  required,
  className,
  placement = "bottom",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {label && (
        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] text-left transition-all duration-300 outline-none",
          "bg-gray-50/50 border border-gray-200",
          open 
            ? "bg-white border-blue-400 ring-4 ring-blue-500/10 shadow-sm" 
            : "hover:bg-white hover:border-gray-300",
          error && "border-red-300 bg-red-50/30 ring-4 ring-red-500/10",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 hover:border-gray-200"
        )}
      >
        {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
        <span className={cn("flex-1 truncate", selected ? "text-gray-900 font-medium" : "text-gray-400")}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-300 shrink-0", open && "rotate-180 text-blue-500")} />
      </button>

      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}

      {open && (
        <div className={cn(
          "absolute z-50 left-0 min-w-full w-max max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100",
          "animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden",
          placement === "bottom" ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
        )}>
          <div className="py-1.5 max-h-60 overflow-y-auto">
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                    isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700",
                    opt.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium truncate", isSelected && "text-blue-700")}>{opt.label}</p>
                    {opt.description && <p className="text-[11px] text-gray-400 truncate">{opt.description}</p>}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
