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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
