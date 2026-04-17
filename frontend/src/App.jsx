import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BookingPage from './pages/BookingPage';
import MatchDetail from './pages/MatchDetail';
import Equipment from './pages/Equipment';
import AdminPanel from './pages/AdminPanel';

function AppShell({ children }) {
  const location = useLocation();
  const hideNav = location.pathname === '/login' || location.pathname === '/register';
  return (
    <div className="app-shell">
      {!hideNav && <Navbar />}
      <div className={hideNav ? undefined : 'app-main'}>{children}</div>
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/match/:id"
            element={
              <ProtectedRoute>
                <MatchDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <Equipment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <div className="page" style={{ textAlign: 'center', padding: '64px 16px' }}>
                <h1 className="page-title">404</h1>
                <p className="page-subtitle">Faqja nuk u gjet.</p>
                <Link to="/dashboard" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: 16 }}>
                  Te dashboard
                </Link>
              </div>
            }
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
