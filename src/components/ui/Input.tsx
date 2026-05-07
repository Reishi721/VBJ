import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, onClear, placeholder = "Cari...", containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn("relative group", containerClassName)}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none transition-all duration-300",
            "bg-gray-50/80 border border-gray-200 text-gray-900",
            "placeholder:text-gray-400 hover:bg-white hover:border-gray-300 hover:shadow-sm",
            "focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:shadow-md",
            className
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); onClear?.(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, className, required, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          required={required}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all duration-300",
            "bg-gray-50/50 border border-gray-200 text-gray-900",
            "placeholder:text-gray-400 hover:bg-white hover:border-gray-300",
            error
              ? "border-red-300 bg-red-50/30 ring-4 ring-red-500/10 focus:border-red-400 focus:bg-white"
              : "focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:shadow-sm",
            props.disabled && "opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 hover:border-gray-200",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-[12px] text-red-500 font-semibold">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-[12px] text-gray-500">{hint}</p>}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, required, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          required={required}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-300 resize-none",
            "bg-gray-50/50 border border-gray-200 text-gray-900",
            "placeholder:text-gray-400 hover:bg-white hover:border-gray-300",
            error
              ? "border-red-300 bg-red-50/30 ring-4 ring-red-500/10 focus:border-red-400 focus:bg-white"
              : "focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:shadow-sm",
            props.disabled && "opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 hover:border-gray-200",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-[12px] text-red-500 font-semibold">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-[12px] text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
