import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { id } from "date-fns/locale";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";

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
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const displayValue = selected && isValid(selected)
    ? format(selected, "dd MMMM yyyy", { locale: id })
    : "";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          style={{ minWidth: 280 }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={id}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full",
              month_caption: "flex items-center justify-between mb-3 px-1",
              caption_label: "text-sm font-bold text-gray-900",
              nav: "flex items-center gap-1",
              button_previous: "w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors",
              button_next: "w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors",
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
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left"
                  ? <ChevronLeft className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />,
            }}
          />
        </div>
      )}
    </div>
  );
}
