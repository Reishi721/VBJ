import { cn } from "../../lib/utils";
import { type LucideIcon } from "lucide-react";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export function Card({ children, className, padding = "none", hover }: CardProps) {
  return (
    <div className={cn(
      "rounded-2xl bg-white border border-gray-100 shadow-sm",
      hover && "hover:shadow-md hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer",
      paddingMap[padding],
      className
    )}>
      {children}
    </div>
  );
}

// ─── StatsCard ────────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  gradientClass?: string;
  trend?: { value: number; isPositive: boolean };
  description?: string;
  className?: string;
}

export function StatsCard({
  title, value, icon: Icon, iconBg = "bg-blue-50", iconColor = "text-blue-600",
  gradientClass = "gradient-primary", trend, description, className
}: StatsCardProps) {
  return (
    <div className={cn(
      "relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden",
      "hover:shadow-md hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-300",
      className
    )}>
      <div className={cn("absolute top-0 left-0 right-0 h-[3px]", gradientClass)} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold",
              trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            )}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        {description && <p className="text-[12px] text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── StatsRow ─────────────────────────────────────────────────────────────────

interface StatItem { label: string; value: string | number; icon: LucideIcon; iconBg: string; iconColor: string; description?: string; }

const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-3 lg:grid-cols-5",
};

export function StatsRow({ stats }: { stats: StatItem[] }) {
  const gridClass = gridColsMap[stats.length] ?? "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={cn("grid gap-4", gridClass)}>
      {stats.map((s, i) => {
        const accentColors = [
          "from-blue-500 to-blue-400",
          "from-violet-500 to-purple-400",
          "from-emerald-500 to-teal-400",
          "from-amber-500 to-orange-400",
          "from-rose-500 to-pink-400",
        ];
        const accent = accentColors[i % accentColors.length];
        return (
          <div key={s.label} className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r", accent)} />
            <div className="p-5 flex items-center gap-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.iconBg)}>
                <s.icon className={cn("w-5 h-5", s.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{s.value}</p>
                {s.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.description}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; }

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-300" />
        </div>
      )}
      <p className="text-base font-semibold text-gray-500">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
