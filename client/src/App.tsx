import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ShiftGuard from './features/shift/ShiftGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './stores/authStore';

import { Toaster } from 'sonner';

// Sign-in and the dashboard load immediately; everything else is fetched when
// first opened, so the first screen appears quickly on a slow connection.
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const PrintableChart = lazy(() => import('./features/reports/PrintableChart'));
const DischargeSummary = lazy(() => import('./features/reports/DischargeSummary'));
const ShiftManager = lazy(() => import('./pages/ShiftManager'));
const VitalsPrintView = lazy(() => import('./features/vitals/VitalsPrintView'));
const IOPrintView = lazy(() => import('./features/io/IOPrintView'));
const MARPrintView = lazy(() => import('./features/medication/MARPrintView'));
const ShiftHistory = lazy(() => import('./pages/ShiftHistory'));
const ShiftPrintView = lazy(() => import('./pages/ShiftPrintView'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

const Loading = () => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading…</div>
);

// One screen failing must not take the rest of the app with it; moving to
// another route clears the error.
function Screens() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients/:id" element={
              <ShiftGuard>
                <PatientDetails />
              </ShiftGuard>
            } />
            <Route path="/print-chart/:id" element={
              <ShiftGuard>
                <PrintableChart />
              </ShiftGuard>
            } />
            <Route path="/discharge/:id" element={
              <ShiftGuard>
                <DischargeSummary />
              </ShiftGuard>
            } />
            <Route path="/print-vitals/:id" element={
              <ShiftGuard>
                <VitalsPrintView />
              </ShiftGuard>
            } />
            <Route path="/print-mar/:id" element={
              <ShiftGuard>
                <MARPrintView />
              </ShiftGuard>
            } />
            <Route path="/print-io/:id" element={
              <ShiftGuard>
                <IOPrintView />
              </ShiftGuard>
            } />

            <Route path="/shift" element={<ShiftManager />} />
            <Route path="/shifts/history" element={<ShiftHistory />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="/print/shift/:id" element={
            <ProtectedRoute>
              <ShiftPrintView />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      <HashRouter>
        <Screens />
      </HashRouter>
    </div>
  );
}

export default App;
