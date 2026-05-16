import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { createUtcDateFromBelgradeHourLabel, formatBelgradeDateTime, getBelgradeTodayYmd } from '../lib/timezone';

const ORET = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const SHOE_SIZES = Array.from({ length: 10 }, (_, i) => 36 + i);

function parseBelgradeHourSlot(dateStr, hourLabel) {
  return createUtcDateFromBelgradeHourLabel(dateStr, hourLabel);
}
function isSlotStartInPast(dateStr, hourLabel) {
  return parseBelgradeHourSlot(dateStr, hourLabel).getTime() <= Date.now();
}
function terrainLabel(t) {
  if (t === 'indoor_hall') return 'Sallë e mbyllur';
  if (t === 'artificial_grass') return 'Bar artificial';
  if (t === 'futsal') return 'Futsal';
  return t || '—';
}

function parseShoesSummary(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildShoesDisplay(summary) {
  const s = parseShoesSummary(summary);
  if (s.length === 0) return 'Pa patika';
  return s.map((x) => `${Number(x.count)} palë nr.${Number(x.size)}`).join(', ');
}

/** Max pairs allowed on this row given inventory and other rows' selections. */
function maxPairsForRow(teamShoes, inventory, rowIndex) {
  const row = teamShoes[rowIndex];
  if (!row) return 0;
  const size = Number(row.size);
  const inv = inventory.find((i) => Number(i.shoe_size) === size);
  const qty = inv ? Number(inv.quantity_available) : 0;
  const usedElsewhere = teamShoes.reduce((sum, r, i) => {
    if (i === rowIndex) return sum;
    if (Number(r.size) !== size) return sum;
    return sum + Math.max(0, Number(r.count) || 0);
  }, 0);
  return Math.max(0, qty - usedElsewhere);
}

function rentForSize(inventory, size) {
  const inv = inventory.find((i) => Number(i.shoe_size) === Number(size));
  const p = inv && inv.rent_price != null ? Number(inv.rent_price) : 2;
  return Number.isFinite(p) && p >= 0 ? p : 2;
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
  const [teamShoes, setTeamShoes] = useState([]);
  const [fieldInventory, setFieldInventory] = useState([]);
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
    apiFetch('/fields')
      .then((rows) => setFields(Array.isArray(rows) ? rows.filter((x) => x.is_active) : []))
      .catch(() => tregoBust('Nuk u ngarkuan fushat.', 'error'))
      .finally(() => setLoadingFields(false));
  }, [token, tregoBust]);

  const fushat = useMemo(() => (terreni ? fields.filter((f) => f.terrain_type === terreni) : fields), [fields, terreni]);
  const fushatSipasLokacionit = useMemo(() => {
    const grouped = {};
    for (const f of fushat) {
      const loc = f.location || 'Pa lokacion';
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(f);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'sq'));
  }, [fushat]);
  const fusha = useMemo(() => fushat.find((f) => String(f.id) === String(fushaId)), [fushat, fushaId]);
  const cmimi = Number(fusha?.price_per_hour || 0);
  const splitPreview = Number((cmimi / 12).toFixed(2));

  const shoesRentTotal = useMemo(
    () =>
      teamShoes.reduce((sum, row) => {
        const c = Math.max(0, Number(row.count) || 0);
        return sum + c * rentForSize(fieldInventory, row.size);
      }, 0),
    [teamShoes, fieldInventory]
  );

  const cashTotal = Number((cmimi + shoesRentTotal).toFixed(2));

  useEffect(() => {
    if (!fushaId || !data) {
      setAvailabilityByHour({});
      setCourtNumber('');
      return;
    }
    let cancelled = false;
    Promise.all(
      ORET.map(async (h) => {
        const start = parseBelgradeHourSlot(data, h);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const r = await apiFetch(
          `/fields/${fushaId}/availability?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
        );
        return [h, r];
      })
    )
      .then((rows) => {
        if (cancelled) return;
        const next = {};
        rows.forEach(([h, r]) => {
          next[h] = r;
        });
        setAvailabilityByHour(next);
      })
      .catch(() => !cancelled && setAvailabilityByHour({}));
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    setTeamShoes([]);
  }, [fushaId]);

  useEffect(() => {
    if (!fieldInventory.length) return;
    setTeamShoes((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((row, idx) => {
        const capFor = (sz) => {
          const inv = fieldInventory.find((i) => Number(i.shoe_size) === Number(sz));
          const qty = inv ? Number(inv.quantity_available) : 0;
          const usedElsewhere = prev.reduce((sum, r, i) => {
            if (i === idx) return sum;
            if (Number(r.size) !== Number(sz)) return sum;
            return sum + Math.max(0, Number(r.count) || 0);
          }, 0);
          return Math.max(0, qty - usedElsewhere);
        };
        let size = Number(row.size);
        if (capFor(size) <= 0) {
          const alt = SHOE_SIZES.find((sz) => capFor(sz) > 0);
          if (alt != null) size = alt;
        }
        const max = capFor(size);
        const count = max <= 0 ? 1 : Math.min(Math.max(1, Number(row.count) || 1), max);
        return { size, count };
      });
    });
  }, [fieldInventory]);

  const hourOccupied = (hour) => (availabilityByHour[hour]?.available_courts || []).length === 0;
  const hourBlocked = (hour) => hourOccupied(hour) || (data && isSlotStartInPast(data, hour));
  const chosenHourAvailability = ora ? availabilityByHour[ora] : null;
  const courtTaken = ora && courtNumber && chosenHourAvailability && !(chosenHourAvailability.available_courts || []).includes(Number(courtNumber));
  const formComplete = fushaId && data && ora && courtNumber && !courtTaken && !hourBlocked(ora);

  const capacityForSizeOption = (rowIndex, size) => {
    const inv = fieldInventory.find((i) => Number(i.shoe_size) === Number(size));
    const qty = inv ? Number(inv.quantity_available) : 0;
    const usedElsewhere = teamShoes.reduce((sum, r, i) => {
      if (i === rowIndex) return sum;
      if (Number(r.size) !== Number(size)) return sum;
      return sum + Math.max(0, Number(r.count) || 0);
    }, 0);
    return Math.max(0, qty - usedElsewhere);
  };

  const handleRezervim = async (e) => {
    e.preventDefault();
    if (!formComplete) return tregoBust('Plotëso të gjitha fushat e detyrueshme.', 'error');
    for (let i = 0; i < teamShoes.length; i += 1) {
      const row = teamShoes[i];
      const max = maxPairsForRow(teamShoes, fieldInventory, i);
      if (max <= 0 || Number(row.count) > max) {
        return tregoBust('Kontrolloni sasinë e patikave sipas inventarit të fushës.', 'error');
      }
    }
    const start = parseBelgradeHourSlot(data, ora);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const payloadShoes = teamShoes
      .map((r) => ({ size: Number(r.size), count: Math.max(0, Number(r.count) || 0) }))
      .filter((r) => Number.isInteger(r.size) && r.size >= 36 && r.size <= 45 && r.count > 0);
    setDukeShtuar(true);
    try {
      const d = await apiFetch('/bookings/cash', {
        token,
        method: 'POST',
        body: {
          fieldId: Number(fushaId),
          courtNumber: Number(courtNumber),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          payment_method: 'cash',
          teamShoes: payloadShoes,
        },
      });
      setDone({
        title: 'Termini u konfirmua!',
        booking: d,
      });
    } catch (err) {
      tregoBust(err.message || 'Ndodhi një gabim.', 'error');
    } finally {
      setDukeShtuar(false);
    }
  };

  const updateShoeRow = (idx, patch) => {
    setTeamShoes((prev) => {
      const next = prev.map((row, i) => (i === idx ? { ...row, ...patch } : row));
      return next.map((row, i) => {
        const max = maxPairsForRow(next, fieldInventory, i);
        if (max <= 0) return { ...row, count: 1 };
        const cnt = Math.min(Math.max(1, Number(row.count) || 1), max);
        return { ...row, count: cnt };
      });
    });
  };

  const addShoeRow = () => {
    setTeamShoes((prev) => {
      const capFor = (sz) => {
        const inv = fieldInventory.find((i) => Number(i.shoe_size) === Number(sz));
        const qty = inv ? Number(inv.quantity_available) : 0;
        const used = prev.reduce((sum, r) => {
          if (Number(r.size) !== Number(sz)) return sum;
          return sum + Math.max(0, Number(r.count) || 0);
        }, 0);
        return Math.max(0, qty - used);
      };
      const first = SHOE_SIZES.find((sz) => capFor(sz) > 0) ?? 42;
      return [...prev, { size: first, count: 1 }];
    });
  };

  const removeShoeRow = (idx) => {
    setTeamShoes((prev) => prev.filter((_, i) => i !== idx));
  };

  if (done) {
    const b = done.booking || {};
    const shoesText = buildShoesDisplay(b.shoes_summary);
    const totalAmt = Number(b.total_amount ?? cashTotal).toFixed(2);
    const smart = Number(b.price_per_player ?? splitPreview).toFixed(2);
    return (
      <div className="page">
        <h1 className="page-title">{done.title}</h1>
        <div className="card">
          <p>Rezervimi u ruajt me sukses dhe është i konfirmuar (pagesa: para në dorë).</p>
          <p><strong>Fusha:</strong> {b.field_name || fusha?.name || '—'}</p>
          <p><strong>Data dhe ora:</strong> {formatBelgradeDateTime(b.start_time || parseBelgradeHourSlot(data, ora), 'sq-AL')}</p>
          <p><strong>Fusha (court):</strong> {b.court_number != null ? b.court_number : courtNumber || '—'}</p>
          <p><strong>Totali:</strong> {totalAmt}€</p>
          <p><strong>Smart Split për lojtar:</strong> {smart}€</p>
          <p><strong>Patika të rezervuara:</strong> {shoesText}</p>
          <button type="button" className="btn btn-accent" onClick={() => navigate('/dashboard')}>
            Shko te Dashboard
          </button>
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
              <div className="booking-terrain-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className={`btn ${terreni === '' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('')}>
                  Të gjitha
                </button>
                <button
                  type="button"
                  className={`btn ${terreni === 'artificial_grass' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTerreni('artificial_grass')}
                >
                  Bar artificial
                </button>
                <button type="button" className={`btn ${terreni === 'indoor_hall' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('indoor_hall')}>
                  Sallë e mbyllur
                </button>
                <button type="button" className={`btn ${terreni === 'futsal' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTerreni('futsal')}>
                  Futsal
                </button>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Hapi 2 — Zgjidh lokacionin</div>
              {loadingFields ? (
                <div className="spinner" />
              ) : (
                <select
                  className="input"
                  value={fushaId}
                  onChange={(e) => {
                    setFushaId(e.target.value);
                    setOra('');
                    setCourtNumber('');
                  }}
                >
                  <option value="">— Zgjidh fushën —</option>
                  {fushatSipasLokacionit.map(([location, locationFields]) => (
                    <optgroup key={location} label={location}>
                      {locationFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} — {terrainLabel(f.terrain_type)} — {f.price_per_hour}€/orë
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
            <div className="card">
              <div className="card-title">Hapi 3 — Data</div>
              <input
                className="input"
                type="date"
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setOra('');
                  setCourtNumber('');
                }}
                min={getBelgradeTodayYmd()}
              />
            </div>
            {data && (
              <div className="card">
                <div className="card-title">Hapi 4 — Ora dhe fushat e lira</div>
                <div className="hour-grid">
                  {ORET.map((h) => {
                    const blocked = hourBlocked(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`hour-slot${ora === h ? ' hour-slot--active' : ''}${blocked ? ' hour-slot--disabled' : ''}`}
                        disabled={blocked}
                        onClick={() => {
                          setOra(h);
                          setCourtNumber('');
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
                {ora && chosenHourAvailability && (
                  <div style={{ marginTop: 12 }}>
                    <div className="label">Zgjidh fushën (court)</div>
                    <div className="court-number-grid">
                      {Array.from({ length: Number(chosenHourAvailability.total_courts || 0) }).map((_, i) => {
                        const nr = i + 1;
                        const free = (chosenHourAvailability.available_courts || []).includes(nr);
                        return (
                          <button
                            key={nr}
                            type="button"
                            className={`btn ${String(nr) === String(courtNumber) ? 'btn-primary' : 'btn-ghost'}`}
                            disabled={!free}
                            onClick={() => setCourtNumber(String(nr))}
                          >
                            {nr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="summary-sticky">
            <div className="card">
              <div className="card-title">Përmbledhja dhe konfirmimi</div>
              <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 12 }}>
                Pagesa bëhet vetëm <strong>para në dorë</strong> në fushë.
              </p>

              <div className="card-title" style={{ fontSize: '1rem', marginTop: 8 }}>
                Patika me qira (+2€ për palë)
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: 0, fontSize: 14 }}>
                Patikat janë opsionale. Nëse nuk ju duhen, mos shtoni asnjë rresht dhe vazhdoni me konfirmimin.
                Nëse ju duhen, shtoni një masë nga një; sasia nuk mund të kalojë inventarin e fushës.
              </p>
              {teamShoes.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
                  Aktualisht pa patika — totali përfshin vetëm çmimin e orës së fushës.
                </p>
              )}
              {teamShoes.map((row, idx) => {
                const maxPairs = maxPairsForRow(teamShoes, fieldInventory, idx);
                return (
                  <div
                    key={`shoe-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                      gap: 8,
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
                        Masa
                      </div>
                      <select
                        className="input"
                        value={row.size}
                        onChange={(e) => updateShoeRow(idx, { size: Number(e.target.value) })}
                      >
                        {SHOE_SIZES.map((sz) => {
                          const cap = capacityForSizeOption(idx, sz);
                          return (
                            <option key={sz} value={sz} disabled={cap <= 0}>
                              Nr. {sz}
                              {fieldInventory.length ? ` (${cap} të lira)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
                        Sasia (max {maxPairs || 0})
                      </div>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={Math.max(1, maxPairs)}
                        value={row.count}
                        onChange={(e) => updateShoeRow(idx, { count: Number(e.target.value || 1) })}
                      />
                    </div>
                    <button type="button" className="btn btn-danger" style={{ alignSelf: 'end' }} onClick={() => removeShoeRow(idx)}>
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addShoeRow}
                style={{ marginBottom: 12 }}
                disabled={!fushaId}
              >
                {teamShoes.length === 0 ? '+ Shto patika (opsionale)' : '+ Shto masë tjetër'}
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                Inventari:{' '}
                {fieldInventory.length
                  ? fieldInventory.map((i) => `Nr.${i.shoe_size}: ${i.quantity_available}`).join(' · ')
                  : fushaId
                    ? 'Duke ngarkuar…'
                    : 'Zgjidh fushën'}
              </p>

              <hr />
              <p><strong>Fusha:</strong> {fusha?.name || '—'}</p>
              <p><strong>Data dhe ora:</strong> {data && ora ? `${data} ${ora}` : '—'}</p>
              <p><strong>Fusha (court):</strong> {courtNumber || '—'}</p>
              <p><strong>Çmimi i fushës:</strong> {cmimi.toFixed(2)}€</p>
              <p><strong>Patika:</strong> {shoesRentTotal.toFixed(2)}€</p>
              <p><strong>Smart Split për lojtar:</strong> {splitPreview.toFixed(2)}€</p>
              <p><strong>TOTALI:</strong> {cashTotal.toFixed(2)}€</p>
              <p><strong>Metoda e pagesës:</strong> Para në dorë (cash)</p>
              <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={!formComplete || dukeShtuar}>
                {dukeShtuar ? 'Duke rezervuar…' : 'Konfirmo rezervimin'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
