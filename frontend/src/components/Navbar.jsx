import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/',          label: 'Dashboard', icon: '⚽' },
  { path: '/booking',   label: 'Rezervo',   icon: '📅' },
  { path: '/equipment', label: 'Pajisjet',  icon: '👟' },
  { path: '/admin',     label: 'Admin',     icon: '⚙️' },
];

export default function Navbar() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Mbyll menunë kur klikohet link
  const handleNav = () => setOpen(false);

  return (
    <>
      <nav style={{
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
      }}>
        {/* Logo */}
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Match</span>
          <span style={{ color: '#27ae60' }}>Day</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400 }}>5+1</span>
        </div>

        {/* Desktop menu */}
        <ul style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}
            className="desktop-menu">
          {menuItems.map(item => (
            <li key={item.path}>
              <NavLink to={item.path} end={item.path === '/'}
                style={({ isActive }) => ({
                  color: isActive ? '#27ae60' : 'rgba(255,255,255,0.75)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(39,174,96,0.12)' : 'transparent',
                  display: 'block',
                })}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDark(d => !d)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, width: 36, height: 36, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Hamburger — vetëm mobile */}
          <button onClick={() => setOpen(o => !o)} className="hamburger"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          background: '#1a1a2e',
          zIndex: 99,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 0',
        }}>
          {menuItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'}
              onClick={handleNav}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 24px',
                color: isActive ? '#27ae60' : 'rgba(255,255,255,0.85)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 15,
                borderLeft: isActive ? '3px solid #27ae60' : '3px solid transparent',
                background: isActive ? 'rgba(39,174,96,0.08)' : 'transparent',
              })}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* CSS për responsive */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-menu { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}