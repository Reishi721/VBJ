import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { type LucideIcon, Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "gradient-primary text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-200",
  outline:
    "border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-700",
  ghost:
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  danger:
    "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0",
  success:
    "gradient-success text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-sm px-6 py-3 gap-2.5 rounded-xl font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", leftIcon: LeftIcon, rightIcon: RightIcon, loading, fullWidth, children, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          isDisabled && "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none pointer-events-none",
          "focus:ring-blue-500/30",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : LeftIcon ? (
          <LeftIcon className="w-4 h-4 shrink-0" />
        ) : null}
        {children}
        {!loading && RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
      </button>
    );
  }
);

Button.displayName = "Button";
