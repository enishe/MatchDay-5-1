import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleMatches(userRole, required) {
  if (!required) return true;
  if (userRole === required) return true;
  if (required === 'participant' && userRole === 'player') return true;
  if (required === 'player' && userRole === 'participant') return true;
  return false;
}

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !roleMatches(user.role, requiredRole)) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <h1 className="page-title">Akses i ndaluar</h1>
        <p className="page-subtitle">Nuk keni leje për këtë faqe.</p>
        <button type="button" className="btn btn-ghost" onClick={() => window.history.back()}>
          Kthehu mbrapa
        </button>
      </div>
    );
  }

  return children;
}
