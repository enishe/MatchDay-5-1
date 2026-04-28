import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ORET = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function parseLocalHourSlot(dateStr, hourLabel) {
  return new Date(`${dateStr}T${hourLabel}:00`);
}
function isSlotStartInPast(dateStr, hourLabel) {
  return parseLocalHourSlot(dateStr, hourLabel).getTime() <= Date.now();
}
function terrainLabel(t) {
  if (t === 'indoor_hall') return 'Sallë e mbyllur';
  if (t === 'artificial_grass') return 'Bar artificial';
  return t || '—';
}

export default function BookingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [fields, setFields] = useState([]);
  const [terreni, setTerreni] = useState('');
  const [fushaId, setFushaId] = useState('');
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [patika, setPatika] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loadingFields, setLoadingFields] = useState(true);
  const [availabilityByHour, setAvailabilityByHour] = useState({});
  const [dukeShtuar, setDukeShtuar] = useState(false);
  const [mesazhi, setMesazhi] = useState(null);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 5000);
  }, []);

  useEffect(() => {
    const fid = params.get('fieldId');
    const d = params.get('date');
    if (fid) setFushaId(fid);
    if (d) setData(d);
  }, [params]);

  useEffect(() => {
    if (!token) return;
    setLoadingFields(true);
    apiFetch('/fields')
      .then((rows) => setFields(Array.isArray(rows) ? rows.filter((f) => f.is_active) : []))
      .catch(() => tregoBust('Nuk u ngarkuan fushat.', 'error'))
      .finally(() => setLoadingFields(false));
  }, [token, tregoBust]);

  const fushat = useMemo(() => (terreni ? fields.filter((f) => f.terrain_type === terreni) : fields), [fields, terreni]);
  const fusha = useMemo(() => fushat.find((f) => String(f.id) === String(fushaId)), [fushat, fushaId]);
  const cmimi = Number(fusha?.price_per_hour || 0);
  const splitPreview = Number((cmimi / 12).toFixed(2));
  const totalLojtar = patika ? splitPreview + 2 : splitPreview;

  useEffect(() => {
    if (!fushaId || !data) {
      setAvailabilityByHour({});
      setCourtNumber('');
      return;
    }
    let cancelled = false;
    Promise.all(
      ORET.map(async (h) => {
        const start = parseLocalHourSlot(data, h);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const r = await apiFetch(`/fields/${fushaId}/availability?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
        return [h, r];
      })
    )
      .then((rows) => {
        if (cancelled) return;
        const next = {};
        rows.forEach(([h, r]) => { next[h] = r; });
        setAvailabilityByHour(next);
      })
      .catch(() => !cancelled && setAvailabilityByHour({}));
    return () => { cancelled = true; };
  }, [fushaId, data]);

  const hourOccupied = (hour) => (availabilityByHour[hour]?.available_courts || []).length === 0;
  const hourBlocked = (hour) => hourOccupied(hour) || (data && isSlotStartInPast(data, hour));
  const chosenHourAvailability = ora ? availabilityByHour[ora] : null;
  const courtTaken = ora && courtNumber && chosenHourAvailability && !(chosenHourAvailability.available_courts || []).includes(Number(courtNumber));
  const formComplete = fushaId && data && ora && courtNumber && !courtTaken && !hourBlocked(ora);

  const handleRezervim = async (e) => {
    e.preventDefault();
    if (!formComplete) return tregoBust('Plotëso të gjitha fushat e detyrueshme.', 'error');
    const start = parseLocalHourSlot(data, ora);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDukeShtuar(true);
    try {
      const d = await apiFetch('/matches', {
        token,
        method: 'POST',
        body: {
          fieldId: Number(fushaId),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          totalPrice: cmimi,
          court_number: Number(courtNumber),
          payment_method: paymentMethod,
          shoe_rental: patika,
        },
      });
      const shoesInfo = patika ? 'Me patika.' : 'Pa patika.';
      tregoBust(`Rezervimi u krijua. ${paymentMethod === 'cash' ? `Për pagesë cash: ${shoesInfo}` : 'Pagesë me kartelë.'}`);
      setTimeout(() => navigate(`/match/${d.id}`), 900);
    } catch (err) {
      tregoBust(err.message || 'Ndodhi një gabim.', 'error');
    } finally {
      setDukeShtuar(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Rezervo</h1>
      {mesazhi && <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>{mesazhi.tekst}</div>}
      <form onSubmit={handleRezervim}>
        <div className="booking-grid">
          <div>
            <div className="card">
              <div className="card-title">Hapi 1 — Lloji i terrenit</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn ${terreni === '' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('')}>Të gjitha</button>
                <button type="button" className={`btn ${terreni === 'artificial_grass' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('artificial_grass')}>Bar artificial</button>
                <button type="button" className={`btn ${terreni === 'indoor_hall' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('indoor_hall')}>Sallë e mbyllur</button>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Hapi 2 — Zgjidh lokacionin</div>
              {loadingFields ? <div className="spinner" /> : (
                <select className="input" value={fushaId} onChange={(e) => { setFushaId(e.target.value); setOra(''); setCourtNumber(''); }}>
                  <option value="">— Zgjidh fushën —</option>
                  {fushat.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.location} — {terrainLabel(f.terrain_type)} — {f.price_per_hour}€/orë</option>)}
                </select>
              )}
            </div>
            <div className="card">
              <div className="card-title">Hapi 3 — Data</div>
              <input className="input" type="date" value={data} onChange={(e) => { setData(e.target.value); setOra(''); setCourtNumber(''); }} min={new Date().toISOString().split('T')[0]} />
            </div>
            {data && (
              <div className="card">
                <div className="card-title">Hapi 4 — Ora dhe fushat e lira</div>
                <div className="hour-grid">
                  {ORET.map((h) => {
                    const blocked = hourBlocked(h);
                    return <button key={h} type="button" className={`hour-slot${ora === h ? ' hour-slot--active' : ''}${blocked ? ' hour-slot--disabled' : ''}`} disabled={blocked} onClick={() => { setOra(h); setCourtNumber(''); }}>{h}</button>;
                  })}
                </div>
                {ora && chosenHourAvailability && (
                  <div style={{ marginTop: 12 }}>
                    <div className="label">Zgjidh fushën (court)</div>
                    <div className="court-number-grid">
                      {Array.from({ length: Number(chosenHourAvailability.total_courts || 0) }).map((_, i) => {
                        const nr = i + 1;
                        const free = (chosenHourAvailability.available_courts || []).includes(nr);
                        return <button key={nr} type="button" className={`btn ${String(nr) === String(courtNumber) ? 'btn-primary' : 'btn-ghost'}`} disabled={!free} onClick={() => setCourtNumber(String(nr))}>{nr}</button>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="summary-sticky">
            <div className="card">
              <div className="card-title">Hapi 5-8 — Përmbledhja</div>
              <p style={{ color: 'var(--text-secondary)' }}>Smart Split: <strong>{splitPreview}€</strong> ({cmimi}€ / 12)</p>
              <label style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="checkbox" checked={patika} onChange={(e) => setPatika(e.target.checked)} /> Patika (+2€)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button type="button" className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPaymentMethod('cash')}>Para në dorë</button>
                <button type="button" className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPaymentMethod('card')}>Kartelë</button>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Totali yt: <strong>{totalLojtar.toFixed(2)}€</strong></p>
              <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={!formComplete || dukeShtuar}>
                {dukeShtuar ? 'Duke rezervuar…' : 'Konfirmo'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
