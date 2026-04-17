import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut, User, Trophy, Settings } from 'lucide-react';
import useAuthStore from '../../store/authStore';

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
        { path: '/admin/inventory', label: 'Inventari', icon: '👟' },
        { path: '/admin/payments', label: 'Pagesat', icon: '💰' }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-panel border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-accent" />
              <span className="text-xl font-heading font-bold text-accent">MATCHDAY</span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex ml-10 space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-primary text-text'
                      : 'text-text/70 hover:text-text hover:bg-primary/50'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {/* Real-time Notifications */}
            <Notifications />

            {/* User menu */}
            <div className="relative hidden md:block">
              <button className="flex items-center space-x-2 text-text/70 hover:text-text transition-colors">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">{user?.name}</span>
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-2 text-text/70 hover:text-text transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Dalja</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-text/70 hover:text-text transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-panel border-t border-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActivePath(item.path)
                    ? 'bg-primary text-text'
                    : 'text-text/70 hover:text-text hover:bg-primary/50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            
            <div className="border-t border-border pt-4 mt-4">
              <div className="px-3 py-2 text-text/70">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user?.name}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-text/70 hover:text-text hover:bg-primary/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span>Dalja</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
