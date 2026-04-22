import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ORET = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const DITET_SH = ['E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë', 'E Diel'];

function parseLocalHourSlot(dateStr, hourLabel) {
  return new Date(`${dateStr}T${hourLabel}:00`);
}
function isSlotStartInPast(dateStr, hourLabel) {
  return parseLocalHourSlot(dateStr, hourLabel).getTime() <= Date.now();
}
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

export default function CalendarPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [fields, setFields] = useState([]);
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => toYMD(startOfWeekMonday(new Date())));
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

  useEffect(() => {
    if (!weekDays.some((d) => toYMD(d) === selectedDate)) {
      setSelectedDate(toYMD(weekDays[0]));
    }
  }, [weekDays, selectedDate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const f = await apiFetch('/fields', { token });
        const activeFields = (Array.isArray(f) ? f : []).filter((x) => x.is_active);
        if (cancelled) return;
        setFields(activeFields);

        const next = {};
        for (const day of weekDays) {
          const ymd = toYMD(day);
          for (const hour of ORET) {
            const start = parseLocalHourSlot(ymd, hour);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            await Promise.all(activeFields.map(async (field) => {
              const r = await apiFetch(`/fields/${field.id}/availability?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, { token });
              if (!next[ymd]) next[ymd] = {};
              if (!next[ymd][hour]) next[ymd][hour] = {};
              next[ymd][hour][field.id] = {
                total: Number(r.total_courts || field.courts_count || 1),
                free: Array.isArray(r.available_courts) ? r.available_courts.length : 0,
              };
            }));
          }
        }
        if (!cancelled) {
          setAvailability(next);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Gabim gjatë ngarkimit të kalendarit.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, weekDays]);

  const onSlotClick = (fieldId, dateYmd, time, freeCount) => {
    if (freeCount <= 0) return;
    navigate(`/booking?fieldId=${fieldId}&date=${encodeURIComponent(dateYmd)}&time=${encodeURIComponent(time)}`);
  };

  return (
    <div className="page">
      <h1 className="page-title">Kalendari</h1>
      <p className="page-subtitle">Pamje javore me fusha dhe orare 08:00 - 22:00.</p>

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
          {weekDays.map((d, i) => {
            const ymd = toYMD(d);
            const active = ymd === selectedDate;
            return (
              <button
                key={ymd}
                type="button"
                className={`btn ${active ? 'btn-accent' : 'btn-ghost'}`}
                style={{ height: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column' }}
                onClick={() => setSelectedDate(ymd)}
              >
                <span style={{ fontSize: 11 }}>{DITET_SH[i]}</span>
                <span>{d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="feedback feedback-error">{error}</div>}
      {loading && <div className="spinner" />}

      {!loading && !error && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="table-wrap" style={{ minWidth: 1000 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ora</th>
                  {fields.map((field) => (
                    <th key={field.id}>
                      {field.name}<br />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedDate}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORET.map((time) => (
                  <tr key={time}>
                    <td style={{ fontWeight: 600 }}>{time}</td>
                    {fields.map((field) => {
                      const slot = availability?.[selectedDate]?.[time]?.[field.id];
                      const free = Number(slot?.free || 0);
                      const total = Number(slot?.total || field.courts_count || 1);
                      const past = isSlotStartInPast(selectedDate, time);
                      let text = 'Lirë';
                      let bg = 'rgba(39, 174, 96, 0.25)';
                      if (past || free <= 0) {
                        text = 'Zënë';
                        bg = 'rgba(192, 57, 43, 0.35)';
                      } else if (free < total) {
                        text = `${free} lirë`;
                        bg = 'rgba(243, 156, 18, 0.30)';
                      }
                      return (
                        <td key={`${field.id}-${selectedDate}-${time}`}>
                          <button
                            type="button"
                            disabled={past || free <= 0}
                            onClick={() => onSlotClick(field.id, selectedDate, time, free)}
                            style={{
                              width: '100%',
                              border: '1px solid var(--border-color)',
                              borderRadius: 6,
                              background: bg,
                              textAlign: 'center',
                              padding: '8px',
                              fontSize: 12,
                              cursor: past || free <= 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {text}
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
