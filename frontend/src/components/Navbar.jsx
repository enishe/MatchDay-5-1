import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { getStoredTheme, toggleTheme, useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

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

function avatarSource(user) {
  const src = String(user?.avatar_url || user?.profile_photo_url || '').trim();
  if (!src) return '';
  if (src.startsWith('data:image')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return '';
}

export default function Navbar() {
  const { user, token, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [dark, setDark] = useState(() => getStoredTheme() === 'dark');
  const [notifOpen, setNotifOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [playerNotifications, setPlayerNotifications] = useState([]);
  const avatarSrc = avatarSource(user);
  const ddRef = useRef(null);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);
  const notifRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    // Avoid cascading renders warning by deferring the state update.
    queueMicrotask(() => setMenuOpen(false));
  }, [location.pathname]);

  useEffect(() => {
    function onDoc(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    const endpoint = isAdmin ? '/notifications/count' : '/notifications/my/count';
    try {
      const r = await apiFetch(endpoint, { token });
      const count = parseInt(r?.count, 10) || 0;
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      if (!active) return;
      await fetchUnreadCount();
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fetchUnreadCount, token]);

  const formatAgo = (value) => {
    const ms = Date.now() - new Date(value).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'Tani';
    if (min < 60) return `${min} minuta më parë`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} orë më parë`;
    const d = Math.floor(h / 24);
    return `${d} ditë më parë`;
  };

  const loadNotifications = () => {
    const endpoint = isAdmin ? '/notifications' : '/notifications/my';
    apiFetch(endpoint, { token })
      .then((r) => {
        const nextList = Array.isArray(r) ? r.slice(0, 5) : [];
        setNotifications(nextList);
        fetchUnreadCount();
      })
      .catch(() => setNotifications([]));
  };

  const markRead = async (id) => {
    const endpoint = isAdmin ? `/notifications/${id}/read` : `/notifications/my/${id}/read`;
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) => {
      const updatedList = prev.map((x) => (x.id === id ? { ...x, is_read: true } : x));
      return updatedList;
    });
    try {
      await apiFetch(endpoint, { token, method: 'PUT' });
    } finally {
      fetchUnreadCount();
    }
  };

  const markAllRead = async () => {
    const endpoint = isAdmin ? '/notifications/read-all' : '/notifications/my/read-all';
    setUnreadCount(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    try {
      await apiFetch(endpoint, { token, method: 'PATCH' });
      loadNotifications();
    } finally {
      fetchUnreadCount();
    }
  };

  const loadPlayerNotifications = () => {
    apiFetch('/notifications/my', { token })
      .then((r) => {
        const nextList = Array.isArray(r) ? r.slice(0, 5) : [];
        setPlayerNotifications(nextList);
        fetchUnreadCount();
      })
      .catch(() => setPlayerNotifications([]));
  };

  const markPlayerRead = async (id) => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setPlayerNotifications((prev) => {
      const updatedList = prev.map((x) => (x.id === id ? { ...x, is_read: true } : x));
      return updatedList;
    });
    try {
      await apiFetch(`/notifications/my/${id}/read`, { token, method: 'PUT' });
    } finally {
      fetchUnreadCount();
    }
  };

  const markAllPlayerRead = async () => {
    setUnreadCount(0);
    setPlayerNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    try {
      await apiFetch('/notifications/my/read-all', { token, method: 'PATCH' });
      loadPlayerNotifications();
    } finally {
      fetchUnreadCount();
    }
  };

  const onAdminBellToggle = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      loadNotifications();
      markAllRead();
    } else {
      fetchUnreadCount();
    }
  };

  const onUserBellToggle = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      loadPlayerNotifications();
      markAllPlayerRead();
    } else {
      fetchUnreadCount();
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onDoc(e) {
      const target = e.target;
      if (navRef.current && navRef.current.contains(target)) return;
      if (menuButtonRef.current && menuButtonRef.current.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener('pointerdown', onDoc, { passive: true });
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [menuOpen]);

  const onToggleTheme = () => {
    toggleTheme();
    setDark(getStoredTheme() === 'dark');
  };

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  const links = (
    <>
      {isAdmin ? (
        <>
          <NavLink to="/admin/dashboard" className={navClass} end onClick={() => setMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/fields" className={navClass} onClick={() => setMenuOpen(false)}>
            Fushat
          </NavLink>
          <NavLink to="/admin/bookings" className={navClass} onClick={() => setMenuOpen(false)}>
            Rezervimet
          </NavLink>
          <NavLink to="/admin/players" className={navClass} onClick={() => setMenuOpen(false)}>
            Lojtarët
          </NavLink>
          <NavLink to="/admin/calendar" className={navClass} onClick={() => setMenuOpen(false)}>
            Kalendari
          </NavLink>
        </>
      ) : (
        <>
          <NavLink to="/dashboard" className={navClass} end onClick={() => setMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/booking" className={navClass} onClick={() => setMenuOpen(false)}>
            Rezervo
          </NavLink>
          <NavLink to="/equipment" className={navClass} onClick={() => setMenuOpen(false)}>
            Pajisjet
          </NavLink>
          <NavLink to="/calendar" className={navClass} onClick={() => setMenuOpen(false)}>
            Kalendari
          </NavLink>
          <NavLink to="/friends" className={navClass} onClick={() => setMenuOpen(false)}>
            Miqtë
          </NavLink>
          <NavLink to="/profile" className={navClass} onClick={() => setMenuOpen(false)}>
            Profili
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="navbar">
      <div className="navbar-start">
        <NavLink to={isAdmin ? '/admin/dashboard' : '/dashboard'} className="navbar-brand">
          MatchDay 5+1
        </NavLink>
      </div>

      <nav
        id="primary-navigation"
        className={`navbar-nav${menuOpen ? ' open' : ''}`}
        ref={navRef}
      >
        {links}
      </nav>

      <div className="navbar-actions">
        <button
          type="button"
          ref={menuButtonRef}
          className="navbar-toggle icon-btn"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} /> : <span aria-hidden style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>☰</span>}
        </button>
        <button type="button" className="icon-btn" aria-label="Dark mode" onClick={onToggleTheme}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {!!user && isAdmin && (
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Njoftimet"
              onClick={onAdminBellToggle}
            >
              <span aria-hidden style={{ fontSize: 18 }}>🔔</span>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, background: '#e74c3c', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="user-dropdown notif-dropdown open">
                <button type="button" onClick={markAllRead} style={{ fontWeight: 700 }}>
                  Shëno të gjitha si të lexuara
                </button>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    style={{ borderLeft: n.is_read ? '3px solid transparent' : '3px solid #3498db', marginBottom: 4 }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {n.type === 'invite'
                        ? '📅'
                        : n.type === 'invite_accepted'
                          ? '✅'
                          : n.type === 'booking_confirmed'
                            ? '✅'
                            : n.type === 'booking_canceled'
                              ? '❌'
                              : n.type === 'new_booking'
                                ? '📅'
                                : '🔔'}{' '}
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'normal' }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatAgo(n.created_at)}</div>
                  </button>
                ))}
                <button type="button" onClick={() => navigate('/admin/notifications')}>
                  Shiko të gjitha
                </button>
              </div>
            )}
          </div>
        )}
        {!!user && !isAdmin && (
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Njoftimet"
              onClick={onUserBellToggle}
            >
              <span aria-hidden style={{ fontSize: 18 }}>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#e74c3c',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="bell-dropdown">
                <button
                  type="button"
                  onClick={markAllPlayerRead}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontWeight: 700 }}
                >
                  Shëno të gjitha si të lexuara
                </button>
                {playerNotifications.length === 0 ? (
                  <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nuk keni njoftime të reja.
                  </div>
                ) : (
                  playerNotifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markPlayerRead(n.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderLeft: n.is_read ? '3px solid transparent' : '3px solid #3498db',
                        marginBottom: 4,
                        borderBottom: '1px solid var(--border-color)',
                        padding: '10px',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {n.type === 'invite'
                          ? '📅'
                          : n.type === 'invite_accepted'
                            ? '✅'
                            : n.type === 'booking_confirmed'
                              ? '✅'
                              : n.type === 'booking_canceled'
                                ? '❌'
                                : n.type === 'new_booking'
                                  ? '📅'
                                  : '🔔'}{' '}
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'normal' }}>
                        {String(n.message || '').length > 60 ? `${String(n.message || '').slice(0, 60)}...` : String(n.message || '')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatAgo(n.created_at)}</div>
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen(false);
                    navigate('/notifications');
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
                >
                  Shiko të gjitha
                </button>
              </div>
            )}
          </div>
        )}
        <div className="navbar-user" ref={ddRef}>
          <button
            type="button"
            className="avatar"
            aria-expanded={userOpen}
            aria-haspopup="true"
            onClick={() => setUserOpen((o) => !o)}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName(user) || 'User avatar'}
                className="avatar-img"
                width="40"
                height="40"
                style={{ display: 'block' }}
              />
            ) : (
              initials(displayName(user))
            )}
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
