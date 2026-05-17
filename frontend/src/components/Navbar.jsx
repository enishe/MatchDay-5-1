import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, Trash2, X } from 'lucide-react';
import { getStoredTheme, toggleTheme, useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

function iconForNotificationType(type) {
  if (type === 'invite') return '📅';
  if (type === 'invite_accepted') return '✅';
  if (type === 'booking_confirmed') return '✅';
  if (type === 'booking_canceled') return '❌';
  if (type === 'new_booking') return '📅';
  return '🔔';
}

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

function truncateNotificationMessage(text, maxLen = 150) {
  const s = String(text || '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

function avatarSource(user) {
  const src = String(user?.avatar_url || user?.profile_photo_url || '').trim();
  if (!src) return '';
  if (src.startsWith('data:image')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return '';
}

export default function Navbar() {
  const { user, token, logout, isAdmin, isSuperAdmin, isFieldAdmin, isStaffAdmin } = useAuth();
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
    const endpoint = isStaffAdmin ? '/notifications/count' : '/notifications/my/count';
    try {
      const r = await apiFetch(endpoint, { token });
      const count = parseInt(r?.count, 10) || 0;
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [isStaffAdmin, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const pollMs = 60000;
    const tick = () => {
      if (!active || document.visibilityState !== 'visible') return;
      fetchUnreadCount();
    };
    fetchUnreadCount();
    const id = setInterval(tick, pollMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnreadCount();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
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

  const fetchBellNotifications = useCallback(async () => {
    if (!token) return;
    const endpoint = isStaffAdmin ? '/notifications' : '/notifications/my';
    try {
      const r = await apiFetch(endpoint, { token });
      const nextList = Array.isArray(r) ? r.slice(0, 5) : [];
      if (isStaffAdmin) setNotifications(nextList);
      else setPlayerNotifications(nextList);
    } catch {
      if (isStaffAdmin) setNotifications([]);
      else setPlayerNotifications([]);
    }
  }, [token, isStaffAdmin]);

  const markAllBellNotificationsRead = useCallback(async () => {
    if (!token) return;
    setUnreadCount(0);
    if (isStaffAdmin) setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    else setPlayerNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    const path = isStaffAdmin ? '/notifications/admin/read-all' : '/notifications/my/read-all';
    try {
      await apiFetch(path, { token, method: 'PUT' });
    } catch {
      fetchUnreadCount();
    }
  }, [token, isStaffAdmin, fetchUnreadCount]);

  const bellDropdownOpen = isStaffAdmin ? notifOpen : bellOpen;

  useEffect(() => {
    if (!bellDropdownOpen || !token) return undefined;
    fetchBellNotifications();
    const timer = setTimeout(() => {
      markAllBellNotificationsRead();
    }, 2000);
    return () => clearTimeout(timer);
  }, [bellDropdownOpen, token, fetchBellNotifications, markAllBellNotificationsRead]);

  const markRead = async (id) => {
    if (isStaffAdmin) {
      const endpoint = `/notifications/${encodeURIComponent(id)}/read`;
      let wasUnread = false;
      setNotifications((prev) => {
        const row = prev.find((x) => x.id === id);
        wasUnread = Boolean(row && !row.is_read);
        return prev.map((x) => (x.id === id ? { ...x, is_read: true } : x));
      });
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await apiFetch(endpoint, { token, method: 'PUT' });
      } finally {
        fetchUnreadCount();
      }
      return;
    }
    const endpoint = `/notifications/my/${encodeURIComponent(id)}/read`;
    let wasUnread = false;
    setPlayerNotifications((prev) => {
      const row = prev.find((x) => x.id === id);
      wasUnread = Boolean(row && !row.is_read);
      return prev.map((x) => (x.id === id ? { ...x, is_read: true } : x));
    });
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiFetch(endpoint, { token, method: 'PUT' });
    } finally {
      fetchUnreadCount();
    }
  };

  const onAdminBellToggle = () => {
    setNotifOpen((prev) => {
      if (prev) queueMicrotask(() => fetchUnreadCount());
      return !prev;
    });
  };

  const onUserBellToggle = () => {
    setBellOpen((prev) => {
      if (prev) queueMicrotask(() => fetchUnreadCount());
      return !prev;
    });
  };

  const deleteAdminNotif = async (id, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Të fshihet ky njoftim?')) return;
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      fetchUnreadCount();
    } catch {
      fetchUnreadCount();
    }
  };

  const deletePlayerNotif = async (id, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Të fshihet ky njoftim?')) return;
    try {
      await apiFetch(`/notifications/my/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
      setPlayerNotifications((prev) => prev.filter((x) => x.id !== id));
      fetchUnreadCount();
    } catch {
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

  const brandTarget = isSuperAdmin
    ? '/superadmin'
    : isStaffAdmin
      ? '/admin/dashboard'
      : '/dashboard';

  const links = (
    <>
      {isSuperAdmin ? (
        <NavLink to="/superadmin" className={navClass} end onClick={() => setMenuOpen(false)}>
          Super Admin
        </NavLink>
      ) : isFieldAdmin ? (
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
          <NavLink to="/admin/calendar" className={navClass} onClick={() => setMenuOpen(false)}>
            Kalendari
          </NavLink>
        </>
      ) : isAdmin ? (
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
        <NavLink to={brandTarget} className="navbar-brand">
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
        {!!user && isStaffAdmin && !isSuperAdmin && (
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
                <div className="notification-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item${n.is_read ? '' : ' notification-item--unread'}`}
                    >
                      <button type="button" className="notification-item__click" onClick={() => markRead(n.id)}>
                        <span className="notification-item__icon" aria-hidden>
                          {iconForNotificationType(n.type)}
                        </span>
                        <div className="notification-item__main">
                          <div className="notification-item__top">
                            <span className="notification-item__title">{n.title}</span>
                            <span className="notification-item__time">{formatAgo(n.created_at)}</span>
                          </div>
                          <div className="notification-item__msg">{truncateNotificationMessage(n.message)}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="icon-btn notification-item__delete"
                        aria-label="Fshi njoftimin"
                        onClick={(e) => deleteAdminNotif(n.id, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => navigate('/admin/notifications')}>
                  Shiko të gjitha
                </button>
              </div>
            )}
          </div>
        )}
        {!!user && !isStaffAdmin && (
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
                {playerNotifications.length === 0 ? (
                  <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nuk keni njoftime të reja.
                  </div>
                ) : (
                  <div className="notification-list">
                    {playerNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notification-item${n.is_read ? '' : ' notification-item--unread'}`}
                      >
                        <button type="button" className="notification-item__click" onClick={() => markRead(n.id)}>
                          <span className="notification-item__icon" aria-hidden>
                            {iconForNotificationType(n.type)}
                          </span>
                          <div className="notification-item__main">
                            <div className="notification-item__top">
                              <span className="notification-item__title">{n.title}</span>
                              <span className="notification-item__time">{formatAgo(n.created_at)}</span>
                            </div>
                            <div className="notification-item__msg">{truncateNotificationMessage(n.message || '')}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="icon-btn notification-item__delete"
                          aria-label="Fshi njoftimin"
                          onClick={(e) => deletePlayerNotif(n.id, e)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
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
        {!!user && isSuperAdmin ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LogOut size={16} /> Dil
            </span>
          </button>
        ) : !!user && isFieldAdmin ? (
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
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {displayName(user)}
              </div>
              <div>{user?.email || ''}</div>
            </div>
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                navigate('/profile');
              }}
            >
              Profili & Fjalëkalimi
            </button>
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
        ) : (
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
        )}
      </div>
    </header>
  );
}
