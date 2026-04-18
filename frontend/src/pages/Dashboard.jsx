import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const DITET = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

function sot() {
  return new Date();
}

function formatDate(d) {
  return new Date(d).toLocaleString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
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
  const { token, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    const req = isAdmin
      ? Promise.all([apiFetch('/matches/stats', { token }), apiFetch('/matches', { token })]).then(([s, m]) => ({
          stats: s,
          matches: Array.isArray(m) ? m : [],
        }))
      : apiFetch('/my-matches', { token }).then((m) => {
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
  }, [token, isAdmin]);

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

  const ndeshjeSot = useMemo(
    () => matches.filter((m) => isSameDay(m.start_time, sot())).length,
    [matches]
  );

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" />
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Duke ngarkuar…</p>
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
    { label: 'Gjithsej Ndeshje', vlera: stats?.total ?? 0, accent: '#1a1a2e' },
    { label: 'Të Ardhura Totale', vlera: `${stats?.totali_cmimit ?? 0}€`, accent: '#1565c0' },
    { label: 'Çmimi Mesatar', vlera: `${stats?.mesatare ?? 0}€`, accent: '#27ae60' },
    { label: 'Ndeshjet Sot', vlera: ndeshjeSot, accent: '#8e44ad' },
  ];

  const playerActions = [
    { label: 'Rezervo fushë', path: '/booking', accent: 'var(--color-accent)' },
    { label: 'Patika me qira', path: '/equipment', accent: '#3498db' },
    { label: 'Kalendari', path: '/calendar', accent: '#9b59b6' },
    { label: 'Friends', path: '/friends', accent: '#e67e22' },
    { label: 'Profili im', path: '/profile', accent: '#1abc9c' },
  ];

  const adminExtras = [
    { label: 'Të gjitha rezervimet', desc: 'Menaxho rezervimet', path: '/admin' },
    { label: 'Statistika & fusha', desc: 'Paneli i plotë admin', path: '/admin' },
    { label: 'Lojtarët', desc: 'Lista e përdoruesve', path: '/admin?tab=users' },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">
        {isAdmin
          ? 'Pamje administrator — të gjitha rezervimet dhe statistikat'
          : 'Pamje lojtari — rezervimet e tua dhe veprime të shpejta'}
      </p>

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

      {isAdmin && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Veprime administratori</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {adminExtras.map((x) => (
              <button key={x.label} type="button" className="btn btn-accent" onClick={() => navigate(x.path)}>
                {x.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
            Në panelin admin menaxhoni rezervimet, fushat, inventarin dhe lojtarët.
          </p>
        </div>
      )}

      <div className="stat-grid-3" style={{ marginTop: 16 }}>
        {[
          { label: 'Në Pritje', n: stats?.pending, c: 'var(--color-warning)' },
          { label: 'Konfirmuara', n: stats?.confirmed, c: 'var(--color-accent)' },
          { label: 'Anuluara', n: stats?.canceled, c: 'var(--color-danger)' },
        ].map((st) => (
          <div
            key={st.label}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid var(--border-color)`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: `4px solid ${st.c}`,
            }}
          >
            <span style={{ fontSize: 13, color: st.c, fontWeight: 600 }}>{st.label}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: st.c }}>{st.n ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="grid-2-col" style={{ marginTop: 16 }}>
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
              {isAdmin ? 'Ndeshjet e fundit (të gjitha)' : 'Ndeshjet e mia'}
            </h2>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/booking')}>
              + Rezervo
            </button>
          </div>
          {matches.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nuk ka ndeshje të regjistruara.</p>
          )}
          <div className="table-wrap">
            <table className="table">
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
                    <td>#{m.id}</td>
                    <td>{m.field_name || `Fusha #${m.field_id}`}</td>
                    <td>{formatDate(m.start_time)}</td>
                    <td>{m.total_price}€</td>
                    <td>{m.price_per_player}€</td>
                    <td>
                      <span
                        className={`badge ${
                          m.status === 'pending'
                            ? 'badge-pending'
                            : m.status === 'confirmed'
                              ? 'badge-confirmed'
                              : 'badge-canceled'
                        }`}
                      >
                        {m.status === 'pending' ? 'Pritje' : m.status === 'confirmed' ? 'Konfirmuar' : 'Anuluar'}
                      </span>
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
