import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDateTime } from '../lib/timezone';

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

  const removeOne = async (id) => {
    if (!window.confirm('Të fshihet ky njoftim?')) return;
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}`, { token, method: 'DELETE' });
      setError('');
      load();
    } catch (e) {
      setError(e.message || 'Nuk u fshi njoftimi.');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Njoftimet e adminit</h1>
      {error && <div className="feedback feedback-error">{error}</div>}
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Lloji</th><th>Titulli</th><th>Mesazhi</th><th>Koha</th><th>Statusi</th><th>Veprime</th></tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td>{n.type}</td>
                  <td>{n.title}</td>
                  <td>{n.message}</td>
                  <td>{formatBelgradeDateTime(n.created_at, 'sq-AL')}</td>
                  <td>{n.is_read ? 'Lexuar' : 'Palexuar'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {!n.is_read ? (
                        <button type="button" className="btn btn-ghost" onClick={() => markRead(n.id)}>Shëno si lexuar</button>
                      ) : null}
                      <button type="button" className="icon-btn btn-ghost" aria-label="Fshi" onClick={() => removeOne(n.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
