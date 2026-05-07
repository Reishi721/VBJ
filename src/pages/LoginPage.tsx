import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertCircle, Lock, Mail } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCompanySettings } from "../hooks/useSettings";

export default function LoginPage() {
  const { signIn, session, loading: authLoading } = useAuth();
  const { data: settingsData } = useCompanySettings();
  const company = settingsData?.company || { name: "PT. Victory Bersatu Jaya", logoUrl: "" };
  const navigate = useNavigate();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Jika sudah login, langsung redirect ke dashboard
  if (!authLoading && session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] gradient-sidebar p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl -translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-lg shadow-black/20">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Victory Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl font-black text-blue-900">V</span>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-[16px] tracking-tight">{company.name.trim()}</p>
            <p className="text-slate-400 text-[11px] font-medium">{company.tagline}</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
              Sistem Manajemen Terpadu
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Kelola Bisnis<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Scaffolding
            </span>
            <br />Lebih Mudah
          </h1>
          <p className="text-slate-400 text-[14px] leading-relaxed max-w-sm">
            Platform ERP lengkap untuk manajemen inventaris, sewa, invoicing, dan laporan keuangan dalam satu sistem terintegrasi.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["📦 Inventaris Real-time", "📄 Invoice Otomatis", "📊 Laporan Keuangan", "🚚 Surat Jalan Digital"].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[12px] text-slate-300 font-medium">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-slate-500 text-[12px]">
            © 2026 PT. Victory Bersatu Jaya — All rights reserved
          </p>
        </div>
      </div>

      {/* ── Right panel: Login Form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-[#f8f9fc]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-white rounded-xl p-1 flex items-center justify-center shadow shadow-gray-200">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg font-black text-blue-900">V</span>
            )}
          </div>
          <span className="text-gray-900 font-bold text-[16px]">{company.name.trim()}</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Selamat Datang 👋</h2>
            <p className="text-gray-400 text-[14px] mt-1.5">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[13px] font-bold text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@perusahaan.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-[13px] font-bold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 mt-2 rounded-xl gradient-primary text-white font-semibold text-[14px] shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-8 text-center text-[12px] text-gray-400">
            Masalah login? Hubungi administrator sistem Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
