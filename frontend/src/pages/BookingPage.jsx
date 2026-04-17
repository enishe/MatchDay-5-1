import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const ORET = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

function terrainLabel(t) {
  if (t === 'indoor_hall') return 'Sallë Futsali';
  if (t === 'artificial_grass') return 'Bar Artificial';
  return t || '—';
}

export default function BookingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState([]);
  const [terreni, setTerreni] = useState('');
  const [fushaId, setFushaId] = useState('');
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [patika, setPatika] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loadingFields, setLoadingFields] = useState(true);
  const [occupiedHours, setOccupiedHours] = useState([]);
  const [slotConflict, setSlotConflict] = useState(false);
  const [duke_shtuar, setDukeShtur] = useState(false);
  const [mesazhi, setMesazhi] = useState(null);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 5000);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoadingFields(true);
    apiFetch('/fields', { token })
      .then((rows) => setFields(Array.isArray(rows) ? rows : []))
      .catch(() => tregoBust('Nuk u ngarkuan fushat.', 'error'))
      .finally(() => setLoadingFields(false));
  }, [token, tregoBust]);

  const fushat = useMemo(() => {
    if (!terreni) return fields;
    return fields.filter((f) => f.terrain_type === terreni);
  }, [fields, terreni]);

  const fusha = useMemo(() => fushat.find((f) => f.id === parseInt(fushaId, 10)), [fushat, fushaId]);
  const cmimi = fusha ? fusha.price_per_hour : 0;
  const splitPreview = parseFloat((cmimi / 12).toFixed(2));
  const totalLojtar = patika ? splitPreview + 2 : splitPreview;

  useEffect(() => {
    if (!token || !fushaId || !data) {
      setOccupiedHours([]);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ fieldId: fushaId, date: data }).toString();
    apiFetch(`/bookings/availability?${q}`, { token })
      .then((res) => {
        if (!cancelled) setOccupiedHours(res.occupiedHours || []);
      })
      .catch(() => {
        if (!cancelled) setOccupiedHours([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, fushaId, data]);

  useEffect(() => {
    if (!token || !fushaId || !data || !ora) {
      setSlotConflict(false);
      return;
    }
    const startTime = new Date(`${data}T${ora}:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    let cancelled = false;
    const q = new URLSearchParams({
      fieldId: fushaId,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    }).toString();
    apiFetch(`/bookings/check?${q}`, { token })
      .then((res) => {
        if (!cancelled) setSlotConflict(res.available === false);
      })
      .catch(() => {
        if (!cancelled) setSlotConflict(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, fushaId, data, ora]);

  const hourOccupied = (hourLabel) => {
    const h = parseInt(hourLabel.split(':')[0], 10);
    return occupiedHours.includes(h);
  };

  const handleRezervim = async (e) => {
    e.preventDefault();
    if (!fushaId) return tregoBust('Zgjidhni një fushë.', 'error');
    if (!data) return tregoBust('Zgjidhni datën.', 'error');
    if (!ora) return tregoBust('Zgjidhni orën.', 'error');
    if (slotConflict) return tregoBust('Orari është i zënë.', 'error');

    const startTime = new Date(`${data}T${ora}:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    if (startTime <= new Date()) return tregoBust('Koha duhet të jetë në të ardhmen.', 'error');

    setDukeShtur(true);
    try {
      const d = await apiFetch('/matches', {
        token,
        method: 'POST',
        body: {
          fieldId: parseInt(fushaId, 10),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalPrice: cmimi,
          payment_method: paymentMethod,
          shoe_rental: patika,
        },
      });
      tregoBust(`Termini u rezervua! Smart Split: ${d.price_per_player}€/lojtar.`, 'sukses');
      setTimeout(() => navigate(`/match/${d.id}`), 1200);
    } catch (err) {
      tregoBust(err.message || 'Gabim', 'error');
    } finally {
      setDukeShtur(false);
    }
  };

  const terrainBtn = (active) => ({
    flex: 1,
    padding: '12px 6px',
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--color-primary)' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: active ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const fushaCard = (active) => ({
    padding: 14,
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--color-accent-light)' : 'var(--bg-secondary)',
    border: active ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const formComplete = fushaId && data && ora && !slotConflict && !hourOccupied(ora);

  return (
    <div className="page">
      <h1 className="page-title">Rezervo Termin</h1>
      <p className="page-subtitle">Zgjidh fushën, datën dhe orën — Smart Split automatik</p>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>{mesazhi.tekst}</div>
      )}

      <form onSubmit={handleRezervim}>
        <div className="booking-grid">
          <div>
            <div className="card">
              <div className="card-title">Hapi 1 — Lloji i terrenit</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" style={terrainBtn(terreni === '')} onClick={() => setTerreni('')}>
                  Të gjitha
                </button>
                <button type="button" style={terrainBtn(terreni === 'artificial_grass')} onClick={() => setTerreni('artificial_grass')}>
                  Bar Artificial
                </button>
                <button type="button" style={terrainBtn(terreni === 'indoor_hall')} onClick={() => setTerreni('indoor_hall')}>
                  Sallë Futsali
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Hapi 2 — Zgjidh fushën</div>
              {loadingFields && <p style={{ color: 'var(--text-muted)' }}>Duke ngarkuar fushat…</p>}
              {!loadingFields && fushat.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>Nuk ka fusha për këtë filtrim.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fushat.map((f) => (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    style={fushaCard(parseInt(fushaId, 10) === f.id)}
                    onClick={() => setFushaId(String(f.id))}
                    onKeyDown={(e) => e.key === 'Enter' && setFushaId(String(f.id))}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Field #{f.id} — {f.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {f.location || '—'} · {terrainLabel(f.terrain_type)} · {f.price_per_hour}€/orë
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Hapi 3 — Zgjidh datën</div>
              <input
                className="input"
                type="date"
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setOra('');
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {data && (
              <div className="card">
                <div className="card-title">Hapi 4 — Zgjidh orën</div>
                <div className="hour-grid">
                  {ORET.map((o) => {
                    const occ = hourOccupied(o);
                    const active = ora === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        disabled={occ}
                        className={`hour-slot${active ? ' hour-slot--active' : ''}${occ ? ' hour-slot--disabled' : ''}`}
                        onClick={() => !occ && setOra(o)}
                      >
                        {o}
                        {occ && (
                          <span className="badge badge-canceled" style={{ display: 'block', marginTop: 4, fontSize: 9 }}>
                            E zënë
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {slotConflict && ora && (
                  <p className="feedback feedback-error" style={{ marginTop: 12, marginBottom: 0 }}>
                    Intervali përket një rezervimi tjetër. Zgjidhni orë tjetër.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="summary-sticky">
            <div className="card">
              <div className="card-title">Përmbledhja</div>
              {!fusha ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Zgjidhni fushën…</p>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    <div style={{ marginBottom: 6 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{fusha.name}</strong>
                    </div>
                    <div>{terrainLabel(fusha.terrain_type)}</div>
                    {data && (
                      <div style={{ marginTop: 4 }}>
                        Data: <strong>{data}</strong>
                      </div>
                    )}
                    {ora && (
                      <div>
                        Ora:{' '}
                        <strong>
                          {ora} – {String((parseInt(ora.split(':')[0], 10) + 1) % 24).padStart(2, '0')}:00
                        </strong>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: 'var(--color-accent-light)',
                      border: '1px solid rgba(39,174,96,0.35)',
                      borderRadius: 'var(--radius-md)',
                      padding: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--color-accent-hover)', marginBottom: 4, fontWeight: 600 }}>
                      SMART SPLIT PREVIEW
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>{splitPreview}€/lojtar</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {cmimi}€ ÷ 12 = {splitPreview.toFixed(2)}€/lojtar
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={patika} onChange={(e) => setPatika(e.target.checked)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Patika (+2€ vetëm për ty)</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shtohet në faturën tënde personale</div>
                      </div>
                    </label>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div className="label">Metoda e pagesës</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1 }}
                        onClick={() => setPaymentMethod('cash')}
                      >
                        Cash
                      </button>
                      <button
                        type="button"
                        className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1 }}
                        onClick={() => setPaymentMethod('card')}
                      >
                        Card
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Çmimi i fushës</span>
                      <span>{cmimi}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Totali yt</span>
                      <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{totalLojtar.toFixed(2)}€</span>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={duke_shtuar || !formComplete}
              >
                {duke_shtuar ? 'Duke rezervuar…' : 'Konfirmo Rezervimin'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
