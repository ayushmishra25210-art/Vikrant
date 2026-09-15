import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DocumentUploadPage from './pages/DocumentUploadPage';
import DocumentRegistryPage from './pages/DocumentRegistryPage';
import DocumentProvenancePage from './pages/DocumentProvenancePage';
import LedgerPage from './pages/LedgerPage';
import LeakInvestigationPage from './pages/LeakInvestigationPage';
import AuditPage from './pages/AuditPage';
import RecipientDashboard from './pages/RecipientDashboard';
import RecipientHistoryPage from './pages/RecipientHistoryPage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/recipient/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DocumentUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DocumentRegistryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documents/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DocumentProvenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ledger"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leak-investigation"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeakInvestigationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['recipient']}>
                <RecipientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipient/history"
            element={
              <ProtectedRoute allowedRoles={['recipient']}>
                <RecipientHistoryPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
