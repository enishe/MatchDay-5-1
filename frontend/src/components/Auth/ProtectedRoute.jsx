import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, token, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Initialize auth state from localStorage on mount
    initAuth();
  }, [initAuth]);

  // Show loading while checking authentication
  if (!token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text/70">Duke verifikuar autentikimin...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-heading font-bold text-text mb-2">
            Akses i Ndaluar
          </h1>
          <p className="text-text/70 mb-6">
            Nuk keni leje të mjaftueshme për të hyrë në këtë faqe.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-accent text-bg rounded-md hover:bg-accent/90 transition-colors"
          >
            Kthehu mbrapa
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
