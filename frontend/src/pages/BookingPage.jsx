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
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [teamShoes, setTeamShoes] = useState([{ size: 42, count: 1 }]);
  const [fieldInventory, setFieldInventory] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [loadingFields, setLoadingFields] = useState(true);
  const [availabilityByHour, setAvailabilityByHour] = useState({});
  const [dukeShtuar, setDukeShtuar] = useState(false);
  const [mesazhi, setMesazhi] = useState(null);
  const [done, setDone] = useState(null);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 5000);
  }, []);

  useEffect(() => {
    const fid = params.get('fieldId');
    const d = params.get('date');
    const t = params.get('time');
    if (fid) setFushaId(fid);
    if (d) setData(d);
    if (t && ORET.includes(t)) setOra(t);
  }, [params]);

  useEffect(() => {
    if (!token) return;
    setLoadingFields(true);
    Promise.all([apiFetch('/fields'), apiFetch('/friends', { token })])
      .then(([rows, f]) => {
        setFields(Array.isArray(rows) ? rows.filter((x) => x.is_active) : []);
        setFriends(Array.isArray(f) ? f : []);
      })
      .catch(() => tregoBust('Nuk u ngarkuan fushat.', 'error'))
      .finally(() => setLoadingFields(false));
  }, [token, tregoBust]);

  const fushat = useMemo(() => (terreni ? fields.filter((f) => f.terrain_type === terreni) : fields), [fields, terreni]);
  const fusha = useMemo(() => fushat.find((f) => String(f.id) === String(fushaId)), [fushat, fushaId]);
  const cmimi = Number(fusha?.price_per_hour || 0);
  const splitPreview = Number((cmimi / 12).toFixed(2));
  const totalShoes = teamShoes.reduce((s, row) => s + Number(row.count || 0), 0);
  const shoesTotal = totalShoes * 2;
  const cashTotal = Number((cmimi + shoesTotal).toFixed(2));

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

  useEffect(() => {
    if (!fushaId) {
      setFieldInventory([]);
      return;
    }
    apiFetch(`/fields/${fushaId}`)
      .then((r) => setFieldInventory(Array.isArray(r?.shoes_inventory) ? r.shoes_inventory : []))
      .catch(() => setFieldInventory([]));
  }, [fushaId]);

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
      if (paymentMethod === 'cash') {
        const d = await apiFetch('/bookings/cash', {
          token,
          method: 'POST',
          body: {
            fieldId: Number(fushaId),
            courtNumber: Number(courtNumber),
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            teamShoes,
          },
        });
        setDone({
          kind: 'cash',
          title: 'Termini u konfirmua!',
          booking: d,
        });
        return;
      }
      const d = await apiFetch('/bookings/card', {
        token,
        method: 'POST',
        body: {
          fieldId: Number(fushaId),
          courtNumber: Number(courtNumber),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          inviteEmails: selectedEmails,
        },
      });
      setDone({
        kind: 'card',
        title: 'Ftesat u dërguan!',
        booking: d,
      });
    } catch (err) {
      tregoBust(err.message || 'Ndodhi një gabim.', 'error');
    } finally {
      setDukeShtuar(false);
    }
  };

  const addInviteEmail = () => {
    const email = String(manualEmail || '').trim().toLowerCase();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return tregoBust('Shkruani një email të vlefshëm.', 'error');
    if (selectedEmails.includes(email)) return;
    if (selectedEmails.length >= 11) return tregoBust('Mund të ftoni maksimumi 11 lojtarë.', 'error');
    setSelectedEmails((prev) => [...prev, email]);
    setManualEmail('');
  };

  if (done) {
    if (done.kind === 'cash') {
      const summary = Array.isArray(done.booking?.shoes_summary) ? done.booking.shoes_summary : [];
      return (
        <div className="page">
          <h1 className="page-title">{done.title}</h1>
          <div className="card">
            <p>Rezervimi u ruajt me sukses dhe është i konfirmuar.</p>
            <p><strong>Fusha:</strong> {done.booking?.field_name || fusha?.name}</p>
            <p><strong>Data dhe ora:</strong> {new Date(done.booking?.start_time || parseLocalHourSlot(data, ora)).toLocaleString('sq-AL')}</p>
            <p><strong>Patika të nevojshme:</strong> {summary.map((s) => `${s.count} palë nr.${s.size}`).join(', ') || 'Pa patika'}</p>
            <p><strong>Totali i paguar:</strong> {Number(done.booking?.total_amount || cashTotal).toFixed(2)}€</p>
            <button type="button" className="btn btn-accent" onClick={() => navigate('/dashboard')}>Shko te Dashboard</button>
          </div>
        </div>
      );
    }
    return (
      <div className="page">
        <h1 className="page-title">{done.title}</h1>
        <div className="card">
          <p><strong>Linku i ftesës:</strong></p>
          <p style={{ wordBreak: 'break-all' }}>{done.booking?.invite_link}</p>
          <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(done.booking?.invite_link || '')}>
            Kopjo linkun
          </button>
          <p style={{ marginTop: 12 }}>Termini do të konfirmohet automatikisht kur të 12 lojtarët të paguajnë.</p>
          <p>Nëse 12 lojtarët nuk paguajnë deri 2 orë para ndeshjes, rezervimi anulohet automatikisht.</p>
          <button type="button" className="btn btn-accent" onClick={() => navigate('/dashboard')}>Shko te Dashboard</button>
        </div>
      </div>
    );
  }

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
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button type="button" className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPaymentMethod('cash')}>Para në dorë</button>
                <button type="button" className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPaymentMethod('card')}>Kartelë</button>
              </div>
              {paymentMethod === 'cash' ? (
                <>
                  <h3 style={{ marginBottom: 8 }}>Patika për ekipin tënd</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
                    Zgjidhni sa lojtarë kanë nevojë për patika dhe numrin e tyre.
                  </p>
                  {teamShoes.map((row, idx) => (
                    <div key={`shoe-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                      <input className="input" type="number" min="1" max="12" value={row.count} onChange={(e) => {
                        const value = Number(e.target.value || 1);
                        setTeamShoes((prev) => prev.map((x, i) => (i === idx ? { ...x, count: value } : x)));
                      }} />
                      <select className="input" value={row.size} onChange={(e) => {
                        const value = Number(e.target.value || 42);
                        setTeamShoes((prev) => prev.map((x, i) => (i === idx ? { ...x, size: value } : x)));
                      }}>
                        {Array.from({ length: 10 }).map((_, i) => <option key={i} value={36 + i}>Nr. {36 + i}</option>)}
                      </select>
                      <button type="button" className="btn btn-danger" onClick={() => setTeamShoes((prev) => prev.filter((_, i) => i !== idx))}>x</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost" onClick={() => setTeamShoes((prev) => [...prev, { size: 42, count: 1 }])}>
                    + Shto numër tjetër
                  </button>
                  <p style={{ marginBottom: 4 }}>Totali i patikave: <strong>{totalShoes}</strong></p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    Inventari i fushës: {fieldInventory.map((i) => `Nr.${i.shoe_size}: ${i.quantity_available}`).join(' · ') || 'Nuk ka të dhëna'}
                  </p>
                  <hr />
                  <p><strong>Fusha:</strong> {fusha?.name || '—'}</p>
                  <p><strong>Data dhe ora:</strong> {data && ora ? `${data} ${ora}` : '—'}</p>
                  <p><strong>Çmimi i fushës:</strong> {cmimi.toFixed(2)}€</p>
                  <p><strong>Patika:</strong> {totalShoes} palë × 2€ = {shoesTotal.toFixed(2)}€</p>
                  <p><strong>TOTALI:</strong> {cashTotal.toFixed(2)}€</p>
                  <p><strong>Metoda e pagesës:</strong> Para cash</p>
                </>
              ) : (
                <>
                  <h3 style={{ marginBottom: 8 }}>Fto 11 lojtarët e tjerë</h3>
                  <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>{selectedEmails.length} / 11 të ftuar</p>
                  <p>Çmimi për lojtar: <strong>{splitPreview.toFixed(2)}€</strong></p>
                  {friends.map((f) => (
                    <label key={f.friendshipId} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(f.friend.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedEmails.length >= 11) return;
                            setSelectedEmails((prev) => [...prev, f.friend.email]);
                          } else {
                            setSelectedEmails((prev) => prev.filter((x) => x !== f.friend.email));
                          }
                        }}
                      />
                      {f.friend.name} ({f.friend.email})
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="Shto me email" />
                    <button type="button" className="btn btn-ghost" onClick={addInviteEmail}>Shto</button>
                  </div>
                  <p><strong>Çmimi juaj:</strong> {splitPreview.toFixed(2)}€</p>
                  <p>11 lojtarë të tjerë do të paguajnë {splitPreview.toFixed(2)}€ secili.</p>
                  <p><strong>Totali i pritur:</strong> {cmimi.toFixed(2)}€</p>
                </>
              )}
              <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={!formComplete || dukeShtuar}>
                {dukeShtuar ? 'Duke rezervuar…' : paymentMethod === 'cash' ? 'Konfirmo dhe Paguaj' : 'Krijo rezervimin dhe dërgo ftesat'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
