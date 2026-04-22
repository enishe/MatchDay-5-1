import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState(tabFromUrl === 'users' ? 'users' : 'bookings');
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventoryByField, setInventoryByField] = useState([]);
  const [filtri, setFiltri] = useState('');
  const [fieldForm, setFieldForm] = useState({ name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '' });
  const [loading, setLoading] = useState(true);
  const [mesazhi, setMesazhi] = useState(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'users' || t === 'bookings' || t === 'fields' || t === 'inventory') setTab(t);
  }, [searchParams]);

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
    return apiFetch('/fields/inventory', { token }).then((s) => setInventoryByField(Array.isArray(s) ? s : []));
  }, [token]);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    return apiFetch('/admin/users', { token }).then((u) => setUsers(Array.isArray(u) ? u : []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchBookings(), fetchFields(), fetchShoes(), fetchUsers()])
      .catch(() => tregoBust('Gabim gjatë ngarkimit.', 'error'))
      .finally(() => setLoading(false));
  }, [token, fetchBookings, fetchFields, fetchShoes, fetchUsers, tregoBust]);

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

  const handleCreateField = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!fieldForm.name.trim()) errors.push('Emri i fushës është i detyrueshëm.');
    if (!fieldForm.location.trim()) errors.push('Lokacioni është i detyrueshëm.');
    if (!fieldForm.price_per_hour || Number(fieldForm.price_per_hour) <= 0) errors.push('Çmimi duhet të jetë pozitiv.');
    if (!fieldForm.courts_count || Number(fieldForm.courts_count) <= 0) errors.push('Numri i fushave duhet të jetë pozitiv.');
    if (errors.length) return tregoBust(errors.join(' '), 'error');
    try {
      await apiFetch('/fields', { token, method: 'POST', body: { ...fieldForm, price_per_hour: Number(fieldForm.price_per_hour), courts_count: Number(fieldForm.courts_count) } });
      setFieldForm({ name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '' });
      tregoBust('Fusha u krijua.');
      fetchFields();
      fetchShoes();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleUpdateField = async (f) => {
    try {
      await apiFetch(`/fields/${f.id}`, { token, method: 'PUT', body: { price_per_hour: Number(f.price_per_hour), courts_count: Number(f.courts_count) } });
      tregoBust('Fusha u përditësua.');
      fetchFields();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleDeactivateField = async (id) => {
    try {
      await apiFetch(`/fields/${id}`, { token, method: 'DELETE' });
      tregoBust('Fusha u çaktivizua.');
      fetchFields();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleInventoryQty = async (fieldId, shoeSize, quantity, rentPrice) => {
    try {
      await apiFetch(`/fields/${fieldId}/shoes`, {
        token,
        method: 'PUT',
        body: { inventory: [{ shoe_size: shoeSize, quantity_available: Number(quantity), rent_price: Number(rentPrice) }] },
      });
      tregoBust('Inventari u përditësua.');
      fetchShoes();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

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
        <button type="button" className={`tab${tab === 'users' ? ' tab--active' : ''}`} onClick={() => setTab('users')}>
          Lojtarët
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
          <form onSubmit={handleCreateField} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder="Emri" value={fieldForm.name} onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Lokacioni" value={fieldForm.location} onChange={(e) => setFieldForm((p) => ({ ...p, location: e.target.value }))} />
            <select className="input" value={fieldForm.terrain_type} onChange={(e) => setFieldForm((p) => ({ ...p, terrain_type: e.target.value }))}>
              <option value="artificial_grass">Bar artificial</option>
              <option value="indoor_hall">Sallë e mbyllur</option>
            </select>
            <input className="input" type="number" placeholder="Çmimi/orë" value={fieldForm.price_per_hour} onChange={(e) => setFieldForm((p) => ({ ...p, price_per_hour: e.target.value }))} />
            <input className="input" type="number" placeholder="Numri i fushave" value={fieldForm.courts_count} onChange={(e) => setFieldForm((p) => ({ ...p, courts_count: e.target.value }))} />
            <button type="submit" className="btn btn-accent">Shto fushë</button>
          </form>
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
                  {f.terrain_type} · {f.price_per_hour}€/orë · {f.courts_count || 1} fusha
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{f.location || '—'}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="input" type="number" defaultValue={f.price_per_hour} onBlur={(e) => handleUpdateField({ ...f, price_per_hour: e.target.value, courts_count: f.courts_count || 1 })} />
                  <input className="input" type="number" defaultValue={f.courts_count || 1} onBlur={(e) => handleUpdateField({ ...f, price_per_hour: f.price_per_hour, courts_count: e.target.value })} />
                </div>
                {f.is_active && <button type="button" className="btn btn-danger" style={{ marginTop: 8 }} onClick={() => handleDeactivateField(f.id)}>Çaktivizo</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <h2 className="card-title">Të gjithë lojtarët e regjistruar</h2>
          {users.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka përdorues.</p>}
          {users.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Emri</th>
                    <th>Email</th>
                    <th>Roli</th>
                    <th>Rezervime</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge badge-pending">{u.role}</span>
                      </td>
                      <td>{u.total_bookings || 0}</td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString('sq-AL') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="card">
          <h2 className="card-title">Inventari patikave</h2>
          {inventoryByField.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka të dhëna.</p>}
          {inventoryByField.map((group) => (
            <div key={group.field_id} style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>{group.field_name} — {group.location}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Madhësia</th><th>Sasia</th><th>Çmimi</th></tr>
                  </thead>
                  <tbody>
                    {group.inventory.map((r) => (
                      <tr key={r.shoe_size}>
                        <td>{r.shoe_size}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            defaultValue={r.quantity_available}
                            onBlur={(e) => handleInventoryQty(group.field_id, r.shoe_size, e.target.value, r.rent_price)}
                          />
                        </td>
                        <td>{Number(r.rent_price).toFixed(2)}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
