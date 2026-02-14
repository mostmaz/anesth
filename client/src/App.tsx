import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PatientDetails from './pages/PatientDetails';
import PrintableChart from './features/reports/PrintableChart';
import DischargeSummary from './features/reports/DischargeSummary';
import ShiftGuard from './features/shift/ShiftGuard';
import ShiftManager from './pages/ShiftManager';
import VitalsPrintView from './features/vitals/VitalsPrintView';
import IOPrintView from './features/io/IOPrintView';
import MARPrintView from './features/medication/MARPrintView';
import ShiftHistory from './pages/ShiftHistory';
import ShiftPrintView from './pages/ShiftPrintView';
import { useAuthStore } from './stores/authStore';
import { type ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <BrowserRouter>
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
            <Route path="/admin" element={<div className="p-8">Admin Panel (Coming Soon)</div>} />
          </Route>

          <Route path="/print/shift/:id" element={
            <ProtectedRoute>
              <ShiftPrintView />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
