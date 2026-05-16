import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDate, formatBelgradeDateTime, getBelgradeTodayYmd } from '../lib/timezone';
import FieldAdminDashboard from '../components/FieldAdminDashboard';

const CHART_BAR_COLOR = '#00b86b';

function truncateName(name, maxLen = 12) {
  const s = String(name || '').trim();
  if (s.length <= maxLen) return s || '—';
  return `${s.slice(0, maxLen)}…`;
}

function truncateOrganizer(name, maxLen = 14) {
  const s = String(name || '').trim();
  if (!s) return '—';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...`;
}

function shoesText(summary) {
  if (!summary) return 'Pa patika';
  if (typeof summary === 'string') {
    const trimmed = summary.trim();
    if (!trimmed || trimmed === 'Pa patika') return 'Pa patika';
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => `${s.count} palë nr.${s.size}`).join(', ');
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  if (Array.isArray(summary) && summary.length > 0) {
    return summary.map((s) => `${s.count} palë nr.${s.size}`).join(', ');
  }
  return 'Pa patika';
}

const ADMIN_COURT_CELL_BASE = {
  padding: '8px',
  borderRadius: '6px',
  textAlign: 'center',
  fontSize: '13px',
  minWidth: '120px',
  width: '100%',
  boxSizing: 'border-box',
};

function adminCourtCellStyle(status) {
  if (status === 'past') {
    return {
      ...ADMIN_COURT_CELL_BASE,
      background: 'rgba(107, 114, 128, 0.15)',
      border: '1px solid rgba(107, 114, 128, 0.2)',
      color: '#6b7280',
      cursor: 'default',
    };
  }
  if (status === 'booked') {
    return {
      ...ADMIN_COURT_CELL_BASE,
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      cursor: 'pointer',
    };
  }
  return {
    ...ADMIN_COURT_CELL_BASE,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
    cursor: 'default',
  };
}

function DashboardStatSkeleton() {
  return (
    <div className="stat-grid-4" style={{ marginBottom: 20 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="stat-card admin-stat-skeleton" style={{ minHeight: 88 }} />
      ))}
    </div>
  );
}

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
  if (value === 'indoor_hall') return 'Sallë e mbyllur';
  if (value === 'futsal') return 'Futsal';
  return value || '—';
}

export default function AdminPanel({ section = 'dashboard' }) {
  const { token, isFieldAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(section);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null); // /api/admin/stats
  const [todayByField, setTodayByField] = useState([]);
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedInventoryFieldId, setSelectedInventoryFieldId] = useState('');
  const [selectedFieldInventory, setSelectedFieldInventory] = useState([]);
  const [bulkInventoryDraft, setBulkInventoryDraft] = useState({});
  const [inventorySaving, setInventorySaving] = useState(false);
  const [filtri, setFiltri] = useState('');
  const [fieldForm, setFieldForm] = useState({
    name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '1', is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [mesazhi, setMesazhi] = useState(null);
  const [calendarFieldId, setCalendarFieldId] = useState('');
  const [calendarDate, setCalendarDate] = useState(() => getBelgradeTodayYmd());
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [revenueChart, setRevenueChart] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingPlatformField, setEditingPlatformField] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (isFieldAdmin && section === 'players') {
      setTab('dashboard');
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    setTab(section);
  }, [section, isFieldAdmin, navigate]);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  }, []);

  const fetchBookings = useCallback(() => {
    if (!token) return;
    const q = filtri ? `?status=${encodeURIComponent(filtri)}` : '';
    return apiFetch(`/matches${q}`, { token }).then((m) => {
      setMatches(Array.isArray(m) ? m : []);
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

  const fetchUsers = useCallback(() => {
    if (!token || isFieldAdmin) return Promise.resolve();
    return apiFetch('/admin/users', { token }).then((u) => setUsers(Array.isArray(u) ? u : []));
  }, [token, isFieldAdmin]);

  const fetchRevenueChart = useCallback(() => {
    if (!token) return Promise.resolve();
    return apiFetch('/admin/revenue-chart', { token })
      .then((r) => {
        const rows = Array.isArray(r?.data) ? r.data : [];
        setRevenueChart(
          rows.map((row) => ({
            name: row.weekdayLabel || row.date,
            revenue: Number(row.revenue || 0),
          }))
        );
      })
      .catch(() => setRevenueChart([]));
  }, [token]);

  const fetchAdminFieldCalendar = useCallback(async (fieldIdArg, dateArg) => {
    const fieldId = Number(fieldIdArg || calendarFieldId);
    const selectedDate = String(dateArg || calendarDate || getBelgradeTodayYmd());
    if (!token || !Number.isInteger(fieldId) || fieldId <= 0) return;
    setCalendarLoading(true);
    try {
      const qs = new URLSearchParams({
        fieldId: String(fieldId),
        date: selectedDate,
      });
      const data = await apiFetch(`/admin/field-calendar?${qs.toString()}`, { token });
      setCalendarData(data && typeof data === 'object' ? data : null);
    } catch (e) {
      setCalendarData(null);
      tregoBust(e.message || 'Nuk u ngarkua kalendari i fushës.', 'error');
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarDate, calendarFieldId, token, tregoBust]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchBookings(),
      fetchAdminStats(),
      fetchTodayByField(),
      fetchFields(),
      fetchUsers(),
      fetchRevenueChart(),
    ])
      .catch(() => tregoBust('Gabim gjatë ngarkimit.', 'error'))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
      });
  }, [token, fetchBookings, fetchAdminStats, fetchTodayByField, fetchFields, fetchUsers, fetchRevenueChart, tregoBust]);

  useEffect(() => {
    if (!token || tab !== 'bookings') return;
    setBookingsLoading(true);
    fetchBookings()
      .catch(() => tregoBust('Gabim gjatë ngarkimit të rezervimeve.', 'error'))
      .finally(() => setBookingsLoading(false));
  }, [token, tab, filtri, fetchBookings, tregoBust]);

  useEffect(() => {
    if (!calendarFieldId && fields.length > 0) {
      const firstActive = fields.find((f) => f.is_active) || fields[0];
      if (firstActive) setCalendarFieldId(String(firstActive.id));
    }
  }, [calendarFieldId, fields]);

  useEffect(() => {
    if (tab !== 'calendar') return;
    if (!calendarFieldId) return;
    fetchAdminFieldCalendar(calendarFieldId, calendarDate);
  }, [tab, calendarFieldId, calendarDate, fetchAdminFieldCalendar]);

  useEffect(() => {
    if (tab !== 'calendar' || !calendarFieldId) return undefined;
    const id = setInterval(() => {
      fetchAdminFieldCalendar(calendarFieldId, calendarDate);
    }, 30000);
    return () => clearInterval(id);
  }, [tab, calendarFieldId, calendarDate, fetchAdminFieldCalendar]);

  const handleAnulo = async (id) => {
    if (!window.confirm('A jeni të sigurt? Rezervimi do të anulohet.')) return;
    try {
      await apiFetch(`/matches/${id}`, { token, method: 'PUT', body: { status: 'canceled' } });
      tregoBust('Rezervimi u anulua.');
      fetchBookings();
    } catch (e) {
      tregoBust(e.message, 'error');
    }
  };

  const resetFieldForm = () => {
    setFieldForm({
      name: '', location: '', terrain_type: 'artificial_grass', price_per_hour: '', courts_count: '1', is_active: true,
    });
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
      await apiFetch('/fields', {
        token,
        method: 'POST',
        body: {
          name: fieldForm.name.trim(),
          location: fieldForm.location.trim(),
          terrain_type: fieldForm.terrain_type,
          price_per_hour: Number(fieldForm.price_per_hour),
          courts_count: Number(fieldForm.courts_count),
        },
      });
      resetFieldForm();
      tregoBust('Fusha u krijua.');
      fetchFields();
      fetchTodayByField();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleUpdateField = async (f) => {
    try {
      await apiFetch(`/fields/${f.id}`, {
        token,
        method: 'PUT',
        body: {
          name: String(f.name || '').trim(),
          location: String(f.location || '').trim(),
          terrain_type: f.terrain_type,
          price_per_hour: Number(f.price_per_hour),
          courts_count: Number(f.courts_count),
          is_active: Boolean(f.is_active),
        },
      });
      tregoBust('Fusha u përditësua.');
      fetchFields();
      fetchTodayByField();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const handleDeleteField = async (id, fieldName) => {
    const ok = window.confirm(
      `Fshirja e "${fieldName || 'fushës'}" do të heqë përgjithmonë fushën dhe të gjitha rezervimet. A jeni i sigurt?`
    );
    if (!ok) return;
    try {
      await apiFetch(`/fields/${id}`, { token, method: 'DELETE' });
      tregoBust('Fusha u fshi përgjithmonë.');
      fetchFields();
      fetchTodayByField();
      fetchBookings();
    } catch (e2) {
      tregoBust(e2.message, 'error');
    }
  };

  const loadFieldInventory = async (fieldId) => {
    if (!fieldId) {
      setSelectedFieldInventory([]);
      setBulkInventoryDraft({});
      return;
    }
    try {
      const field = await apiFetch(`/fields/${fieldId}`, { token });
      const inv = Array.isArray(field?.shoes_inventory) ? field.shoes_inventory : [];
      setSelectedFieldInventory(inv);
      const draft = {};
      SIZES.forEach((size) => {
        const row = inv.find((r) => Number(r.shoe_size) === size);
        draft[size] = {
          quantity: Number(row?.quantity_available ?? 0),
          rent_price: Number(row?.rent_price ?? 2),
        };
      });
      setBulkInventoryDraft(draft);
    } catch (e2) {
      tregoBust(e2.message || 'Gabim gjatë ngarkimit të inventarit.', 'error');
    }
  };

  const handleSaveBulkInventory = async () => {
    if (!selectedInventoryFieldId) return;
    try {
      setInventorySaving(true);
      const payload = SIZES.map((size) => ({
        size,
        quantity: Number(bulkInventoryDraft[size]?.quantity ?? bulkInventoryDraft[size] ?? 0),
        rent_price: Number(bulkInventoryDraft[size]?.rent_price ?? 2),
      }));
      await apiFetch(`/fields/${selectedInventoryFieldId}/shoes/bulk`, {
        token,
        method: 'PUT',
        body: { inventory: payload },
      });
      const selectedField = fields.find((f) => String(f.id) === String(selectedInventoryFieldId));
      tregoBust(`Inventari u ruajt për ${selectedField?.name || 'fushën'}`);
      await loadFieldInventory(selectedInventoryFieldId);
    } catch (e2) {
      tregoBust('Gabim gjatë ruajtjes. Provo përsëri.', 'error');
    } finally {
      setInventorySaving(false);
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    if (isFieldAdmin) {
      return [
        { label: 'Të ardhurat sot', value: `${Number(stats.today_revenue || 0).toFixed(2)}€`, accent: '#27ae60' },
        { label: 'Të ardhurat këtë javë', value: `${Number(stats.week_revenue || 0).toFixed(2)}€`, accent: '#8e44ad' },
        { label: 'Të ardhurat këtë muaj', value: `${Number(stats.month_revenue || 0).toFixed(2)}€`, accent: '#f39c12' },
        { label: 'Të ardhurat totale', value: `${Number(stats.total_revenue || 0).toFixed(2)}€`, accent: '#3498db' },
      ];
    }
    return [
      { label: 'Të ardhurat totale', value: `${Number(stats.total_revenue || 0).toFixed(2)}€`, accent: '#3498db' },
      { label: 'Të ardhurat sot', value: `${Number(stats.today_revenue || 0).toFixed(2)}€`, accent: '#27ae60' },
      { label: 'Të ardhurat këtë javë', value: `${Number(stats.week_revenue || 0).toFixed(2)}€`, accent: '#8e44ad' },
      { label: 'Numri total i rezervimeve', value: Number(stats.total_bookings || 0), accent: '#f39c12' },
    ];
  }, [stats, isFieldAdmin]);

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
        {!isFieldAdmin && (
          <button type="button" className={`tab${tab === 'players' ? ' tab--active' : ''}`} onClick={() => { setTab('players'); navigate('/admin/players'); }}>
            Lojtarët
          </button>
        )}
        <button type="button" className={`tab${tab === 'calendar' ? ' tab--active' : ''}`} onClick={() => { setTab('calendar'); navigate('/admin/calendar'); }}>
          Kalendari i Fushave
        </button>
      </div>

      {tab === 'dashboard' && (
        <>
          {initialLoading ? (
            <DashboardStatSkeleton />
          ) : (
          <div
            className="stat-grid-4"
            style={{
              marginBottom: 20,
              ...(isFieldAdmin ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } : {}),
            }}
          >
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ '--stat-accent': s.accent }}>
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value">{s.value}</div>
              </div>
            ))}
          </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h2 className="card-title">Të ardhurat — 7 ditët e fundit</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                <Bar dataKey="revenue" fill={CHART_BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="card-title">Rezervimet e konfirmuara sot sipas fushës</h2>
            {isFieldAdmin && fields.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>
                Nuk keni fusha të regjistruara. Shko te Fushat për të shtuar.
              </p>
            )}
            {!isFieldAdmin && todayByField.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha aktive.</p>
            )}
            {isFieldAdmin && fields.length > 0 && todayByField.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha aktive.</p>
            )}
            {!(isFieldAdmin && fields.length === 0) && todayByField.map((group) => (
              <div key={group.field_id} style={{ marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <h3 style={{ marginBottom: 6 }}>{group.field_name} — {group.location}</h3>
                <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                  Rezervime të konfirmuara sot: <strong>{group.confirmed_bookings_today}</strong> ·
                  Të ardhura sot: <strong>{Number(group.revenue_today || 0).toFixed(2)}€</strong>
                </p>
                {group.bookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Sot nuk ka rezervime të konfirmuara.</p>
                ) : (
                  <>
                  <div className="table-wrap hide-mobile">
                    <table className="table table--stack-on-mobile">
                      <thead>
                        <tr>
                          <th>Emri i lojtarit</th>
                          <th>Fusha</th>
                          <th>Ora</th>
                          <th>Court</th>
                          <th>Patika</th>
                          <th>Totali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.bookings.map((b) => (
                          <tr key={b.booking_id}>
                            <td data-label="Emri i lojtarit">{b.organizer_name || '—'}</td>
                            <td data-label="Fusha">{b.field_name || group.field_name || '—'}</td>
                            <td data-label="Ora">{formatBelgradeDateTime(b.start_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })} - {formatBelgradeDateTime(b.end_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td data-label="Court">{b.court_number || '—'}</td>
                            <td data-label="Patika">{b.shoes_summary || 'Pa patika'}</td>
                            <td data-label="Totali">{Number(b.total_price || 0).toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="show-mobile-only" style={{ display: 'grid', gap: 8 }}>
                    {group.bookings.map((b) => (
                      <div key={`mobile-${b.booking_id}`} className="card" style={{ marginBottom: 0, padding: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{b.organizer_name || '—'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {b.field_name || group.field_name || '—'}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {formatBelgradeDateTime(b.start_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })} - {formatBelgradeDateTime(b.end_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Court #{b.court_number || '—'} · {b.shoes_summary || 'Pa patika'}
                        </div>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{Number(b.total_price || 0).toFixed(2)}€</div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {!isFieldAdmin && (
          <div className="stat-grid-3" style={{ marginTop: 16 }}>
            <div className="stat-card"><div className="stat-card-label">Fusha aktive</div><div className="stat-card-value">{stats?.total_fields || 0}</div></div>
            <div className="stat-card"><div className="stat-card-label">Lojtarë të regjistruar</div><div className="stat-card-value">{stats?.total_players || 0}</div></div>
            <div className="stat-card"><div className="stat-card-label">Rezervime në pritje</div><div className="stat-card-value">{stats?.pending_bookings || 0}</div></div>
          </div>
          )}
        </>
      )}

      {tab === 'bookings' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <h2 className="card-title" style={{ marginBottom: 0, flex: 1 }}>
                {isFieldAdmin ? 'Rezervimet' : 'Të gjitha rezervimet'}
              </h2>
              <select className="input" style={{ maxWidth: 200 }} value={filtri} onChange={(e) => setFiltri(e.target.value)}>
                <option value="">Të gjitha statuset</option>
                <option value="pending">Në pritje</option>
                <option value="confirmed">Konfirmuara</option>
                <option value="canceled">Anuluara</option>
              </select>
            </div>

            {bookingsLoading && <p style={{ color: 'var(--text-muted)' }}>Duke ngarkuar…</p>}
            {!bookingsLoading && matches.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>
                {isFieldAdmin && !filtri ? 'Nuk ka rezervime ende.' : 'Nuk ka rezervime për këtë filtrim.'}
              </p>
            )}
            {!bookingsLoading && matches.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lojtari</th>
                      <th>Fusha</th>
                      {isFieldAdmin ? (
                        <>
                          <th>Data</th>
                          <th>Ora</th>
                        </>
                      ) : (
                        <th>Data dhe Ora</th>
                      )}
                      <th>Patika</th>
                      <th>Totali</th>
                      <th>Statusi</th>
                      <th>Veprimet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id}>
                        <td>{m.organizer_name || '—'}</td>
                        <td>{m.field_name || `#${m.field_id}`}</td>
                        {isFieldAdmin ? (
                          <>
                            <td>
                              {formatBelgradeDate(m.start_time, 'sq-AL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </td>
                            <td>
                              {formatBelgradeDateTime(m.start_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {formatBelgradeDateTime(m.end_time, 'sq-AL', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </>
                        ) : (
                          <td>{formatBelgradeDateTime(m.start_time, 'sq-AL')}</td>
                        )}
                        <td>{m.shoes_summary || 'Pa patika'}</td>
                        <td>{Number(m.total_price || 0).toFixed(2)}€</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(m.status)}`}>{statusLabel(m.status)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => navigate(`/match/${m.id}`)}>
                              Hap
                            </button>
                            {isSuperAdmin && m.status !== 'canceled' && (
                              <button type="button" className="btn btn-danger" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleAnulo(m.id)}>
                                Anulo
                              </button>
                            )}
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

      {tab === 'fields' && isFieldAdmin && (
        <FieldAdminDashboard
          fields={fields}
          onRefresh={() => {
            fetchFields();
            fetchTodayByField();
            fetchBookings();
          }}
          onMessage={tregoBust}
        />
      )}

      {tab === 'fields' && !isFieldAdmin && (
        <div className="card">
          <h2 className="card-title">Fushat</h2>
          <form onSubmit={handleCreateField} className="admin-field-create-grid">
            <input className="input" placeholder="Emri i fushës" value={fieldForm.name} onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Lokacioni" value={fieldForm.location} onChange={(e) => setFieldForm((p) => ({ ...p, location: e.target.value }))} />
            <select className="input" value={fieldForm.terrain_type} onChange={(e) => setFieldForm((p) => ({ ...p, terrain_type: e.target.value }))}>
              <option value="artificial_grass">Bar Artificial</option>
              <option value="indoor_hall">Sallë e mbyllur</option>
              <option value="futsal">Futsal</option>
            </select>
            <input className="input" type="number" placeholder="Çmimi për orë" value={fieldForm.price_per_hour} onChange={(e) => setFieldForm((p) => ({ ...p, price_per_hour: e.target.value }))} />
            <input className="input" type="number" min="1" max="10" placeholder="Numri i fushave" value={fieldForm.courts_count} onChange={(e) => setFieldForm((p) => ({ ...p, courts_count: e.target.value }))} />
            <button type="submit" className="btn btn-accent">Shto fushë</button>
          </form>
          {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha.</p>}
          <div className="table-wrap">
            <table className="table table--stack-on-mobile admin-fields-table">
              <thead>
                <tr><th>ID</th><th>Emri</th><th>Lokacioni</th><th>Terreni</th><th>Çmimi/orë</th><th>Nr. fushash</th><th>Statusi</th><th>Veprimet</th></tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  editingPlatformField?.id === f.id ? (
                    <tr key={f.id}>
                      <td colSpan={8}>
                        <form
                          className="admin-field-create-grid"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await handleUpdateField(editingPlatformField);
                            setEditingPlatformField(null);
                          }}
                        >
                          <input className="input" value={editingPlatformField.name} onChange={(e) => setEditingPlatformField((p) => ({ ...p, name: e.target.value }))} />
                          <input className="input" value={editingPlatformField.location} onChange={(e) => setEditingPlatformField((p) => ({ ...p, location: e.target.value }))} />
                          <select className="input" value={editingPlatformField.terrain_type} onChange={(e) => setEditingPlatformField((p) => ({ ...p, terrain_type: e.target.value }))}>
                            <option value="artificial_grass">Bar Artificial</option>
                            <option value="indoor_hall">Sallë e mbyllur</option>
                            <option value="futsal">Futsal</option>
                          </select>
                          <input className="input" type="number" step="0.01" value={editingPlatformField.price_per_hour} onChange={(e) => setEditingPlatformField((p) => ({ ...p, price_per_hour: e.target.value }))} />
                          <input className="input" type="number" min="1" max="10" value={editingPlatformField.courts_count} onChange={(e) => setEditingPlatformField((p) => ({ ...p, courts_count: e.target.value }))} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={Boolean(editingPlatformField.is_active)} onChange={(e) => setEditingPlatformField((p) => ({ ...p, is_active: e.target.checked }))} />
                            Aktive
                          </label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-accent">Ruaj</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setEditingPlatformField(null)}>Anulo</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={f.id}>
                      <td data-label="ID">{f.id}</td>
                      <td data-label="Emri">{f.name}</td>
                      <td data-label="Lokacioni">{f.location || '—'}</td>
                      <td data-label="Terreni">{terrainLabel(f.terrain_type)}</td>
                      <td data-label="Çmimi/orë">{Number(f.price_per_hour || 0).toFixed(2)}€</td>
                      <td data-label="Nr. fushash">{f.courts_count || 1}</td>
                      <td data-label="Statusi"><span className={`badge ${f.is_active ? 'badge-confirmed' : 'badge-canceled'}`}>{f.is_active ? 'Aktive' : 'Joaktive'}</span></td>
                      <td data-label="Veprimet" className="actions-cell">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-ghost" onClick={() => setEditingPlatformField({ ...f })}>Ndrysho</button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteField(f.id, f.name)}>Fshi</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 16 }}>Inventari i patikave</h3>
          <div className="form-group" style={{ maxWidth: 460 }}>
            <label className="label" htmlFor="inventory-field-select">Zgjidhni fushën</label>
            <select
              id="inventory-field-select"
              className="input"
              value={selectedInventoryFieldId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedInventoryFieldId(id);
                loadFieldInventory(id);
              }}
            >
              <option value="">-- Zgjidhni fushën --</option>
              {fields.filter((f) => f.is_active).map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name} — {f.location}
                </option>
              ))}
            </select>
          </div>
          {selectedInventoryFieldId && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Madhësia</th>
                      <th>Sasia në dispozicion</th>
                      <th>Sasia e re</th>
                      <th>Çmimi me qira (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZES.map((size) => {
                      const row = selectedFieldInventory.find((r) => Number(r.shoe_size) === size);
                      return (
                        <tr key={`bulk-${size}`}>
                          <td>{size}</td>
                          <td>{Number(row?.quantity_available ?? 0)}</td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              value={bulkInventoryDraft[size]?.quantity ?? bulkInventoryDraft[size] ?? 0}
                              onChange={(e) =>
                                setBulkInventoryDraft((prev) => ({
                                  ...prev,
                                  [size]: {
                                    ...(typeof prev[size] === 'object' ? prev[size] : { quantity: prev[size], rent_price: 2 }),
                                    quantity: Math.max(0, Number(e.target.value || 0)),
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={bulkInventoryDraft[size]?.rent_price ?? 2}
                              onChange={(e) =>
                                setBulkInventoryDraft((prev) => ({
                                  ...prev,
                                  [size]: {
                                    ...(typeof prev[size] === 'object' ? prev[size] : { quantity: prev[size] ?? 0, rent_price: 2 }),
                                    rent_price: Math.max(0, Number(e.target.value || 0)),
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-accent" onClick={handleSaveBulkInventory} disabled={inventorySaving}>
                {inventorySaving ? 'Duke ruajtur…' : 'Ruaj inventarin për këtë fushë'}
              </button>
            </>
          )}
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

      {tab === 'calendar' && (
        <div className="card">
          <h2 className="card-title">Kalendari i Fushave</h2>
          {isFieldAdmin && fields.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>
              Nuk keni fusha të regjistruara. Shko te Fushat për të shtuar.
            </p>
          )}
          {!(isFieldAdmin && fields.length === 0) && (
          <>
          <div className="admin-calendar-filter-bar">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="admin-calendar-field">Zgjidh Fushën</label>
              <select
                id="admin-calendar-field"
                className="input"
                value={calendarFieldId}
                onChange={(e) => {
                  setCalendarFieldId(e.target.value);
                  setActiveKey(null);
                  setActiveBooking(null);
                }}
              >
                <option value="">-- Zgjidh fushën --</option>
                {fields.filter((f) => f.is_active).map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} — {terrainLabel(f.terrain_type)}
                    {Number(f.courts_count) > 1 ? ` (${f.courts_count} fusha)` : ' (1 fushë)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="admin-calendar-date">Zgjidh Ditën</label>
              <input
                id="admin-calendar-date"
                className="input"
                type="date"
                value={calendarDate}
                onChange={(e) => {
                  setCalendarDate(e.target.value);
                  setActiveKey(null);
                  setActiveBooking(null);
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => fetchAdminFieldCalendar(calendarFieldId, calendarDate)}
                disabled={!calendarFieldId || calendarLoading}
              >
                {calendarLoading ? 'Duke ngarkuar…' : 'Shiko'}
              </button>
            </div>
          </div>

          {calendarData?.counts && (
            <p className="admin-calendar-counts">
              Të lira: <strong>{Number(calendarData.counts.free || 0)}</strong> | Të zëna: <strong>{Number(calendarData.counts.booked || 0)}</strong> | Ka kaluar: <strong>{Number(calendarData.counts.past || 0)}</strong>
            </p>
          )}

          {calendarData?.field && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
              Fusha: <strong>{calendarData.field.name}</strong> — {terrainLabel(calendarData.field.terrain_type)} | Data: <strong>{calendarData.date}</strong>
            </p>
          )}

          {!calendarLoading && !calendarData?.slots?.length && (
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
              Zgjidhni fushën dhe ditën, pastaj klikoni "Shiko" për të parë disponueshmërinë.
            </p>
          )}

          {!calendarLoading && calendarData?.slots?.length > 0 && (
            <>
            <div className="admin-court-grid-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="table admin-court-grid" style={{ minWidth: Number(calendarData.field?.courts_count || 1) > 1 ? 520 : 360 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 110, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>ORA</th>
                    {Array.from({ length: Number(calendarData.field?.courts_count || 1) }, (_, i) => (
                      <th key={`court-head-${i + 1}`} style={{ minWidth: 120 }}>Court {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarData.slots.map((slot) => (
                    <Fragment key={slot.hour}>
                      <tr>
                        <td
                          className="admin-court-grid__time"
                          style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}
                        >
                          {slot.label || slot.hour}
                        </td>
                        {(slot.courts || []).map((courtCell) => {
                          const cellKey = `${slot.hour}-${courtCell.court}`;
                          const isBooked = courtCell.status === 'booked';
                          const isPast = courtCell.status === 'past';
                          const cellStyle = adminCourtCellStyle(courtCell.status);
                          return (
                            <td key={cellKey} style={{ padding: 4, verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                disabled={!isBooked}
                                style={{
                                  ...cellStyle,
                                  border: 'none',
                                  font: 'inherit',
                                  fontWeight: isBooked ? 600 : 400,
                                }}
                                onClick={() => {
                                  if (!isBooked || !courtCell.booking) return;
                                  if (activeKey === cellKey) {
                                    setActiveKey(null);
                                    setActiveBooking(null);
                                  } else {
                                    setActiveKey(cellKey);
                                    setActiveBooking(courtCell.booking);
                                  }
                                }}
                              >
                                {isPast && 'Ka kaluar'}
                                {!isPast && isBooked && truncateOrganizer(courtCell.booking?.organizer_name)}
                                {!isPast && !isBooked && 'E lirë'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      {activeKey && activeKey.startsWith(`${slot.hour}-`) && activeBooking && (
                        <tr className="admin-court-detail-row">
                          <td colSpan={Number(calendarData.field?.courts_count || 1) + 1}>
                            <div
                              className="admin-court-detail-card"
                              style={{
                                position: 'relative',
                                padding: '14px 40px 14px 14px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8,
                              }}
                            >
                              <button
                                type="button"
                                aria-label="Mbyll"
                                onClick={() => {
                                  setActiveKey(null);
                                  setActiveBooking(null);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 10,
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-muted)',
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                              <div>👤 Rezervuesi: {activeBooking.organizer_name || '—'}</div>
                              <div>📞 Telefoni: {activeBooking.organizer_phone || activeBooking.phone || 'Pa numër'}</div>
                              <div>💰 Totali: {Number(activeBooking.total_price || 0).toFixed(2)}€</div>
                              <div>👟 Patika: {shoesText(activeBooking.shoes_summary)}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-calendar-legend" style={{ marginTop: 12 }}>
              <span>🟢 E lirë</span>
              <span>🔴 E zënë</span>
              <span>⚫ Ka kaluar</span>
            </div>
            </>
          )}
          </>
          )}
        </div>
      )}

    </div>
  );
}
