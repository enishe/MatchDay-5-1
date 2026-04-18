import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ORET = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  '21:00', '22:00',
];

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toYMD(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DITET_SH = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

export default function CalendarPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekDays = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [weekStart]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch(`/fields/availability?date=${encodeURIComponent(selectedDate)}`, { token })
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e) => setError(e.message || 'Gabim ngarkimi'))
      .finally(() => setLoading(false));
  }, [token, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const fields = data?.fields || [];

  const onSlotClick = (fieldId, time, available) => {
    if (!available) return;
    navigate(`/booking?fieldId=${fieldId}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(time)}`);
  };

  return (
    <div className="page">
      <h1 className="page-title">Kalendari</h1>
      <p className="page-subtitle">Java aktuale — fushat sipas orës (e gjelbër = lirë, e kuqe = zënë)</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * 86400000))}>
            ← Java e kaluar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * 86400000))}>
            Java e ardhshme →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 14 }}>
          {weekDays.map((d, idx) => {
            const ymd = toYMD(d);
            const active = ymd === selectedDate;
            return (
              <button
                key={ymd}
                type="button"
                className={`btn ${active ? 'btn-accent' : 'btn-ghost'}`}
                style={{ flexDirection: 'column', height: 'auto', padding: '10px 6px' }}
                onClick={() => setSelectedDate(ymd)}
              >
                <span style={{ fontSize: 11 }}>{DITET_SH[idx]}</span>
                <span style={{ fontWeight: 700 }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          Data e zgjedhur: <strong>{selectedDate}</strong>
        </p>
      </div>

      {error && <div className="feedback feedback-error">{error}</div>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Duke ngarkuar…</p>}

      {!loading && !error && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="table-wrap" style={{ minWidth: 720 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ora</th>
                  {fields.map((f) => (
                    <th key={f.id}>{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORET.map((time) => (
                  <tr key={time}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{time}</td>
                    {fields.map((f) => {
                      const slot = (f.slots || []).find((s) => s.time === time);
                      const available = slot?.available !== false;
                      return (
                        <td key={`${f.id}-${time}`} style={{ padding: 4 }}>
                          <button
                            type="button"
                            onClick={() => onSlotClick(f.id, time, available)}
                            disabled={!available}
                            title={available ? 'Rezervo' : slot?.bookedBy || 'Zënë'}
                            style={{
                              width: '100%',
                              minHeight: 36,
                              borderRadius: 6,
                              border: '1px solid var(--border-color)',
                              cursor: available ? 'pointer' : 'not-allowed',
                              background: available ? 'rgba(39, 174, 96, 0.25)' : 'rgba(192, 57, 43, 0.35)',
                              color: 'var(--text-primary)',
                              fontSize: 11,
                            }}
                          >
                            {available ? 'Lirë' : slot?.bookedBy || 'Zënë'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
