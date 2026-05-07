import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Truck, Package, ClipboardList,
  DollarSign, BarChart3, Settings, ChevronRight, Blocks,
  UserCheck, FileText, LogOut, ShoppingCart, Wallet
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth, type UserRole } from "../../contexts/AuthContext";
import { useCompanySettings } from "../../hooks/useSettings";

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   "Administrator",
  manager: "Manager",
  staff:   "Staff",
  viewer:  "Viewer",
};

const navItems = [
  { name: "Dashboard",       href: "/",            icon: LayoutDashboard, group: "main" },
  { name: "Pelanggan",       href: "/customers",   icon: Users,           group: "main" },
  { name: "Marketing",       href: "/marketing",   icon: UserCheck,       group: "main" },
  { name: "Surat Jalan",     href: "/surat-jalan",      icon: Truck,          group: "operations" },
  { name: "Inventaris",      href: "/inventory",        icon: Package,        group: "operations" },
  { name: "Purchase Order",  href: "/purchase-orders",  icon: ShoppingCart,   group: "operations" },
  { name: "Rekapan Penyewa", href: "/rekapan",          icon: ClipboardList,  group: "operations" },
  { name: "Invoice",         href: "/invoice",     icon: FileText,        group: "finance" },
  { name: "Keuangan",        href: "/finance",     icon: DollarSign,      group: "finance" },
  { name: "Piutang",         href: "/piutang",     icon: Wallet,          group: "finance" },
  { name: "Laporan",         href: "/reports",     icon: BarChart3,       group: "finance" },
  { name: "Pengaturan",      href: "/settings",    icon: Settings,        group: "system" },
];

const groups = [
  { key: "main",       label: "Data Master" },
  { key: "operations", label: "Operasional" },
  { key: "finance",    label: "Keuangan & Laporan" },
  { key: "system",     label: "Sistem" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { data: settingsData } = useCompanySettings();
  const company = settingsData?.company || { name: "", logoUrl: "" };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const emailLabel   = user?.email ?? "";
  const displayName  = profile?.full_name || emailLabel;
  const roleLabel    = ROLE_LABELS[profile?.role ?? "staff"];
  const initials     = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="w-[260px] gradient-sidebar hidden md:flex md:flex-col relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Logo */}
      <div className="h-[72px] flex items-center px-6 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt="Logo"
              className="h-10 w-10 object-contain rounded-lg bg-white/90 p-1 shadow shadow-black/20"
            />
          ) : (
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Blocks size={20} className="text-white" />
            </div>
          )}
          <div>
            <span className="text-white font-bold text-[14px] tracking-tight leading-tight">Victory</span>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">ERP System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 sidebar-scroll relative z-10">
        <nav className="px-3 space-y-4">
          {groups.map((group) => {
            const items = navItems.filter((item) => item.group === group.key);
            return (
              <div key={group.key}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative",
                          isActive
                            ? "bg-blue-500/15 text-blue-400"
                            : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
                        )}
                        <item.icon
                          className={cn(
                            "w-[18px] h-[18px] transition-colors shrink-0",
                            isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                          )}
                        />
                        <span className="flex-1">{item.name}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400/60" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User card + Logout */}
      <div className="p-4 border-t border-white/[0.06] relative z-10 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white text-[12px] font-bold shadow-sm shadow-blue-500/20 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400">{roleLabel}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group text-[13px] font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0 transition-colors" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
