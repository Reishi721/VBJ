import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  phone: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Buat profile default jika tabel profiles belum ada / unreachable */
const makeDefaultProfile = (userId: string): UserProfile => ({
  id: userId,
  full_name: null,
  avatar_url: null,
  role: "staff",
  is_active: true,
  phone: null,
});

/** Fetch profile dengan timeout 5 detik agar tidak hang selamanya */
const fetchProfileSafe = async (userId: string): Promise<UserProfile> => {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, is_active, phone")
        .eq("id", userId)
        .single(),
      // Timeout 6 detik
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 6000)
      ),
    ]);

    if (error) {
      // Jangan tampilkan 500/404 di console produksi — cukup gunakan default
      if (import.meta.env.DEV) {
        console.warn("[Auth] profiles fetch:", error.message);
      }
      return makeDefaultProfile(userId);
    }

    if (data) return data as UserProfile;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[Auth] fetchProfileSafe threw:", e);
    }
  }
  return makeDefaultProfile(userId);
};


// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  // Guard: pastikan setLoading(false) selalu dipanggil max 8 detik
  const loadingGuard = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLoadingGuard = () => {
    if (loadingGuard.current) clearTimeout(loadingGuard.current);
    loadingGuard.current = setTimeout(() => {
      console.warn("[Auth] Loading timeout — force-resolving");
      setLoading(false);
    }, 8000);
  };

  const clearLoadingGuard = () => {
    if (loadingGuard.current) {
      clearTimeout(loadingGuard.current);
      loadingGuard.current = null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const p = await fetchProfileSafe(session.user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    startLoadingGuard();

    // ─ 1. Cek session yang sudah ada (dari localStorage) ─
    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;

        if (error) {
          // Session invalid/corrupt → bersihkan dan redirect ke login
          console.warn("[Auth] getSession error:", error.message);
          await supabase.auth.signOut().catch(() => null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          clearLoadingGuard();
          return;
        }

        setSession(data.session);

        if (data.session?.user) {
          const p = await fetchProfileSafe(data.session.user.id);
          if (mounted) setProfile(p);
        }

        if (mounted) {
          setLoading(false);
          clearLoadingGuard();
        }
      })
      .catch(async (err) => {
        // getSession() sendiri throw (jaringan mati, dll)
        console.warn("[Auth] getSession threw:", err);
        if (!mounted) return;

        // Coba baca dari onAuthStateChange saja — jangan hang
        setSession(null);
        setProfile(null);
        setLoading(false);
        clearLoadingGuard();
      });

    // ─ 2. Listen perubahan auth state (login / logout / token refresh) ─
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // INITIAL_SESSION sudah ditangani oleh getSession() di atas
        // Hindari double-fetch
        if (event === "INITIAL_SESSION") return;

        setSession(newSession);

        if (newSession?.user) {
          const p = await fetchProfileSafe(newSession.user.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }

        // Pastikan loading selesai jika event apapun datang
        if (mounted) {
          setLoading(false);
          clearLoadingGuard();
        }
      }
    );

    return () => {
      mounted = false;
      clearLoadingGuard();
      subscription.unsubscribe();
    };
  }, []);

  // ─── signIn ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials"))
        return { error: "Email atau password salah. Silakan coba lagi." };
      if (error.message.includes("Email not confirmed"))
        return { error: "Email belum dikonfirmasi. Cek inbox Anda." };
      if (error.message.includes("Too many requests"))
        return { error: "Terlalu banyak percobaan. Tunggu beberapa menit." };
      if (error.message.includes("User not allowed"))
        return { error: "Akun Anda telah dinonaktifkan. Hubungi administrator." };
      return { error: error.message };
    }
    return { error: null };
  };

  // ─── signOut ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const role           = profile?.role ?? "staff";
  const isAdmin        = role === "admin";
  const isManagerOrAbove = role === "admin" || role === "manager";

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin,
      isManagerOrAbove,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}
