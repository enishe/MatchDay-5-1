import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDate, formatBelgradeDateTime } from '../lib/timezone';

function iconForType(type) {
  if (type === 'invite') return '📅';
  if (type === 'invite_accepted') return '✅';
  if (type === 'booking_confirmed') return '✅';
  if (type === 'booking_canceled') return '❌';
  return '🔔';
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/notifications/my', { token })
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((e) => setError(e.message || 'Nuk u ngarkuan njoftimet.'));
  };

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const markRead = async (id) => {
    try {
      await apiFetch(`/notifications/my/${encodeURIComponent(id)}/read`, { token, method: 'PUT' });
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      setError(e.message || 'Nuk u shënua si i lexuar.');
    }
  };

  const removeOne = async (id, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Të fshihet ky njoftim?')) return;
    try {
      await apiFetch(`/notifications/my/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
      setRows((prev) => prev.filter((n) => n.id !== id));
      setError('');
    } catch (err) {
      setError(err.message || 'Nuk u fshi njoftimi.');
    }
  };

  const markAll = async () => {
    try {
      await apiFetch('/notifications/my/read-all', { token, method: 'PUT' });
      setRows((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      setError(e.message || 'Nuk u shënuan si të lexuara.');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Njoftimet</h1>
      {error && <div className="feedback feedback-error">{error}</div>}
      <div className="card">
        <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Njoftimet e mia</div>
          <button type="button" className="btn btn-ghost notifications-mark-all" onClick={markAll}>Shëno të gjitha si të lexuara</button>
        </div>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nuk keni njoftime të reja.</p>
        ) : (
          <div className="notification-list">
            {rows.map((n) => (
              <div
                key={n.id}
                className={`notification-item${n.is_read ? '' : ' notification-item--unread'}`}
              >
                <button
                  type="button"
                  className="notification-item__click"
                  onClick={() => markRead(n.id)}
                >
                  <span className="notification-item__icon" aria-hidden>
                    {iconForType(n.type)}
                  </span>
                  <div className="notification-item__main">
                    <div className="notification-item__top">
                      <span className="notification-item__title">{n.title}</span>
                      <span className="notification-item__time">
                        {formatBelgradeDate(n.created_at, 'sq-AL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {' · '}
                        {formatBelgradeDateTime(n.created_at, 'sq-AL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="notification-item__msg">{n.message}</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="icon-btn notification-item__delete"
                  aria-label="Fshi njoftimin"
                  onClick={(e) => removeOne(n.id, e)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
