import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { id } from "date-fns/locale";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Month & Year names ─────────────────────────────────────────────────────
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const currentYear = new Date().getFullYear();
const YEAR_RANGE_START = currentYear - 10;
const YEAR_RANGE_END   = currentYear + 10;
const YEARS = Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, i) => YEAR_RANGE_START + i);

// ─── Props ──────────────────────────────────────────────────────────────────
interface DatePickerProps {
  value?: string; // ISO date string yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  label,
  error,
  disabled,
  required,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const displayValue = selected && isValid(selected)
    ? format(selected, "dd MMMM yyyy", { locale: id })
    : "";

  // Sync calendar month to selected date when popup opens
  useEffect(() => {
    if (open && selected && isValid(selected)) {
      setCalMonth(selected);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleMonthChange = useCallback((month: number) => {
    setCalMonth(prev => new Date(prev.getFullYear(), month, 1));
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setCalMonth(prev => new Date(year, prev.getMonth(), 1));
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
        <CalendarDays className={cn("w-4 h-4 shrink-0 transition-colors", displayValue || open ? "text-blue-500" : "text-gray-400")} />
        <span className={cn("flex-1 truncate", displayValue ? "text-gray-900 font-medium" : "text-gray-400")}>
          {displayValue || placeholder}
        </span>
        {displayValue && !disabled && (
          <span
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </span>
        )}
      </button>

      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}

      {/* Calendar Popup */}
      {open && (
        <div className={cn(
          "absolute z-50 mt-2 bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100",
          "animate-in fade-in-0 zoom-in-95 duration-150 origin-top",
          "p-4"
        )}
          style={{ minWidth: 300 }}
        >
          {/* ── Month / Year Selectors ─────────────────────────── */}
          <div className="flex items-center gap-2 mb-3">
            {/* Prev Month */}
            <button
              type="button"
              onClick={() => setCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month Dropdown */}
            <div className="relative flex-1">
              <select
                value={calMonth.getMonth()}
                onChange={e => handleMonthChange(Number(e.target.value))}
                className={cn(
                  "w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200",
                  "rounded-lg px-3 py-1.5 pr-7 text-[13px] font-semibold text-gray-800",
                  "cursor-pointer transition-colors outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                )}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Year Dropdown */}
            <div className="relative w-[85px]">
              <select
                value={calMonth.getFullYear()}
                onChange={e => handleYearChange(Number(e.target.value))}
                className={cn(
                  "w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200",
                  "rounded-lg px-3 py-1.5 pr-7 text-[13px] font-semibold text-gray-800",
                  "cursor-pointer transition-colors outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                )}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Next Month */}
            <button
              type="button"
              onClick={() => setCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Day Grid ───────────────────────────────────────── */}
          <DayPicker
            mode="single"
            month={calMonth}
            onMonthChange={setCalMonth}
            selected={selected}
            onSelect={handleSelect}
            locale={id}
            hideNavigation
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full",
              month_caption: "hidden",
              nav: "hidden",
              month_grid: "w-full border-collapse",
              weekdays: "flex mb-1",
              weekday: "flex-1 text-center text-[11px] font-semibold text-gray-400 uppercase",
              week: "flex w-full mb-1",
              day: "flex-1 text-center p-0",
              day_button: cn(
                "w-full aspect-square rounded-lg text-[13px] font-medium transition-all duration-150",
                "hover:bg-blue-50 hover:text-blue-700 cursor-pointer",
                "flex items-center justify-center"
              ),
              selected: "!bg-blue-600 !text-white shadow-md shadow-blue-500/30 hover:!bg-blue-700",
              today: "ring-2 ring-blue-400/40 font-bold text-blue-600",
              outside: "text-gray-300",
              disabled: "text-gray-200 cursor-not-allowed hover:bg-transparent",
              hidden: "invisible",
            }}
          />

          {/* ── Today shortcut ─────────────────────────────────── */}
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setCalMonth(today);
              onChange(format(today, "yyyy-MM-dd"));
              setOpen(false);
            }}
            className="w-full mt-2 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Hari Ini
          </button>
        </div>
      )}
    </div>
  );
}
