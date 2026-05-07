import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Blocks } from "lucide-react";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  // Tampilkan splash loading saat mengecek session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Blocks size={24} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Memuat sistem...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect ke login kalau belum auth
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
