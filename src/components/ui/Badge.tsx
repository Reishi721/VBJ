import { cn } from "../../lib/utils";

type BadgeVariant = "blue" | "emerald" | "amber" | "red" | "purple" | "cyan" | "gray";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  gray:    { bg: "bg-gray-100",   text: "text-gray-600",    dot: "bg-gray-400" },
};

export function Badge({ variant = "gray", dot = false, children, className }: BadgeProps) {
  const s = styles[variant];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
      s.bg, s.text, className
    )}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />}
      {children}
    </span>
  );
}

// Pre-built status badges
const statusMap: Record<string, BadgeVariant> = {
  active: "emerald", aktif: "emerald", selesai: "emerald", completed: "emerald",
  pending: "amber",
  inactive: "gray", "non-aktif": "gray",
  terlambat: "red", cancelled: "red", overdue: "red",
  maintenance: "amber",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = statusMap[status.toLowerCase()] ?? "gray";
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={variant} dot className={className}>{displayLabel}</Badge>;
}
