import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut, User, Trophy } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Notifications from '../Realtime/Notifications';
import Button from '../UI/Button';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, isOrganizer, isParticipant } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const getNavItems = () => {
    const items = [];

    if (isParticipant()) {
      items.push(
        { path: '/player/fields', label: 'Fushat', icon: '🏟️' },
        { path: '/player/my-matches', label: 'Ndeshjet e Mia', icon: '⚽' },
        { path: '/player/invitations', label: 'Ftesat', icon: '📩' },
        { path: '/player/profile', label: 'Profili', icon: '👤' }
      );
    }

    if (isOrganizer()) {
      items.push(
        { path: '/player/fields', label: 'Krijo Ndeshje', icon: '➕' },
        { path: '/player/my-matches', label: 'Ndeshjet e Mia', icon: '📋' },
        { path: '/player/profile', label: 'Profili', icon: '👤' }
      );
    }

    if (isAdmin()) {
      items.push(
        { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/admin/bookings', label: 'Rezervimet', icon: '📅' },
        { path: '/admin/users', label: 'Përdoruesit', icon: '👥' },
        { path: '/admin/fields', label: 'Fushat', icon: '🏟️' },
        { path: '/admin/payments', label: 'Pagesat', icon: '💰' }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <nav className="glass-panel border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-heading font-bold gradient-text">MATCHDAY</span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex ml-10 space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActivePath(item.path)
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-text-muted hover:text-text hover:bg-panel-light'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-3">
            {/* Real-time Notifications */}
            <Notifications />

            {/* User info - Desktop */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-bg-light/50 rounded-lg border border-border">
              <User className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text">{user?.name}</span>
            </div>

            {/* Logout button - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Dalja</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-panel/95 backdrop-blur-md border-t border-border animate-slide-up">
          <div className="px-4 pt-4 pb-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActivePath(item.path)
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-panel-light'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              <div className="flex items-center space-x-2 px-4 py-3 text-text-muted bg-bg-light/50 rounded-lg">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.name}</span>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full flex items-center justify-start space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Dalja</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
