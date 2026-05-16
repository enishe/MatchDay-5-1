import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  createUtcDateFromBelgradeHourLabel,
  formatBelgradeDate,
  getBelgradeTodayYmd,
} from '../lib/timezone';

const ORET = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const DITET = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
const DITET_SHORT = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
const MUAJT = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'];

function parseBelgradeHourSlot(dateStr, hourLabel) {
  return createUtcDateFromBelgradeHourLabel(dateStr, hourLabel);
}
function isSlotStartInPast(dateStr, hourLabel) {
  return parseBelgradeHourSlot(dateStr, hourLabel).getTime() <= Date.now();
}
function addDaysYmd(ymd, daysToAdd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + daysToAdd);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function getWeekdayFromYmd(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function formatDayYmd(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DITET[dayIndex]} ${String(d).padStart(2, '0')} ${MUAJT[m - 1]}`;
}

function terrainLabel(t) {
  if (t === 'artificial_grass') return 'Bar Artificial';
  if (t === 'indoor_hall') return 'Sallë e mbyllur';
  if (t === 'futsal') return 'Futsali';
  return t || '';
}

export default function CalendarPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const todayYmd = useMemo(() => getBelgradeTodayYmd(), []);
  const minBackLimitYmd = useMemo(() => addDaysYmd(todayYmd, 7), [todayYmd]);
  const [weekStart, setWeekStart] = useState(() => todayYmd);
  const [fields, setFields] = useState([]);
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => todayYmd);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [daysToShow, setDaysToShow] = useState(7);
  const [dayOffset, setDayOffset] = useState(0);
  const touchStartXRef = useRef(null);

  const weekDays = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      out.push(addDaysYmd(weekStart, i));
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
  const canGoBack = weekStart > minBackLimitYmd;

  const goPrevDays = () => setDayOffset((o) => Math.max(0, o - 1));
  const goNextDays = () => setDayOffset((o) => Math.min(maxDayOffset, o + 1));

  useEffect(() => {
    if (!weekDays.some((d) => d === selectedDate)) {
      setSelectedDate(weekDays[0]);
    }
  }, [weekDays, selectedDate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          startDate: weekStart,
          days: '7',
          startHour: '12',
          endHour: '23',
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
      <p className="page-subtitle">Pamje javore me fusha dhe orare të disponueshme.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="mobile-tabs-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!canGoBack}
            onClick={() => {
              setWeekStart((w) => {
                const prev = addDaysYmd(w, -7);
                return prev < todayYmd ? todayYmd : prev;
              });
            }}
          >
            ← Java e kaluar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setWeekStart((w) => addDaysYmd(w, 7))}>
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
              const ymd = d;
              const active = ymd === selectedDate;
              const isToday = ymd === todayYmd;
              return (
                <button
                  key={ymd}
                  type="button"
                  className={`btn ${active ? 'btn-accent' : 'btn-ghost'}`}
                  style={{
                    height: 'auto',
                    padding: '8px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isToday ? 'rgba(39, 174, 96, 0.18)' : undefined,
                    borderColor: isToday ? 'var(--accent)' : undefined,
                    borderWidth: isToday ? 2 : undefined,
                  }}
                  onClick={() => setSelectedDate(ymd)}
                >
                  <span className="calendar-day-dow">{daysToShow <= 3 ? DITET_SHORT[getWeekdayFromYmd(ymd)] : DITET[getWeekdayFromYmd(ymd)]}</span>
                  <span>{formatBelgradeDate(`${ymd}T12:00:00.000Z`, 'sq-AL', { day: '2-digit', month: 'short' })}</span>
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

      {!loading && !error && fields.length > 0 && (
        <div className="card calendar-table-wrap" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="table calendar-table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Ora</th>
                {fields.map((field) => (
                  <th key={field.id} style={{ verticalAlign: 'top', minWidth: 120 }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 13 }}>{field.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {terrainLabel(field.terrain_type)}
                    </div>
                    {Number(field.courts_count) > 1 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        • {field.courts_count} fusha
                      </div>
                    )}
                    <span
                      className={`calendar-selected-date${daysToShow <= 3 ? ' calendar-mobile-dow' : ''}`}
                      style={{ display: 'block', marginTop: 4, fontSize: 12 }}
                    >
                      {daysToShow <= 3 ? DITET_SHORT[getWeekdayFromYmd(selectedDate)] : formatDayYmd(selectedDate)}
                    </span>
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
                    const past = selectedDate === todayYmd && isSlotStartInPast(selectedDate, time);
                    let text = 'Lirë';
                    let bg = 'rgba(39, 174, 96, 0.25)'; // GREEN
                    if (past) {
                      text = 'Ka kaluar';
                      bg = 'rgba(128, 128, 128, 0.40)'; // GRAY
                    } else if (free <= 0) {
                      text = 'Zënë';
                      bg = 'rgba(192, 57, 43, 0.35)'; // RED
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
