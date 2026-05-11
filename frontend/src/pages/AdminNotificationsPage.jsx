import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDateTime } from '../lib/timezone';

function iconForType(type) {
  if (type === 'invite') return '📅';
  if (type === 'invite_accepted') return '✅';
  if (type === 'booking_confirmed') return '✅';
  if (type === 'booking_canceled') return '❌';
  if (type === 'new_booking') return '📅';
  return '🔔';
}

export default function AdminNotificationsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/notifications', { token })
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setError(e.message || 'Nuk u ngarkuan njoftimet.'));
  };

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const markRead = async (id) => {
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, { token, method: 'PUT' });
      load();
    } catch (e) {
      setError(e.message || 'Veprimi dështoi.');
    }
  };

  const removeOne = async (id, e) => {
    e?.stopPropagation?.();
    if (!window.confirm('Të fshihet ky njoftim?')) return;
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
      setError('');
      load();
    } catch (err) {
      setError(err.message || 'Nuk u fshi njoftimi.');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Njoftimet e adminit</h1>
      {error && <div className="feedback feedback-error">{error}</div>}
      <div className="card">
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nuk ka njoftime.</p>
        ) : (
          <div className="notification-list">
            {rows.map((n) => (
              <div
                key={n.id}
                className={`notification-item${n.is_read ? '' : ' notification-item--unread'}`}
              >
                <button type="button" className="notification-item__click" onClick={() => markRead(n.id)}>
                  <span className="notification-item__icon" aria-hidden>
                    {iconForType(n.type)}
                  </span>
                  <div className="notification-item__main">
                    <span className="notification-item__type-badge">{n.type}</span>
                    <div className="notification-item__top">
                      <span className="notification-item__title">{n.title}</span>
                      <span className="notification-item__time">
                        {formatBelgradeDateTime(n.created_at, 'sq-AL')}
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
