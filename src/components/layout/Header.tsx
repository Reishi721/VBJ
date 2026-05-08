import { useState, useRef, useEffect } from "react";
import { Bell, CalendarDays, LogOut, User, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchBar } from "../ui";
import { useAuth, type UserRole } from "../../contexts/AuthContext";

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   "Administrator",
  manager: "Manager",
  staff:   "Staff",
  viewer:  "Viewer",
};

const PAGE_TITLES: Record<string, string> = {
  "/":            "Dashboard",
  "/customers":   "Pelanggan",
  "/marketing":   "Marketing",
  "/inventory":   "Inventaris",
  "/surat-jalan": "Surat Jalan",
  "/drivers":     "Supir",
  "/helpers":     "Helper",
  "/invoice":     "Invoice",
  "/rekapan":     "Rekapan Penyewa",
  "/ritase":      "Rekap Ritase Supir",
  "/reports":     "Laporan",
  "/settings":    "Pengaturan",
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Halaman";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat Pagi";
    if (h < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Tutup menu saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut();
    navigate("/login", { replace: true });
  };

  // Label & inisial — prioritaskan full_name dari profil
  const emailLabel  = user?.email ?? "admin@erp.com";
  const displayName = profile?.full_name || emailLabel;
  const roleLabel   = ROLE_LABELS[profile?.role ?? "staff"];
  const initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-[72px] bg-white/70 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">{pageTitle}</h1>
        <p className="text-[12px] text-gray-400 font-medium -mt-0.5">
          {greeting()} 👋 — {today}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden lg:block w-64">
          <SearchBar
            value=""
            onChange={() => {}}
            placeholder="Cari data..."
            containerClassName="w-full"
            className="bg-gray-100/80 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg focus:shadow-blue-500/5"
          />
        </div>

        {/* Date badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100/80 text-xs text-gray-500 font-medium">
          <CalendarDays className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </div>

        {/* Notification */}
        <button className="relative p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100/80 transition-all duration-200">
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            id="header-user-btn"
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100/80 transition-all duration-200"
          >
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white text-[12px] font-bold shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[12px] font-semibold text-gray-800 max-w-[120px] truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 -mt-0.5">{roleLabel}</p>
            </div>
            <ChevronDown className={`hidden md:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-gray-200 shadow-xl shadow-gray-200/60 z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-[12px] font-bold text-gray-800 truncate">{displayName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{emailLabel}</p>
              </div>

              {/* Menu items */}
              <div className="p-1.5">
                <button
                  id="header-profile-btn"
                  onClick={() => { setShowUserMenu(false); navigate("/settings"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-[13px] font-medium text-gray-700">Profil & Pengaturan</span>
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  id="header-logout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span className="text-[13px] font-medium text-red-600">Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
