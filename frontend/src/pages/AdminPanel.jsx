import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function statusBadgeClass(status) {
  if (status === 'confirmed') return 'badge-confirmed';
  if (status === 'pending') return 'badge-pending';
  return 'badge-canceled';
}

function statusLabel(status) {
  if (status === 'confirmed') return 'Konfirmuar';
  if (status === 'pending') return 'Në pritje';
  if (status === 'canceled') return 'Anuluar';
  return status;
}

export default function AdminPanel() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('bookings');
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [fields, setFields] = useState([]);
  const [shoes, setShoes] = useState([]);
  const [filtri, setFiltri] = useState('');
  const [loading, setLoading] = useState(true);
  const [mesazhi, setMesazhi] = useState(null);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  }, []);

  const fetchBookings = useCallback(() => {
    if (!token) return;
    const q = filtri ? `?status=${encodeURIComponent(filtri)}` : '';
    return Promise.all([
      apiFetch(`/matches${q}`, { token }),
      apiFetch('/matches/stats', { token }),
    ]).then(([m, s]) => {
      setMatches(Array.isArray(m) ? m : []);
      setStats(s && typeof s === 'object' ? s : null);
    });
  }, [token, filtri]);

  const fetchFields = useCallback(() => {
    if (!token) return;
    return apiFetch('/fields', { token }).then((f) => setFields(Array.isArray(f) ? f : []));
  }, [token]);

  const fetchShoes = useCallback(() => {
    if (!token) return;
    return apiFetch('/shoes/inventory', { token }).then((s) => setShoes(Array.isArray(s) ? s : []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchBookings(), fetchFields(), fetchShoes()])
      .catch(() => tregoBust('Gabim gjatë ngarkimit.', 'error'))
      .finally(() => setLoading(false));
  }, [token, fetchBookings, fetchFields, fetchShoes, tregoBust]);

  const handleFshi = async (id) => {
    if (!window.confirm(`Fshi rezervimin #${id}?`)) return;
    try {
      await apiFetch(`/matches/${id}`, { token, method: 'DELETE' });
      tregoBust(`Rezervimi #${id} u fshi.`);
      fetchBookings();
    } catch (e) {
      tregoBust(e.message, 'error');
    }
  };

  const handleNdrysho = async (id, status) => {
    try {
      await apiFetch(`/matches/${id}`, { token, method: 'PUT', body: { status } });
      tregoBust('Statusi u përditësua.');
      fetchBookings();
    } catch (e) {
      tregoBust(e.message, 'error');
    }
  };

  const inventoryBySize = shoes.reduce((acc, row) => {
    const sz = row.size;
    if (!acc[sz]) acc[sz] = { size: sz, total: 0, available: 0, conditions: [] };
    acc[sz].total += 1;
    if (row.available) acc[sz].available += 1;
    acc[sz].conditions.push(row.condition);
    return acc;
  }, {});

  const inventoryRows = Object.values(inventoryBySize).sort((a, b) => a.size - b.size);

  const statCards = stats
    ? [
        { label: 'Gjithsej', value: stats.total, accent: '#5a6072' },
        { label: 'Të ardhurat', value: `${stats.totali_cmimit ?? 0}€`, accent: '#3498db' },
        { label: 'Konfirmuara', value: stats.confirmed, accent: '#27ae60' },
        { label: 'Në pritje', value: stats.pending, accent: '#f39c12' },
      ]
    : [];

  return (
    <div className="page">
      <h1 className="page-title">Panel Admin</h1>
      <p className="page-subtitle">Rezervimet, fushat dhe inventari i patikave</p>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>{mesazhi.tekst}</div>
      )}

      <div className="tabs">
        <button type="button" className={`tab${tab === 'bookings' ? ' tab--active' : ''}`} onClick={() => setTab('bookings')}>
          Rezervimet
        </button>
        <button type="button" className={`tab${tab === 'fields' ? ' tab--active' : ''}`} onClick={() => setTab('fields')}>
          Fushat
        </button>
        <button type="button" className={`tab${tab === 'inventory' ? ' tab--active' : ''}`} onClick={() => setTab('inventory')}>
          Inventari
        </button>
      </div>

      {tab === 'bookings' && (
        <>
          {statCards.length > 0 && (
            <div className="stat-grid-4" style={{ marginBottom: 20 }}>
              {statCards.map((s) => (
                <div key={s.label} className="stat-card" style={{ '--stat-accent': s.accent }}>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <h2 className="card-title" style={{ marginBottom: 0, flex: 1 }}>
                Të gjitha rezervimet
              </h2>
              <select className="input" style={{ maxWidth: 200 }} value={filtri} onChange={(e) => setFiltri(e.target.value)}>
                <option value="">Të gjitha statuset</option>
                <option value="pending">Në pritje</option>
                <option value="confirmed">Konfirmuara</option>
                <option value="canceled">Anuluara</option>
              </select>
              <button type="button" className="btn btn-accent" onClick={() => navigate('/booking')}>
                + Rezervim i ri
              </button>
            </div>

            {loading && <p style={{ color: 'var(--text-muted)' }}>Duke ngarkuar…</p>}
            {!loading && matches.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>Nuk ka rezervime për këtë filtrim.</p>
            )}
            {!loading && matches.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fusha</th>
                      <th>Data / ora</th>
                      <th>Çmimi</th>
                      <th>Split</th>
                      <th>Statusi</th>
                      <th>Veprimet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id}>
                        <td>#{m.id}</td>
                        <td>{m.field_name || `#${m.field_id}`}</td>
                        <td>{new Date(m.start_time).toLocaleString('sq-AL')}</td>
                        <td>{m.total_price}€</td>
                        <td>{m.price_per_player}€</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(m.status)}`}>{statusLabel(m.status)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => navigate(`/match/${m.id}`)}>
                              Hap
                            </button>
                            {m.status === 'pending' && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: 12, padding: '6px 10px' }}
                                onClick={() => handleNdrysho(m.id, 'confirmed')}
                              >
                                Konfirmo
                              </button>
                            )}
                            <button type="button" className="btn btn-danger" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleFshi(m.id)}>
                              Fshi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'fields' && (
        <div className="card">
          <h2 className="card-title">Fushat</h2>
          {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {fields.map((f) => (
              <div key={f.id} className="stat-card" style={{ '--stat-accent': f.is_active ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <strong>{f.name}</strong>
                  <span className={`badge ${f.is_active ? 'badge-confirmed' : 'badge-canceled'}`}>
                    {f.is_active ? 'Aktive' : 'Joaktive'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                  {f.terrain_label} · {f.price_per_hour}€/orë
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{f.location || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="card">
          <h2 className="card-title">Inventari patikave</h2>
          {inventoryRows.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka të dhëna.</p>}
          {inventoryRows.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Madhësia</th>
                    <th>Palët totale</th>
                    <th>Disponueshme</th>
                    <th>Gjendja</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((r) => {
                    const poor = r.conditions.filter((c) => c === 'poor').length;
                    const fair = r.conditions.filter((c) => c === 'fair').length;
                    const gj =
                      poor > r.total / 2 ? 'Keq' : fair > 0 ? 'Mesatare' : 'Mirë';
                    return (
                      <tr key={r.size}>
                        <td>
                          <strong>{r.size}</strong>
                        </td>
                        <td>{r.total}</td>
                        <td>{r.available}</td>
                        <td>{gj}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
