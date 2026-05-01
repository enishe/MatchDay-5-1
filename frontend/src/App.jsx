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
import CalendarPage from './pages/CalendarPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';
import JoinBookingPage from './pages/JoinBookingPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import NotificationsPage from './pages/NotificationsPage';

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
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function PlayerOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
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
                <PlayerOnlyRoute>
                  <Dashboard />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <PlayerOnlyRoute>
                  <BookingPage />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/join/:token"
            element={
              <ProtectedRoute>
                <PlayerOnlyRoute>
                  <JoinBookingPage />
                </PlayerOnlyRoute>
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
                <PlayerOnlyRoute>
                  <Equipment />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <PlayerOnlyRoute>
                  <CalendarPage />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <PlayerOnlyRoute>
                  <FriendsPage />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <PlayerOnlyRoute>
                  <NotificationsPage />
                </PlayerOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOnlyRoute>
                  <AdminPanel section="dashboard" />
                </AdminOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fields"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOnlyRoute>
                  <AdminPanel section="fields" />
                </AdminOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOnlyRoute>
                  <AdminPanel section="bookings" />
                </AdminOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/players"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOnlyRoute>
                  <AdminPanel section="players" />
                </AdminOnlyRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminOnlyRoute>
                  <AdminNotificationsPage />
                </AdminOnlyRoute>
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
