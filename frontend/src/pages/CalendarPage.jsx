import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [reloadKey, setReloadKey] = useState(0);
  const [daysToShow, setDaysToShow] = useState(7);
  const [dayOffset, setDayOffset] = useState(0);
  const touchStartXRef = useRef(null);

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
    function update() {
      const w = window.innerWidth;
      if (w <= 640) setDaysToShow(3);
      else if (w <= 1024) setDaysToShow(5);
      else setDaysToShow(7);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setDayOffset(0);
  }, [weekStart, daysToShow]);

  const maxDayOffset = Math.max(0, 7 - daysToShow);
  const visibleWeekDays = useMemo(() => weekDays.slice(dayOffset, dayOffset + daysToShow), [weekDays, dayOffset, daysToShow]);
  const isMobileCalendar = daysToShow <= 3;

  const goPrevDays = () => setDayOffset((o) => Math.max(0, o - 1));
  const goNextDays = () => setDayOffset((o) => Math.min(maxDayOffset, o + 1));

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
        const qs = new URLSearchParams({
          startDate: toYMD(weekStart),
          days: '7',
          startHour: '8',
          endHour: '22',
        });
        const r = await apiFetch(`/fields/availability-grid?${qs.toString()}`, { token });
        const activeFields = Array.isArray(r?.fields) ? r.fields : [];
        const next = r?.availability && typeof r.availability === 'object' ? r.availability : {};
        if (!cancelled) {
          setFields(activeFields);
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
  }, [token, weekStart, reloadKey]);

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
        <div style={{ marginTop: 12 }}>
          {daysToShow < 7 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <button type="button" className="btn btn-ghost" style={{ padding: '10px 14px' }} disabled={dayOffset === 0} onClick={goPrevDays}>
                ← Ditet
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '10px 14px' }}
                disabled={dayOffset >= maxDayOffset}
                onClick={goNextDays}
              >
                Ditet →
              </button>
            </div>
          )}

          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleWeekDays.length}, 1fr)`, gap: 8, marginTop: 14 }}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current;
              touchStartXRef.current = null;
              if (startX == null) return;
              const endX = e.changedTouches?.[0]?.clientX ?? startX;
              const dx = endX - startX;
              if (Math.abs(dx) < 45) return;
              if (dx < 0) goNextDays();
              else goPrevDays();
            }}
          >
            {visibleWeekDays.map((d, visibleIndex) => {
              const i = dayOffset + visibleIndex;
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
                  <span className="calendar-day-dow">{DITET_SH[i]}</span>
                  <span>{d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' })}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="feedback feedback-error">{error}</div>}
      {error && (
        <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((x) => x + 1)} style={{ marginBottom: 10 }}>
          Provo përsëri
        </button>
      )}
      {loading && (
        <div className="card">
          <div className="skeleton" style={{ height: 420 }} />
        </div>
      )}
      {!loading && !error && fields.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aktualisht nuk ka fusha aktive për të shfaqur kalendarin.</p>
        </div>
      )}

      {!loading && !error && fields.length > 0 && isMobileCalendar && (
        <div className="card">
          <div className="calendar-mobile-grid">
            {fields.map((field) => (
              <article key={field.id} className="calendar-mobile-field-card">
                <h3 style={{ margin: 0 }}>{field.name}</h3>
                <p className="calendar-mobile-slot-label">Data: {selectedDate}</p>
                <div className="calendar-mobile-slot-grid">
                  {ORET.map((time) => {
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
                      <button
                        key={`${field.id}-${selectedDate}-${time}`}
                        type="button"
                        disabled={past || free <= 0}
                        onClick={() => onSlotClick(field.id, selectedDate, time, free)}
                        className="calendar-slot-btn"
                        style={{
                          width: '100%',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          background: bg,
                          textAlign: 'center',
                          padding: '8px',
                          cursor: past || free <= 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {time} - {text}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && fields.length > 0 && !isMobileCalendar && (
        <div className="card calendar-table-wrap">
          <table className="table calendar-table">
            <thead>
              <tr>
                <th>Ora</th>
                {fields.map((field) => (
                  <th key={field.id}>
                    {field.name}<br />
                    <span className="calendar-selected-date">{selectedDate}</span>
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
                          className="calendar-slot-btn"
                          style={{
                            width: '100%',
                            border: '1px solid var(--border-color)',
                            borderRadius: 6,
                            background: bg,
                            textAlign: 'center',
                            padding: '8px',
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
      )}
    </div>
  );
}
