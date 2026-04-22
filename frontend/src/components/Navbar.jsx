import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { getStoredTheme, toggleTheme, useAuth } from '../context/AuthContext';

function displayName(user) {
  if (!user) return '';
  if (user.name) return user.name;
  const fn = user.firstName || '';
  const ln = user.lastName || '';
  return `${fn} ${ln}`.trim() || user.email || '';
}

function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [dark, setDark] = useState(() => getStoredTheme() === 'dark');
  const ddRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDoc(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const onToggleTheme = () => {
    toggleTheme();
    setDark(getStoredTheme() === 'dark');
  };

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  const links = (
    <>
      {isAdmin ? (
        <>
          <NavLink to="/admin/dashboard" className={navClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/fields" className={navClass}>
            Fushat
          </NavLink>
          <NavLink to="/admin/bookings" className={navClass}>
            Rezervimet
          </NavLink>
          <NavLink to="/admin/players" className={navClass}>
            Lojtarët
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profili
          </NavLink>
        </>
      ) : (
        <>
          <NavLink to="/dashboard" className={navClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/booking" className={navClass}>
            Rezervo
          </NavLink>
          <NavLink to="/equipment" className={navClass}>
            Pajisjet
          </NavLink>
          <NavLink to="/calendar" className={navClass}>
            Kalendari
          </NavLink>
          <NavLink to="/friends" className={navClass}>
            Miqtë
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profili
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="navbar">
      <div className="navbar-start">
        <button
          type="button"
          className="navbar-toggle icon-btn"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <NavLink to={isAdmin ? '/admin/dashboard' : '/dashboard'} className="navbar-brand">
          MatchDay 5+1
        </NavLink>
      </div>

      <nav id="primary-navigation" className={`navbar-nav${menuOpen ? ' open' : ''}`}>
        {links}
      </nav>

      <div className="navbar-actions">
        <button type="button" className="icon-btn" aria-label="Dark mode" onClick={onToggleTheme}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="navbar-user" ref={ddRef}>
          <button
            type="button"
            className="avatar"
            aria-expanded={userOpen}
            aria-haspopup="true"
            onClick={() => setUserOpen((o) => !o)}
          >
            {initials(displayName(user))}
          </button>
          <div className={`user-dropdown${userOpen ? ' open' : ''}`}>
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              {displayName(user)}
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                setUserOpen(false);
                navigate('/login');
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LogOut size={16} /> Dil
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
