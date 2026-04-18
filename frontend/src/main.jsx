import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider, initThemeFromStorage } from './context/AuthContext';
import useAuthStore from './store/authStore';
import App from './App.jsx';

initThemeFromStorage();
useAuthStore.getState().initAuth();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
