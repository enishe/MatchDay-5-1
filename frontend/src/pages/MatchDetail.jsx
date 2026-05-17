import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBelgradeDateTime } from '../lib/timezone';

function useCountdown(targetIso) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const ms = new Date(targetIso) - Date.now();
      if (ms <= 0) {
        setLeft({ h: 0, m: 0, done: true });
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft({ h, m, done: false });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [targetIso]);
  return left;
}

export default function MatchDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    apiFetch(`/matches/${id}`, { token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const cd = useCountdown(data?.countdownTarget);

  const paidCount = data?.progress?.paid ?? 0;
  const pct = useMemo(() => Math.round((paidCount / 12) * 100), [paidCount]);

  const handleConfirm = async () => {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/matches/${id}`, { token, method: 'PUT', body: { status: 'confirmed' } });
      setMsg('Ndeshja u konfirmua.');
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Anulo këtë rezervim?')) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/matches/${id}/cancel`, { token, method: 'POST', body: { reason: 'user' } });
      setMsg('Rezervimi u anulua.');
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelCash = async () => {
    const ok = window.confirm(
      'A jeni i sigurt që doni të anuloni?\nRezervimet mund të anulohen deri 2 orë para ndeshjes.'
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch(`/matches/${id}/cancel-cash`, { token, method: 'POST', body: { reason: 'Anuluar nga lojtari' } });
      setMsg('Rezervimi u anulua me sukses.');
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, match: { ...prev.match, status: 'canceled' } };
      });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="page">
        <div className="feedback feedback-error">{error || 'Nuk u gjet ndeshja.'}</div>
      </div>
    );
  }

  const { match, players, financials, cancelPolicy } = data;
  const isOrganizer = Number(match.organizer_id) === Number(user?.id);
  const canAct = isOrganizer
    || user?.role === 'admin'
    || user?.role === 'superadmin'
    || user?.role === 'field_admin';
  const hoursUntilStart = (new Date(match.start_time) - Date.now()) / (1000 * 60 * 60);
  const canCancelCash =
    isOrganizer
    && match.status === 'confirmed'
    && hoursUntilStart >= 2;

  return (
    <div className="page">
      <h1 className="page-title">Ndeshja #{match.id}</h1>
      <p className="page-subtitle">
        {match.field_name} · {formatBelgradeDateTime(match.start_time, 'sq-AL')}
      </p>

      {msg && (
        <div
          className={`feedback ${
            String(msg).toLowerCase().includes('sukses') || String(msg).toLowerCase().includes('anulua')
              ? 'feedback-success'
              : 'feedback-error'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="grid-2-col">
        <div className="card">
          <div className="card-title">Lojtarët (12)</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {paidCount}/12 kanë paguar
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {players.map((p) => (
              <li
                key={p.id}
                className="match-player-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: 40,
                    height: 40,
                    fontSize: 14,
                    background: p.placeholder ? 'var(--text-muted)' : 'var(--color-accent)',
                  }}
                >
                  {p.initials}
                </div>
                <div className="match-player-main" style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className={`badge ${p.paid ? 'badge-confirmed' : 'badge-pending'}`}>
                      {p.paid ? 'Paguar' : 'Pa paguar'}
                    </span>
                    {p.shoeBadge && <span className="badge badge-pending">+2€ patika</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-title">Detaje & veprime</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            <div>
              <strong>Çmimi total:</strong> {financials.totalPrice}€
            </div>
            <div>
              <strong>Smart split:</strong> {financials.smartSplit}€/lojtar
            </div>
            <div>
              <strong>Mbledhur:</strong> {financials.collected}€
            </div>
            <div>
              <strong>Mbetur:</strong> {financials.remaining}€
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="label">Koha deri në ndeshje</div>
            {cd?.done ? (
              <span className="badge badge-canceled">Filluar / përfunduar</span>
            ) : cd ? (
              <div style={{ fontSize: 20, fontWeight: 700 }}>{cd.h}h {cd.m}min</div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="label">Politika e anulimit</div>
            <span className={cancelPolicy?.type === 'ok' ? 'badge badge-confirmed' : 'badge badge-canceled'}>
              {cancelPolicy?.label}
            </span>
          </div>

          {canAct && match.status === 'pending' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-accent" disabled={busy} onClick={handleConfirm}>
                Konfirmo
              </button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={handleCancel}>
                Anulo
              </button>
            </div>
          )}
          {canCancelCash && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              style={{ marginBottom: 12 }}
              onClick={handleCancelCash}
            >
              Anulo Rezervimin
            </button>
          )}
          <button type="button" className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
