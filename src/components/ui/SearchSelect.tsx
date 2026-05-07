import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih atau cari...",
  searchPlaceholder = "Cari...",
  label,
  error,
  disabled,
  required,
  emptyMessage = "Tidak ada hasil ditemukan",
  className,
  placement = "bottom",
}: SearchSelectProps & { placement?: "bottom" | "top" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const filtered = useMemo(() =>
    query.trim()
      ? options.filter(o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.description || "").toLowerCase().includes(query.toLowerCase()) ||
          (o.meta || "").toLowerCase().includes(query.toLowerCase())
        )
      : options,
    [options, query]
  );

  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); };

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
        <span className={cn("flex-1 truncate", selected ? "text-gray-900 font-medium" : "text-gray-400")}>
          {selected?.label || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span onClick={handleClear} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-300", open && "rotate-180 text-blue-500")} />
        </div>
      </button>

      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}

      {open && (
        <div className={cn(
          "absolute z-50 left-0 min-w-full w-max max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100",
          "animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden",
          placement === "bottom" ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
        )}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="py-1.5 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">{emptyMessage}</div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                      isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", isSelected && "text-blue-700")}>{opt.label}</p>
                      {opt.description && <p className="text-[11px] text-gray-400 truncate">{opt.description}</p>}
                    </div>
                    {opt.meta && <span className="text-[11px] text-gray-400 shrink-0">{opt.meta}</span>}
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">{filtered.length} dari {options.length} hasil</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
