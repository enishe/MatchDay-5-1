import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MapPin, 
  Package, 
  CreditCard, 
  Settings,
  LogOut,
  Trophy,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      description: 'Përmbledhja e statistikave'
    },
    {
      title: 'Rezervimet',
      icon: Calendar,
      path: '/admin/bookings',
      description: 'Menaxho rezervimet'
    },
    {
      title: 'Përdoruesit',
      icon: Users,
      path: '/admin/users',
      description: 'Menaxho përdoruesit'
    },
    {
      title: 'Fushat',
      icon: MapPin,
      path: '/admin/fields',
      description: 'Menaxho fushat'
    },
    {
      title: 'Inventari',
      icon: Package,
      path: '/admin/inventory',
      description: 'Menaxho patikat'
    },
    {
      title: 'Pagesat',
      icon: CreditCard,
      path: '/admin/payments',
      description: 'Menaxho pagesat'
    },
    {
      title: 'Cilësimet',
      icon: Settings,
      path: '/admin/settings',
      description: 'Cilësimet e platformës'
    }
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-accent rounded-lg shadow-lg"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40
          bg-panel border-r border-border
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-heading font-bold text-text">
                  MATCHDAY
                </h1>
                <p className="text-xs text-text/70">Panel Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 right-2 p-1 text-text/50 hover:text-accent transition-colors hidden lg:block"
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </button>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-primary text-accent border border-accent/30' 
                    : 'text-text/70 hover:bg-primary/30 hover:text-text'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.title : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-accent' : ''}`} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-text/50 truncate">{item.description}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-accent font-bold">A</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">Admin</div>
                <div className="text-xs text-text/50 truncate">admin@matchday.com</div>
              </div>
            )}
            <button
              className={`p-2 text-text/50 hover:text-red-400 transition-colors ${isCollapsed ? 'hidden' : ''}`}
              title="Dil"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
