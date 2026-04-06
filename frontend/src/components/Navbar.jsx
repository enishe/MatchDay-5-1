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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <>
      {/* TOP NAV — Desktop */}
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
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Match</span>
          <span style={{ color: '#27ae60' }}>Day</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400 }}>5+1</span>
        </div>

        <ul className="desktop-menu" style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}>
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

        <button onClick={() => setDark(d => !d)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, width: 36, height: 36, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      {/* BOTTOM NAV — Mobile only */}
      <nav className="bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#1a1a2e',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {menuItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: isActive ? '#27ae60' : 'rgba(255,255,255,0.5)',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                borderTop: isActive ? '2px solid #27ae60' : '2px solid transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setDark(d => !d)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, background: 'none', border: 'none',
              borderTop: '2px solid transparent', color: 'rgba(255,255,255,0.5)',
              fontSize: 10, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 20 }}>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>

      <div className="bottom-spacer" style={{ display: 'none', height: 64 }} />
    </>
  );
}