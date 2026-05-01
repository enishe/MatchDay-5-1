import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function iconForType(type) {
  if (type === 'invite') return '📅';
  if (type === 'invite_accepted') return '✅';
  if (type === 'booking_confirmed') return '✅';
  if (type === 'booking_canceled') return '❌';
  return '🔔';
}

function formatAgo(value) {
  const ms = Date.now() - new Date(value).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Tani';
  if (min < 60) return `${min} minuta më parë`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} orë më parë`;
  const d = Math.floor(h / 24);
  return `${d} ditë më parë`;
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
      await apiFetch(`/notifications/my/${id}/read`, { token, method: 'PUT' });
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      setError(e.message || 'Nuk u shënua si i lexuar.');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Njoftimet e mia</div>
          <button type="button" className="btn btn-ghost" onClick={markAll}>Shëno të gjitha si të lexuara</button>
        </div>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nuk keni njoftime të reja.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', textAlign: 'left', borderLeft: n.is_read ? '3px solid transparent' : '3px solid #3498db' }}
                onClick={() => markRead(n.id)}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{iconForType(n.type)} {n.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{n.message}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatAgo(n.created_at)} · {n.is_read ? 'Lexuar' : 'Palexuar'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
