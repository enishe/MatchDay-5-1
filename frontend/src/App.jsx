import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import useAuthStore from './store/authStore';

// Importet e Player
import PlayerFields from './pages/Player/PlayerFields';
import PlayerMatches from './pages/Player/PlayerMatches';
import PlayerInvitations from './pages/Player/PlayerInvitations';
import PlayerProfile from './pages/Player/PlayerProfile';

// Importet e Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminBookings from './pages/Admin/AdminBookings';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminPayments from './pages/Admin/AdminPayments';
import AdminPanel from "./pages/AdminPanel";

// CSS
import './index.css';

// FIX: Ky rresht parandalon gabimin "Notifications is not defined" qe pe sheh ne konsole
const Notifications = () => null;

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // Inicializon gjendjen e perdoruesit sa here qe rifreskohet faqja
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text font-body">
        {/* Navbar qendron lart ne cdo faqe */}
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* --- PUBLIC ROUTES --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* --- PLAYER ROUTES (Te mbrojtura) --- */}
            <Route
              path="/player/fields"
              element={
                <ProtectedRoute>
                  <PlayerFields />
                </ProtectedRoute>
              }
            />
            <Route
              path="/player/my-matches"
              element={
                <ProtectedRoute>
                  <PlayerMatches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/player/invitations"
              element={
                <ProtectedRoute>
                  <PlayerInvitations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/player/profile"
              element={
                <ProtectedRoute>
                  <PlayerProfile />
                </ProtectedRoute>
              }
            />

            {/* --- ADMIN ROUTES (Vetem per rolin admin) --- */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fields"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPayments />
                </ProtectedRoute>
              }
            />

            {/* --- REDIRECTS & ERROR HANDLING --- */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            <Route
              path="*"
              element={
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                  <h1 className="text-9xl font-bold text-accent/20">404</h1>
                  <p className="text-xl text-text/60 -mt-8">Faqja që kërkoni nuk ekziston.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;