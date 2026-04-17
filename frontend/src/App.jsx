import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import useAuthStore from './store/authStore';

// Import page components
import PlayerFields from './pages/Player/PlayerFields';
import PlayerMatches from './pages/Player/PlayerMatches';
import PlayerInvitations from './pages/Player/PlayerInvitations';
import PlayerProfile from './pages/Player/PlayerProfile';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminBookings from './pages/Admin/AdminBookings';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminInventory from './pages/Admin/AdminInventory';
import AdminPayments from './pages/Admin/AdminPayments';
import AdminPanel from "./pages/AdminPanel";

// Import Tailwind CSS
import './index.css';

// FIX: Nese gabimi vjen nga mungesa e importit te Notifications
// Nese ke nje komponent Notifications, importoje: import Notifications from './...';
const Notifications = () => null; 

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // Inicializimi i gjendjes se autentikimit
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text font-body">
        <Navbar />
        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Player routes */}
            <Route 
              path="/player/fields" 
              element={<ProtectedRoute><PlayerFields /></ProtectedRoute>} 
            />
            <Route 
              path="/player/my-matches" 
              element={<ProtectedRoute><PlayerMatches /></ProtectedRoute>} 
            />
            <Route 
              path="/player/invitations" 
              element={<ProtectedRoute><PlayerInvitations /></ProtectedRoute>} 
            />
            <Route 
              path="/player/profile" 
              element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} 
            />

            {/* Admin routes */}
            <Route 
              path="/admin/dashboard" 
              element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/bookings" 
              element={<ProtectedRoute requiredRole="admin"><AdminBookings /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/users" 
              element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/fields" 
              element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/inventory" 
              element={<ProtectedRoute requiredRole="admin"><AdminInventory /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/payments" 
              element={<ProtectedRoute requiredRole="admin"><AdminPayments /></ProtectedRoute>} 
            />

            {/* Home & 404 */}
            <Route path="/" element={<ProtectedRoute><PlayerFields /></ProtectedRoute>} />
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="text-center">
                  <h1 className="text-4xl font-heading font-bold text-text mb-4">404</h1>
                  <p className="text-text/70">Faqja nuk u gjet</p>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;