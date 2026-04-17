import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, Trophy } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Notifications from '../Realtime/Notifications';
import Button from '../UI/Button';

const playerNavItems = [
  { path: '/player/fields', label: 'Fushat', icon: '🏟️' },
  { path: '/player/my-matches', label: 'Ndeshjet e Mia', icon: '⚽' },
  { path: '/player/invitations', label: 'Ftesat', icon: '📩' },
  { path: '/player/profile', label: 'Profili', icon: '👤' },
];

const adminNavItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/bookings', label: 'Rezervimet', icon: '📅' },
  { path: '/admin/users', label: 'Përdoruesit', icon: '👥' },
  { path: '/admin/fields', label: 'Fushat', icon: '🏟️' },
  { path: '/admin/payments', label: 'Pagesat', icon: '💰' },
];

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

  const isActivePath = (path) => location.pathname === path;

  const isPlayerArea = () => isOrganizer() || isParticipant();

  const getNavItems = () => {
    if (isAdmin()) return adminNavItems;
    if (isPlayerArea()) return playerNavItems;
    return [];
  };

  const navItems = getNavItems();

  return (
    <nav className="glass-panel border-b border-border/40 sticky top-0 z-50 rounded-none border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex min-w-0 flex-1 items-center">
            <Link
              to={user ? (isAdmin() ? '/admin/dashboard' : '/player/fields') : '/login'}
              className="flex min-w-0 items-center gap-2 group shrink-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <span className="text-lg sm:text-xl font-heading font-bold gradient-text truncate">
                MATCHDAY
              </span>
            </Link>

            {navItems.length > 0 && (
              <div className="hidden md:flex ml-6 lg:ml-10 flex-wrap gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActivePath(item.path)
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-text-muted hover:text-text hover:bg-panel-light'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user && <Notifications />}

            {!user && (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-text-muted hover:text-text px-3 py-2 rounded-lg hover:bg-panel-light transition-colors"
                >
                  Kyçu
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-primary px-3 py-2 rounded-lg border border-primary/40 hover:bg-primary/10 transition-colors"
                >
                  Regjistrohu
                </Link>
              </div>
            )}

            {user && (
              <div className="hidden md:flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-bg-light/50 rounded-lg border border-border/40">
                <User className="h-4 w-4 text-text-muted shrink-0" />
                <span className="text-sm font-medium text-text truncate max-w-[10rem] lg:max-w-[14rem]">
                  {user.name}
                </span>
              </div>
            )}

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Dalja</span>
              </Button>
            )}

            {(navItems.length > 0 || !user) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Mbyll menunë' : 'Hap menunë'}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-panel/95 backdrop-blur-md border-t border-border/40 animate-slide-up max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto">
          <div className="px-3 pt-3 pb-5 space-y-1">
            {!user && (
              <div className="flex flex-col gap-2 pb-3 border-b border-border/40">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-medium text-text-muted hover:text-text hover:bg-panel-light"
                >
                  Kyçu
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-medium text-primary border border-primary/40 hover:bg-primary/10"
                >
                  Regjistrohu
                </Link>
              </div>
            )}

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
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {user && (
              <div className="border-t border-border/40 pt-3 mt-2 space-y-2">
                <div className="flex items-center gap-2 px-4 py-3 text-text-muted bg-bg-light/50 rounded-lg">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Dalja</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
