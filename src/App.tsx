import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

// ─── Lazy load semua halaman ──────────────────────────────────────────────────
const LoginPage       = lazy(() => import('./pages/LoginPage'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const MarketingPage   = lazy(() => import('./pages/MarketingPage'))
const CustomerPage    = lazy(() => import('./pages/CustomerPage'))
const InventoryPage   = lazy(() => import('./pages/InventoryPage'))
const SuratJalanPage  = lazy(() => import('./pages/SuratJalanPage'))
const InvoicePage     = lazy(() => import('./pages/InvoicePage'))
const SettingsPage    = lazy(() => import('./pages/SettingsPage'))
const RentalRecapPage = lazy(() => import('./pages/RentalRecapPage'))
const ReportsPage     = lazy(() => import('./pages/ReportsPage'))

// ─── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Memuat halaman...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public: Login ───────────────────────────────────────────── */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            }
          />

          {/* ── Protected: semua halaman lain ───────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="marketing" element={<Suspense fallback={<PageLoader />}><MarketingPage /></Suspense>} />
              <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomerPage /></Suspense>} />
              <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
              <Route path="surat-jalan" element={<Suspense fallback={<PageLoader />}><SuratJalanPage /></Suspense>} />
              <Route path="invoice" element={<Suspense fallback={<PageLoader />}><InvoicePage /></Suspense>} />
              <Route path="rekapan" element={<Suspense fallback={<PageLoader />}><RentalRecapPage /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-[60vh]">
                  <h2 className="text-2xl font-bold text-gray-700">Halaman Tidak Ditemukan</h2>
                  <p className="text-gray-400 mt-2">Halaman ini sedang dalam pengembangan.</p>
                </div>
              } />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
