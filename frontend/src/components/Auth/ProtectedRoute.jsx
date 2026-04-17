import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, token, authHydrated } = useAuthStore();
  const location = useLocation();

  if (!authHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text/70">Duke verifikuar autentikimin...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center px-4">
          <h1 className="text-2xl font-heading font-bold text-text mb-2">Akses i ndaluar</h1>
          <p className="text-text/70 mb-6">
            Nuk keni leje të mjaftueshme për të hyrë në këtë faqe.
          </p>
          <button
            type="button"
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
