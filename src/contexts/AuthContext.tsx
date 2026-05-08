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
const makeDefaultProfile = (userId: string): UserProfile => ({
  id: userId,
  full_name: null,
  avatar_url: null,
  role: "staff",
  is_active: true,
  phone: null,
});

/**
 * Fetch profile dengan timeout 5 detik.
 * TIDAK memblokir loading UI — dipanggil di background.
 */
const fetchProfileSafe = async (userId: string): Promise<UserProfile> => {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, is_active, phone")
        .eq("id", userId)
        .maybeSingle(),
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 5000)
      ),
    ]);

    if (error) {
      if (import.meta.env.DEV) console.warn("[Auth] profiles fetch:", error.message);
      return makeDefaultProfile(userId);
    }
    if (data) return data as UserProfile;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[Auth] fetchProfileSafe threw:", e);
  }
  return makeDefaultProfile(userId);
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Hard safety net: jika tidak ada event sama sekali dalam 4 detik, buka UI
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafety = () => {
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
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

    // Safety net: paksa buka UI setelah 4 detik jika event tidak kunjung datang
    safetyTimer.current = setTimeout(() => {
      if (import.meta.env.DEV) console.warn("[Auth] Safety timeout — force-resolving");
      if (mounted) setLoading(false);
    }, 4000);

    /**
     * ✅ PATTERN SUPABASE V2 YANG BENAR:
     * onAuthStateChange + INITIAL_SESSION menggantikan getSession().
     * Event INITIAL_SESSION SELALU dipanggil pertama, berisi session dari cache localStorage.
     * Ini sinkron (dari cache) — tidak ada network request → tidak ada delay.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (import.meta.env.DEV) console.log("[Auth] event:", event);

        if (event === "INITIAL_SESSION") {
          // ✅ KUNCI FIX: Set session & loading(false) SEGERA dari cache localStorage.
          // Profile di-fetch di background — tidak memblokir render.
          setSession(newSession);
          setLoading(false);   // ← UI langsung muncul!
          clearSafety();

          // Fetch profile di background setelah UI sudah render
          if (newSession?.user) {
            fetchProfileSafe(newSession.user.id).then((p) => {
              if (mounted) setProfile(p);
            });
          }
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setSession(newSession);
          setLoading(false);
          clearSafety();
          if (newSession?.user) {
            fetchProfileSafe(newSession.user.id).then((p) => {
              if (mounted) setProfile(p);
            });
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setProfile(null);
          setLoading(false);
          clearSafety();
          return;
        }

        if (event === "USER_UPDATED") {
          setSession(newSession);
          if (newSession?.user) {
            fetchProfileSafe(newSession.user.id).then((p) => {
              if (mounted) setProfile(p);
            });
          }
          return;
        }
      }
    );

    return () => {
      mounted = false;
      clearSafety();
      subscription.unsubscribe();
    };
  }, []);

  // ─── signIn ─────────────────────────────────────────────────────────────────
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

  // ─── signOut ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const role = profile?.role ?? "staff";
  const isAdmin = role === "admin";
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
