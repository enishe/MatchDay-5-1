import { useCallback, useEffect, useMemo, useState } from 'react';
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

function hoursUntil(startTime) {
  return (new Date(startTime) - new Date()) / (1000 * 60 * 60);
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
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoCancelNotice, setAutoCancelNotice] = useState('');
  const [bookingTab, setBookingTab] = useState('upcoming');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelingId, setCancelingId] = useState(null);
  const navigate = useNavigate();

  const loadMatches = useCallback(() => {
    if (!token) return Promise.resolve();
    return apiFetch('/bookings/my', { token }).then((m) => {
      const list = Array.isArray(m) ? m : [];
      setStats(statsFromMatches(list));
      setMatches(list);
      setError(null);
      return list;
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    loadMatches()
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Nuk mund të lidhet me serverin.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, loadMatches]);

  useEffect(() => {
    const autoCanceled = matches.find((m) => m.status === 'canceled');
    if (!autoCanceled) return;
    const key = `autocancel-notice-${autoCanceled.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    setAutoCancelNotice('Rezervimi u anulua automatikisht.');
  }, [matches]);

  useEffect(() => {
    if (!cancelSuccess) return undefined;
    const t = setTimeout(() => setCancelSuccess(''), 3000);
    return () => clearTimeout(t);
  }, [cancelSuccess]);

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

  const upcomingMatches = useMemo(
    () => matches.filter((m) => new Date(m.start_time) > new Date()),
    [matches]
  );

  const pastMatches = useMemo(
    () => matches.filter((m) => new Date(m.start_time) <= new Date()),
    [matches]
  );

  const displayedMatches = bookingTab === 'upcoming' ? upcomingMatches : pastMatches;

  const ndeshjeKeteJave = javaMatches.length;
  const userId = Number(user?.id);

  const canShowCancelConfirmed = (m) =>
    bookingTab === 'upcoming'
    && m.status === 'confirmed'
    && Number(m.organizer_id) === userId
    && hoursUntil(m.start_time) >= 2
    && new Date(m.start_time) > new Date();

  const canShowCancelPending = (m) =>
    bookingTab === 'upcoming'
    && m.status === 'pending'
    && Number(m.organizer_id) === userId
    && new Date(m.start_time) > new Date();

  const handleCancelBooking = async (m, e) => {
    e?.stopPropagation?.();
    const isPending = m.status === 'pending';
    const ok = window.confirm(
      'A jeni të sigurt? Rezervimi do të anulohet. Ky veprim nuk mund të kthehet.'
    );
    if (!ok) return;

    setCancelingId(m.id);
    try {
      if (isPending) {
        await apiFetch(`/matches/${m.id}/cancel`, {
          token,
          method: 'POST',
          body: { reason: 'user' },
        });
      } else {
        await apiFetch(`/matches/${m.id}/cancel-cash`, {
          token,
          method: 'POST',
          body: { reason: 'Anuluar nga lojtari' },
        });
      }
      setError(null);
      setCancelSuccess('Rezervimi u anulua me sukses.');
      await loadMatches();
    } catch (err) {
      setError(err.message || 'Anulimi dështoi.');
    } finally {
      setCancelingId(null);
    }
  };

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
  if (error && matches.length === 0) {
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
      {cancelSuccess && <div className="feedback feedback-success">{cancelSuccess}</div>}
      {error && matches.length > 0 && <div className="feedback feedback-error">{error}</div>}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              Ndeshjet e mia
            </h2>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigate('/booking')}>
              + Rezervo
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn${bookingTab === 'upcoming' ? ' btn-accent' : ' btn-ghost'}`}
              style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => setBookingTab('upcoming')}
            >
              Të ardhshme ({upcomingMatches.length})
            </button>
            <button
              type="button"
              className={`btn${bookingTab === 'past' ? ' btn-accent' : ' btn-ghost'}`}
              style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => setBookingTab('past')}
            >
              Të kaluara ({pastMatches.length})
            </button>
          </div>

          {displayedMatches.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {bookingTab === 'upcoming' ? 'Nuk ka ndeshje të ardhshme.' : 'Nuk ka ndeshje të kaluara.'}
            </p>
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
                  {bookingTab === 'upcoming' && <th>Veprimet</th>}
                </tr>
              </thead>
              <tbody>
                {displayedMatches.map((m) => {
                  const showCancelConfirmed = canShowCancelConfirmed(m);
                  const showCancelPending = canShowCancelPending(m);
                  return (
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
                      {bookingTab === 'upcoming' && (
                        <td data-label="Veprimet" onClick={(e) => e.stopPropagation()}>
                          {(showCancelConfirmed || showCancelPending) && (
                            <button
                              type="button"
                              className={showCancelPending ? 'btn btn-ghost' : 'btn btn-danger'}
                              style={{
                                fontSize: 12,
                                padding: '4px 10px',
                                ...(showCancelConfirmed
                                  ? {
                                      background: 'transparent',
                                      border: '1px solid var(--color-danger, #e74c3c)',
                                      color: 'var(--color-danger, #e74c3c)',
                                    }
                                  : {}),
                              }}
                              disabled={cancelingId === m.id}
                              onClick={(e) => handleCancelBooking(m, e)}
                            >
                              {cancelingId === m.id ? '...' : 'Anulo'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
