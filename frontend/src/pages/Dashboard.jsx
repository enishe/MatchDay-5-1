import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDateTime } from '../lib/timezone';

const DITET = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

function sot() {
  return new Date();
}

function formatDate(d) {
  return formatBelgradeDateTime(d, 'sq-AL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function parseShoesSummaryRow(m) {
  let s = m?.shoes_summary;
  if (typeof s === 'string') {
    try {
      s = JSON.parse(s);
    } catch {
      return [];
    }
  }
  return Array.isArray(s) ? s : [];
}

function statsFromMatches(matches) {
  const arr = Array.isArray(matches) ? matches : [];
  if (arr.length === 0) {
    return {
      total: 0,
      mesatare: 0,
      totali_cmimit: 0,
      pending: 0,
      confirmed: 0,
      canceled: 0,
    };
  }
  const cmimet = arr.map((m) => parseFloat(m.total_price || 0));
  const shuma = cmimet.reduce((a, b) => a + b, 0);
  return {
    total: arr.length,
    mesatare: parseFloat((shuma / cmimet.length).toFixed(2)),
    totali_cmimit: parseFloat(shuma.toFixed(2)),
    pending: arr.filter((m) => m.status === 'pending').length,
    confirmed: arr.filter((m) => m.status === 'confirmed').length,
    canceled: arr.filter((m) => m.status === 'canceled').length,
  };
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoCancelNotice, setAutoCancelNotice] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    const req = apiFetch('/bookings/my', { token }).then((m) => {
      const list = Array.isArray(m) ? m : [];
      return { stats: statsFromMatches(list), matches: list };
    });
    req
      .then(({ stats: s, matches: m }) => {
        if (cancelled) return;
        setStats(s);
        setMatches(m);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Nuk mund të lidhet me serverin.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    // TODO: Replace this fallback with socket event listener when realtime auto-cancel event is available.
    const autoCanceled = matches.find((m) => m.status === 'canceled');
    if (!autoCanceled) return;
    const key = `autocancel-notice-${autoCanceled.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setAutoCancelNotice('Rezervimi u anulua automatikisht.');
  }, [matches]);

  const fillim = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const javaMatches = useMemo(() => {
    const fund = new Date(fillim);
    fund.setDate(fund.getDate() + 6);
    fund.setHours(23, 59, 59, 999);
    return matches.filter((m) => {
      const dt = new Date(m.start_time);
      return dt >= fillim && dt <= fund;
    });
  }, [matches, fillim]);

  const ndeshjeKeteJave = javaMatches.length;

  if (loading) {
    return (
      <div className="page">
        <div className="stat-grid-4" style={{ marginBottom: 16 }}>
          {[1, 2].map((k) => (
            <div key={k} className="skeleton" style={{ height: 112 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 230, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="feedback feedback-error">{error}</div>
      </div>
    );
  }

  const statKartat = [
    { label: 'Ndeshjet e mia gjithsej', vlera: stats?.total ?? 0, accent: '#1a1a2e' },
    { label: 'Ndeshjet e mia këtë javë', vlera: ndeshjeKeteJave, accent: '#27ae60' },
  ];

  const playerActions = [
    { label: 'Rezervo fushë', path: '/booking', accent: 'var(--color-accent)' },
    { label: 'Patika me qira', path: '/equipment', accent: '#3498db' },
    { label: 'Kalendari', path: '/calendar', accent: '#9b59b6' },
    { label: 'Miqtë', path: '/friends', accent: '#e67e22' },
    { label: 'Profili im', path: '/profile', accent: '#1abc9c' },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Pamje lojtari — statistikat e tua personale</p>
      {autoCancelNotice && <div className="feedback feedback-error">{autoCancelNotice}</div>}

      <div className="stat-grid-4">
        {statKartat.map((k) => (
          <div key={k.label} className="stat-card" style={{ '--stat-accent': k.accent }}>
            <div className="stat-card-label">{k.label}</div>
            <div className="stat-card-value">{k.vlera}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Veprime të shpejta</div>
        <div
            className="quick-actions-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {playerActions.map((a) => (
            <button
              key={a.path + a.label}
              type="button"
              className="btn btn-ghost"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                borderLeft: `4px solid ${a.accent}`,
                padding: '14px 16px',
                height: 'auto',
              }}
              onClick={() => navigate(a.path)}
            >
              <span style={{ fontWeight: 700 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      

      <div className="grid-2-col dashboard-2col" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-title">Java aktuale</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DITET.map((d, i) => {
              const data = new Date(fillim);
              data.setDate(data.getDate() + i);
              const eshteSot = data.toDateString() === sot().toDateString();
              const kaMatch = javaMatches.some((m) => isSameDay(m.start_time, data));
              return (
                <div
                  key={d}
                  style={{
                    background: eshteSot ? 'var(--color-primary)' : 'var(--bg-secondary)',
                    color: eshteSot ? 'var(--color-accent)' : 'var(--text-secondary)',
                    borderRadius: 8,
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: eshteSot ? 700 : 400,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>{d}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.getDate()}</div>
                  {kaMatch && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                        margin: '4px auto 0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Pika e gjelbër = ndeshje e planifikuar
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              Ndeshjet e mia
            </h2>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/booking')}>
              + Rezervo
            </button>
          </div>
          {matches.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nuk ka ndeshje të regjistruara.</p>
          )}
          <div className="table-wrap">
            <table className="table table--stack-on-mobile">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fusha</th>
                  <th>Data/Ora</th>
                  <th>Çmimi</th>
                  <th>Smart Split</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 8).map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/match/${m.id}`)}
                    style={{ cursor: 'pointer' }}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/match/${m.id}`)}
                    tabIndex={0}
                    role="link"
                  >
                    <td data-label="ID">#{m.id}</td>
                    <td data-label="Fusha">{m.field_name || `Fusha #${m.field_id}`}</td>
                    <td data-label="Data/Ora">{formatDate(m.start_time)}</td>
                    <td data-label="Çmimi">{m.total_price}€</td>
                    <td data-label="Smart Split">{m.price_per_player}€</td>
                    <td data-label="Status">
                      <div>
                        <span
                          className={`badge ${
                            m.status === 'confirmed' ? 'badge-confirmed' : m.status === 'pending' ? 'badge-pending' : 'badge-canceled'
                          }`}
                        >
                          {m.status === 'confirmed' ? 'Konfirmuar ✓' : m.status === 'pending' ? 'Në pritje' : 'Anuluar'}
                        </span>
                        {parseShoesSummaryRow(m).length > 0 && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            Patika:{' '}
                            {parseShoesSummaryRow(m)
                              .map((s) => `${s.count} palë nr.${s.size}`)
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
