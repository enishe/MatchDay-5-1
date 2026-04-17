import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import useAuthStore from './store/authStore';

// Lazy load components for better performance
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));

const PlayerFields = lazy(() => import('./pages/Player/PlayerFields'));
const PlayerMatches = lazy(() => import('./pages/Player/PlayerMatches'));
const PlayerInvitations = lazy(() => import('./pages/Player/PlayerInvitations'));
const PlayerProfile = lazy(() => import('./pages/Player/PlayerProfile'));

const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminBookings = lazy(() => import('./pages/Admin/AdminBookings'));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminPayments = lazy(() => import('./pages/Admin/AdminPayments'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// CSS
import './index.css';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // Inicializon gjendjen e perdoruesit sa here qe rifreskohet faqja
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-bg text-text font-body">
        {/* Navbar qendron lart ne cdo faqe */}
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <Suspense fallback={<LoadingSpinner />}>
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
                  <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
                    <h1 className="text-9xl font-heading font-bold gradient-text">404</h1>
                    <p className="text-xl text-text/60 -mt-8">Faqja që kërkoni nuk ekziston.</p>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;