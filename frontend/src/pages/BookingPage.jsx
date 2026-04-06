import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://matchday-5-1.onrender.com/api';

const FUSHAT = [
  { id: 1, emri: 'Fusha Prishtina 1', terrain: 'artificial_grass', cmimi: 60, lokacioni: 'Prishtinë' },
  { id: 2, emri: 'Salla Prizren',      terrain: 'indoor_hall',      cmimi: 60, lokacioni: 'Prizren'   },
];

const ORET = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

export default function BookingPage() {
  const [terreni,     setTerreni]    = useState('');
  const [fushaId,     setFushaId]    = useState('');
  const [data,        setData]       = useState('');
  const [ora,         setOra]        = useState('');
  const [patika,      setPatika]     = useState(false);
  const [duke_shtuar, setDukeShtur]  = useState(false);
  const [mesazhi,     setMesazhi]    = useState(null);
  const navigate = useNavigate();

  const fushat = terreni ? FUSHAT.filter(f => f.terrain === terreni) : FUSHAT;
  const fusha  = FUSHAT.find(f => f.id === parseInt(fushaId));
  const cmimi  = fusha ? fusha.cmimi : 60;
  const splitPreview = parseFloat((cmimi / 12).toFixed(2));
  const totalLojtar  = patika ? splitPreview + 2 : splitPreview;

  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  };

  const handleRezervim = async (e) => {
    e.preventDefault();
    if (!fushaId) return tregoBust('Zgjidhni një fushë.', 'error');
    if (!data)    return tregoBust('Zgjidhni datën.', 'error');
    if (!ora)     return tregoBust('Zgjidhni orën.', 'error');

    const startTime = new Date(`${data}T${ora}:00`);
    const endTime   = new Date(startTime.getTime() + 60 * 60 * 1000);

    if (startTime <= new Date()) return tregoBust('Koha e fillimit duhet të jetë në të ardhmen.', 'error');

    setDukeShtur(true);
    try {
      const res = await fetch(`${API}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId:     parseInt(fushaId),
          organizerId: 1,
          startTime:   startTime.toISOString(),
          endTime:     endTime.toISOString(),
          totalPrice:  cmimi,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      tregoBust(`Termini u rezervua! Smart Split: ${d.price_per_player}€/lojtar.`);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      tregoBust(err.message, 'error');
    } finally {
      setDukeShtur(false);
    }
  };

  const terrainBtn = (active) => ({
    flex: 1, padding: '12px 6px', borderRadius: 8,
    background: active ? '#1a1a2e' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: active ? '2px solid #27ae60' : '1px solid var(--border)',
    fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const fushaCard = (active) => ({
    padding: 14, borderRadius: 8,
    background: active ? '#e8f5e9' : 'var(--bg-secondary)',
    border: active ? '2px solid #27ae60' : '1px solid var(--border)',
    cursor: 'pointer', transition: 'all 0.15s',
  });

  const oraBtn = (active) => ({
    padding: '8px 4px', borderRadius: 6, textAlign: 'center',
    background: active ? '#1a1a2e' : 'var(--bg-secondary)',
    color: active ? '#27ae60' : 'var(--text-secondary)',
    border: active ? '1px solid #27ae60' : '1px solid var(--border)',
    fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="page">
      <div className="page-title">Rezervo Termin</div>
      <div className="page-sub">Zgjidh fushën, datën dhe orën — Smart Split automatik</div>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>
          {mesazhi.tekst}
        </div>
      )}

      <form onSubmit={handleRezervim}>
        <div className="booking-grid">

          {/* Kolona e majtë */}
          <div>
            <div className="card">
              <div className="card-title">Lloji i Terrenit</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={terrainBtn(terreni === '')} onClick={() => setTerreni('')}>Të gjitha</button>
                <button type="button" style={terrainBtn(terreni === 'artificial_grass')} onClick={() => setTerreni('artificial_grass')}>Bar Artificial</button>
                <button type="button" style={terrainBtn(terreni === 'indoor_hall')} onClick={() => setTerreni('indoor_hall')}>Sallë Futsali</button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Zgjidhni Fushën</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fushat.map(f => (
                  <div key={f.id} style={fushaCard(parseInt(fushaId) === f.id)}
                    onClick={() => setFushaId(f.id.toString())}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{f.emri}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {f.lokacioni} · {f.terrain === 'indoor_hall' ? 'Sallë Futsali' : 'Bar Artificial'} · {f.cmimi}€/orë
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Zgjidh Datën</div>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>

            {data && (
              <div className="card">
                <div className="card-title">Zgjidh Orën</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                  {ORET.map(o => (
                    <button key={o} type="button" style={oraBtn(ora === o)} onClick={() => setOra(o)}>{o}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kolona e djathtë — Përmbledhja */}
          <div className="booking-summary" style={{ position: 'sticky', top: 72 }}>
            <div className="card">
              <div className="card-title">Përmbledhja</div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {fusha ? (
                  <>
                    <div style={{ marginBottom: 6 }}><b style={{ color: 'var(--text-primary)' }}>{fusha.emri}</b></div>
                    <div>{fusha.terrain === 'indoor_hall' ? 'Sallë Futsali' : 'Bar Artificial'}</div>
                    {data && <div style={{ marginTop: 4 }}>Data: <b style={{ color: 'var(--text-primary)' }}>{data}</b></div>}
                    {ora  && <div>Ora: <b style={{ color: 'var(--text-primary)' }}>{ora} – {ora.split(':')[0] >= 23 ? '00' : String(parseInt(ora) + 1).padStart(2, '0')}:00</b></div>}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Zgjidhni fushën...</span>
                )}
              </div>

              {fusha && (
                <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#2e7d32', marginBottom: 4, fontWeight: 500 }}>SMART SPLIT</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>{splitPreview}€/lojtar</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{cmimi}€ ÷ 12 lojtarë</div>
                </div>
              )}

              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={patika} onChange={e => setPatika(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Patika me Qira</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+2€ për ty personalisht</div>
                  </div>
                </label>
                {patika && (
                  <div style={{ marginTop: 8, padding: 8, background: '#fff8e1', borderRadius: 6, fontSize: 12, color: '#f57f17' }}>
                    Fatura jote: {totalLojtar.toFixed(2)}€ (fushë + patika)
                  </div>
                )}
              </div>

              {fusha && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Çmimi i fushës</span>
                    <span>{cmimi}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pjesa jote</span>
                    <span style={{ color: '#27ae60', fontWeight: 600 }}>{totalLojtar.toFixed(2)}€</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={duke_shtuar || !fushaId || !data || !ora}
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', opacity: (!fushaId || !data || !ora) ? 0.5 : 1 }}>
                {duke_shtuar ? 'Duke rezervuar...' : 'Konfirmo Rezervimin'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}