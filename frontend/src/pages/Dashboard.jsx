import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://matchday-5-1.onrender.com/api';
const DITET = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

function sot() { return new Date(); }
function formatDate(d) {
  return new Date(d).toLocaleString('sq-AL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/matches/stats`).then(r => r.json()),
      fetch(`${API}/matches`).then(r => r.json()),
    ]).then(([s, m]) => {
      setStats(s);
      setMatches(Array.isArray(m) ? m : []);
    }).catch(() => setError('Nuk mund të lidhet me serverin.')).finally(() => setLoading(false));
  }, []);

  const fillim = new Date();
  fillim.setDate(fillim.getDate() - fillim.getDay() + 1);

  const javaMatches = matches.filter(m => {
    const d = new Date(m.start_time);
    const fund = new Date(fillim);
    fund.setDate(fund.getDate() + 6);
    return d >= fillim && d <= fund;
  });

  if (loading) return <div className="page"><p style={{ color: 'var(--text-secondary)' }}>Duke ngarkuar...</p></div>;
  if (error)   return <div className="page"><div className="feedback feedback-error">{error}</div></div>;

  const statKartat = [
    { label: 'Gjithsej Ndeshje', vlera: stats?.total ?? 0,              ngjyra: '#1a1a2e' },
    { label: 'Totali Çmimeve',   vlera: `${stats?.totali_cmimit ?? 0}€`, ngjyra: '#1565c0' },
    { label: 'Çmimi Mesatar',    vlera: `${stats?.mesatare ?? 0}€`,      ngjyra: '#27ae60' },
    { label: 'Në Pritje',        vlera: stats?.pending ?? 0,             ngjyra: '#f39c12' },
  ];

  return (
    <div className="page">
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Mirë se erdhe në MatchDay 5+1 — Smart Split aktiv</div>

      {/* Stat Cards */}
      <div className="stat-grid-4">
        {statKartat.map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16, borderLeft: `4px solid ${k.ngjyra}`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.ngjyra }}>{k.vlera}</div>
          </div>
        ))}
      </div>

      {/* Statuset */}
      <div className="stat-grid-3">
        {[
          { label: 'Në Pritje',   n: stats?.pending,   c: '#f39c12' },
          { label: 'Konfirmuara', n: stats?.confirmed, c: '#27ae60' },
          { label: 'Anuluara',    n: stats?.canceled,  c: '#e74c3c' },
        ].map((st, i) => (
          <div key={i} style={{
            background: st.c + '14', border: `1px solid ${st.c}44`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: st.c, fontWeight: 600 }}>{st.label}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: st.c }}>{st.n ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Kalendari + Ndeshjet */}
      <div className="grid-2-col" style={{ gap: 16 }}>

        {/* Kalendari Javor */}
        <div className="card">
          <div className="card-title">Java Aktuale</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DITET.map((d, i) => {
              const data = new Date(fillim);
              data.setDate(data.getDate() + i);
              const eshteSOt = data.toDateString() === sot().toDateString();
              const kaMatch  = javaMatches.some(m => new Date(m.start_time).toDateString() === data.toDateString());
              return (
                <div key={i} style={{
                  background: eshteSOt ? '#1a1a2e' : 'var(--bg-secondary)',
                  color: eshteSOt ? '#27ae60' : 'var(--text-secondary)',
                  borderRadius: 8, padding: '8px 4px', textAlign: 'center',
                  fontSize: 11, fontWeight: eshteSOt ? 700 : 400,
                  border: '1px solid var(--border)',
                }}>
                  <div>{d}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{data.getDate()}</div>
                  {kaMatch && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27ae60', margin: '4px auto 0' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Pika e gjelbër = ndeshje e planifikuar
          </div>
        </div>

        {/* Ndeshjet e fundit */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Ndeshjet e Fundit</div>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => navigate('/booking')}>+ Rezervo</button>
          </div>
          {matches.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nuk ka ndeshje.</p>}
          {matches.slice(0, 5).map(m => (
            <div key={m.id}
              onClick={() => navigate(`/match/${m.id}`)}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Fusha #{m.field_id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(m.start_time)}</div>
              </div>
              <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 600 }}>{m.price_per_player}€</div>
              <div style={{ fontSize: 13 }}>{m.total_price}€</div>
              <span className={`badge badge-${m.status}`}>
                {m.status === 'pending' ? 'Pritje' : m.status === 'confirmed' ? 'OK' : 'Anuluar'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-title">Veprime të Shpejta</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-accent" onClick={() => navigate('/booking')}>+ Rezervo Termin</button>
          <button className="btn btn-ghost"  onClick={() => navigate('/equipment')}>Pajisjet Ndihmëse</button>
          <button className="btn btn-ghost"  onClick={() => navigate('/admin')}>Panel Admin</button>
        </div>
      </div>
    </div>
  );
}