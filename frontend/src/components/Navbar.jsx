import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/',          label: 'Dashboard'  },
  { path: '/booking',   label: 'Rezervo'    },
  { path: '/equipment', label: 'Pajisjet'   },
  { path: '/admin',     label: 'Admin'      },
];

export default function Navbar() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const s = {
    nav: {
      background: '#1a1a2e',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
    logo: {
      color: '#fff',
      fontWeight: 700,
      fontSize: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    logoAccent: { color: '#27ae60' },
    menu: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      listStyle: 'none',
    },
    link: (active) => ({
      color: active ? '#27ae60' : 'rgba(255,255,255,0.75)',
      padding: '6px 14px',
      borderRadius: 6,
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      background: active ? 'rgba(39,174,96,0.12)' : 'transparent',
      transition: 'all 0.15s',
      display: 'block',
    }),
    toggle: {
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      borderRadius: 6,
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 16,
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
    right: { display: 'flex', alignItems: 'center', gap: 8 },
  };

  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        <span>Match</span>
        <span style={s.logoAccent}>Day</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400 }}>5+1</span>
      </div>

      <ul style={s.menu}>
        {menuItems.map(item => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => s.link(isActive)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div style={s.right}>
        <button style={s.toggle} onClick={() => setDark(d => !d)} title="Dark mode">
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}