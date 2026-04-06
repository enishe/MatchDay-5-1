import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'https://matchday-5-1.onrender.com/api';

const LOJTARET_MOCK = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  emri: i === 0 ? 'Ti (Organizatori)' : `Lojtar ${i + 1}`,
  paguar: i < 7,
  patika: i === 2 || i === 5,
}));

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match,   setMatch]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [mesazhi, setMesazhi] = useState(null);

  useEffect(() => {
    fetch(`${API}/matches/${id}`)
      .then(r => r.json())
      .then(d => setMatch(d))
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, [id]);

  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  };

  const handleAnulo = async () => {
    if (!window.confirm('A jeni i sigurt që dëshironi ta anuloni ndeshjen?')) return;
    try {
      const res  = await fetch(`${API}/matches/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.cancellationNote) tregoBust(data.cancellationNote, 'warning');
      else tregoBust('Ndeshja u anulua.');
      setMatch(prev => ({ ...prev, status: 'canceled' }));
    } catch (err) { tregoBust(err.message, 'error'); }
  };

  const handleKonfirmo = async () => {
    try {
      const res  = await fetch(`${API}/matches/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      tregoBust('Ndeshja u konfirmua!');
      setMatch(prev => ({ ...prev, status: 'confirmed' }));
    } catch (err) { tregoBust(err.message, 'error'); }
  };

  if (loading) return <div className="page"><p style={{ color: 'var(--text-muted)' }}>Duke ngarkuar...</p></div>;
  if (!match)  return <div className="page"><div className="feedback feedback-error">Ndeshja nuk u gjet.</div></div>;

  const paguarCount = LOJTARET_MOCK.filter(l => l.paguar).length;
  const progres     = Math.round((paguarCount / 12) * 100);
  const taniMs      = new Date().getTime();
  const fillimMs    = new Date(match.start_time).getTime();
  const oresNeMbetur = ((fillimMs - taniMs) / 3600000).toFixed(1);
  const kapenalitet  = parseFloat(oresNeMbetur) < 2;

  return (
    <div className="page">
      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>← Kthehu</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Ndeshja #{match.id}</div>
          <div className="page-sub">Fusha #{match.field_id} · {new Date(match.start_time).toLocaleString('sq-AL')}</div>
        </div>
        <span className={`badge badge-${match.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
          {match.status === 'pending' ? 'Në Pritje' : match.status === 'confirmed' ? 'Konfirmuar' : 'Anuluar'}
        </span>
      </div>

      {mesazhi && <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : mesazhi.lloji === 'warning' ? 'warning' : 'success'}`}>{mesazhi.tekst}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* Lista e Lojtarëve */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Lojtarët ({paguarCount}/12 kanë paguar)</div>
            <span style={{ fontSize: 13, color: '#27ae60', fontWeight: 600 }}>{progres}%</span>
          </div>

          {/* Progress Bar */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, height: 8, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ width: `${progres}%`, height: '100%', background: '#27ae60', borderRadius: 6, transition: 'width 0.3s' }} />
          </div>

          {LOJTARET_MOCK.map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: l.paguar ? '#e8f5e9' : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  color: l.paguar ? '#2e7d32' : 'var(--text-muted)',
                }}>
                  {l.emri.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{l.emri}</div>
                  {l.patika && <div style={{ fontSize: 11, color: '#f57f17' }}>+ Patika me qira (+2€)</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#27ae60' }}>
                  {l.patika ? (parseFloat(match.price_per_player) + 2).toFixed(2) : match.price_per_player}€
                </span>
                <span className={`badge ${l.paguar ? 'badge-paid' : 'badge-pending'}`}>
                  {l.paguar ? 'Paguar' : 'Pa paguar'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detajet dhe Veprimet */}
        <div>
          <div className="card">
            <div className="card-title">Detajet Financiare</div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Çmimi total', `${match.total_price}€`],
                ['Smart Split', `${match.price_per_player}€/lojtar`],
                ['Mbledhur', `${(paguarCount * parseFloat(match.price_per_player)).toFixed(2)}€`],
                ['Mbetur', `${((12 - paguarCount) * parseFloat(match.price_per_player)).toFixed(2)}€`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logjika e Anulimit — US #5 dhe #6 */}
          {match.status !== 'canceled' && (
            <div className="card">
              <div className="card-title">Anulimi</div>
              {kapenalitet ? (
                <div className="feedback feedback-warning" style={{ marginBottom: 12 }}>
                  Brenda 2 orëve — penalitet 40% e çmimit të fushës!
                </div>
              ) : (
                <div className="feedback feedback-success" style={{ marginBottom: 12 }}>
                  {oresNeMbetur} orë para — anulim pa penalitet (US #5)
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {match.status === 'pending' && (
                  <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={handleKonfirmo}>
                    Konfirmo Ndeshjen
                  </button>
                )}
                <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAnulo}>
                  Anulo Ndeshjen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}