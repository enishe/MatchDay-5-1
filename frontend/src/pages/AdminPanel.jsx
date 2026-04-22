import { useCallback, useEffect, useMemo, useState } from 'react';
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

const SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

function terrainLabel(value) {
  if (value === 'artificial_grass') return 'Bar Artificial';
  if (value === 'indoor_hall') return 'Sallë Futsali';
  return value || '—';
}

export default function AdminPanel({ section = 'dashboard' }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(section);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null); // /api/admin/stats
  const [todayByField, setTodayByField] = useState([]);
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventoryByField, setInventoryByField] = useState([]);
  const [inventoryDraft, setInventoryDraft] = useState({});
  const [filtri, setFiltri] = useState('');
  const [fieldForm, setFieldForm] = useState({ name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '1' });
  const [loading, setLoading] = useState(true);
  const [mesazhi, setMesazhi] = useState(null);

  useEffect(() => {
    setTab(section);
  }, [section]);

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

  const fetchAdminStats = useCallback(() => {
    if (!token) return;
    return apiFetch('/admin/stats', { token }).then((s) => setStats(s && typeof s === 'object' ? s : null));
  }, [token]);

  const fetchTodayByField = useCallback(() => {
    if (!token) return;
    return apiFetch('/admin/today-bookings', { token }).then((rows) => setTodayByField(Array.isArray(rows) ? rows : []));
  }, [token]);

  const fetchFields = useCallback(() => {
    if (!token) return;
    return apiFetch('/fields', { token }).then((f) => setFields(Array.isArray(f) ? f : []));
  }, [token]);

  const fetchShoes = useCallback(() => {
    if (!token) return;
    return apiFetch('/fields/inventory', { token }).then((s) => {
      const grouped = Array.isArray(s) ? s : [];
      setInventoryByField(grouped);
      const draft = {};
      grouped.forEach((g) => {
        draft[g.field_id] = {};
        SIZES.forEach((size) => {
          const found = (g.inventory || []).find((r) => Number(r.shoe_size) === size);
          draft[g.field_id][size] = {
            quantity_available: found ? Number(found.quantity_available) : 0,
            rent_price: found ? Number(found.rent_price) : 2,
          };
        });
      });
      setInventoryDraft(draft);
    });
  }, [token]);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    return apiFetch('/admin/users', { token }).then((u) => setUsers(Array.isArray(u) ? u : []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchBookings(), fetchAdminStats(), fetchTodayByField(), fetchFields(), fetchShoes(), fetchUsers()])
      .catch(() => tregoBust('Gabim gjatë ngarkimit.', 'error'))
      .finally(() => setLoading(false));
  }, [token, fetchBookings, fetchAdminStats, fetchTodayByField, fetchFields, fetchShoes, fetchUsers, tregoBust]);

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
      setFieldForm({ name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '1' });
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
      fetchTodayByField();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleDeactivateField = async (id) => {
    try {
      await apiFetch(`/fields/${id}`, { token, method: 'DELETE' });
      tregoBust('Fusha u çaktivizua.');
      fetchFields();
      fetchTodayByField();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const updateInventoryDraft = (fieldId, size, key, value) => {
    setInventoryDraft((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || {}),
        [size]: {
          ...(prev[fieldId]?.[size] || { quantity_available: 0, rent_price: 2 }),
          [key]: value,
        },
      },
    }));
  };

  const handleSaveInventory = async (fieldId) => {
    try {
      const source = inventoryDraft[fieldId] || {};
      const payload = SIZES.map((size) => ({
        shoe_size: size,
        quantity_available: Number(source[size]?.quantity_available ?? 0),
        rent_price: Number(source[size]?.rent_price ?? 2),
      }));
      await apiFetch(`/fields/${fieldId}/shoes`, {
        token,
        method: 'PUT',
        body: { inventory: payload },
      });
      tregoBust('Inventari u përditësua.');
      fetchShoes();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const statCards = useMemo(
    () => (stats
      ? [
          { label: 'Të ardhurat totale', value: `${Number(stats.total_revenue || 0).toFixed(2)}€`, accent: '#3498db' },
          { label: 'Të ardhurat sot', value: `${Number(stats.today_revenue || 0).toFixed(2)}€`, accent: '#27ae60' },
          { label: 'Të ardhurat këtë javë', value: `${Number(stats.week_revenue || 0).toFixed(2)}€`, accent: '#8e44ad' },
          { label: 'Numri total i rezervimeve', value: Number(stats.total_bookings || 0), accent: '#f39c12' },
        ]
      : []),
    [stats]
  );

  return (
    <div className="page">
      <h1 className="page-title">Paneli i Adminit</h1>
      <p className="page-subtitle">Menaxhimi i platformës me të dhëna reale</p>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>{mesazhi.tekst}</div>
      )}

      <div className="tabs">
        <button type="button" className={`tab${tab === 'dashboard' ? ' tab--active' : ''}`} onClick={() => { setTab('dashboard'); navigate('/admin/dashboard'); }}>
          Dashboard
        </button>
        <button type="button" className={`tab${tab === 'fields' ? ' tab--active' : ''}`} onClick={() => { setTab('fields'); navigate('/admin/fields'); }}>
          Fushat
        </button>
        <button type="button" className={`tab${tab === 'bookings' ? ' tab--active' : ''}`} onClick={() => { setTab('bookings'); navigate('/admin/bookings'); }}>
          Rezervimet
        </button>
        <button type="button" className={`tab${tab === 'players' ? ' tab--active' : ''}`} onClick={() => { setTab('players'); navigate('/admin/players'); }}>
          Lojtarët
        </button>
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="stat-grid-4" style={{ marginBottom: 20 }}>
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ '--stat-accent': s.accent }}>
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="card-title">Rezervimet e konfirmuara sot sipas fushës</h2>
            {todayByField.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha aktive.</p>}
            {todayByField.map((group) => (
              <div key={group.field_id} style={{ marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <h3 style={{ marginBottom: 6 }}>{group.field_name} — {group.location}</h3>
                <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                  Rezervime të konfirmuara sot: <strong>{group.confirmed_bookings_today}</strong> ·
                  Të ardhura sot: <strong>{Number(group.revenue_today || 0).toFixed(2)}€</strong>
                </p>
                {group.bookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Sot nuk ka rezervime të konfirmuara.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Numri i fushës</th><th>Ora</th><th>Vlera</th></tr>
                      </thead>
                      <tbody>
                        {group.bookings.map((b) => (
                          <tr key={b.booking_id}>
                            <td>{b.court_number || '—'}</td>
                            <td>{new Date(b.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{Number(b.total_price || 0).toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="stat-grid-3" style={{ marginTop: 16 }}>
            <div className="stat-card"><div className="stat-card-label">Fusha aktive</div><div className="stat-card-value">{stats?.total_fields || 0}</div></div>
            <div className="stat-card"><div className="stat-card-label">Lojtarë të regjistruar</div><div className="stat-card-value">{stats?.total_players || 0}</div></div>
            <div className="stat-card"><div className="stat-card-label">Rezervime në pritje</div><div className="stat-card-value">{stats?.pending_bookings || 0}</div></div>
          </div>
        </>
      )}

      {tab === 'bookings' && (
        <>
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
            <input className="input" placeholder="Emri i fushës" value={fieldForm.name} onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Lokacioni" value={fieldForm.location} onChange={(e) => setFieldForm((p) => ({ ...p, location: e.target.value }))} />
            <select className="input" value={fieldForm.terrain_type} onChange={(e) => setFieldForm((p) => ({ ...p, terrain_type: e.target.value }))}>
              <option value="artificial_grass">Bar Artificial</option>
              <option value="indoor_hall">Sallë Futsali</option>
            </select>
            <input className="input" type="number" placeholder="Çmimi për orë" value={fieldForm.price_per_hour} onChange={(e) => setFieldForm((p) => ({ ...p, price_per_hour: e.target.value }))} />
            <input className="input" type="number" min="1" max="10" placeholder="Numri i fushave" value={fieldForm.courts_count} onChange={(e) => setFieldForm((p) => ({ ...p, courts_count: e.target.value }))} />
            <button type="submit" className="btn btn-accent">Shto fushë</button>
          </form>
          {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha.</p>}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Emri</th><th>Lokacioni</th><th>Terreni</th><th>Çmimi/orë</th><th>Nr. fushash</th><th>Statusi</th><th>Veprimet</th></tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.id}>
                    <td>{f.id}</td>
                    <td>{f.name}</td>
                    <td>{f.location || '—'}</td>
                    <td>{terrainLabel(f.terrain_type)}</td>
                    <td>{Number(f.price_per_hour || 0).toFixed(2)}€</td>
                    <td>{f.courts_count || 1}</td>
                    <td><span className={`badge ${f.is_active ? 'badge-confirmed' : 'badge-canceled'}`}>{f.is_active ? 'Aktive' : 'Joaktive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => {
                          const p = window.prompt('Çmimi i ri për orë', String(f.price_per_hour || ''));
                          const c = window.prompt('Numri i ri i fushave', String(f.courts_count || 1));
                          if (p == null || c == null) return;
                          handleUpdateField({ ...f, price_per_hour: p, courts_count: c });
                        }}>Ndrysho</button>
                        {f.is_active && <button type="button" className="btn btn-danger" onClick={() => handleDeactivateField(f.id)}>Çaktivizo</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 16 }}>Inventari i patikave për secilën fushë</h3>
          {inventoryByField.map((group) => (
            <div key={group.field_id} style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>{group.field_name}</h4>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Madhësia</th><th>Sasia</th><th>Çmimi i qirasë</th></tr></thead>
                  <tbody>
                    {SIZES.map((size) => (
                      <tr key={`${group.field_id}-${size}`}>
                        <td>{size}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={inventoryDraft[group.field_id]?.[size]?.quantity_available ?? 0}
                            onChange={(e) => updateInventoryDraft(group.field_id, size, 'quantity_available', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryDraft[group.field_id]?.[size]?.rent_price ?? 2}
                            onChange={(e) => updateInventoryDraft(group.field_id, size, 'rent_price', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-accent" onClick={() => handleSaveInventory(group.field_id)}>Ruaj inventarin</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'players' && (
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

    </div>
  );
}
