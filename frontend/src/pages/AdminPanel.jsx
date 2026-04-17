import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase } from '../lib/api';

export default function AdminPanel() {
  const [matches, setMatches] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtri,  setFiltri]  = useState('');
  const [mesazhi, setMesazhi] = useState(null);
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${getApiBase()}/matches${filtri ? `?status=${filtri}` : ''}`).then(r => r.json()),
      fetch(`${getApiBase()}/matches/stats`).then(r => r.json()),
    ]).then(([m, s]) => {
      setMatches(Array.isArray(m) ? m : []);
      setStats(s);
    }).catch(() => tregoBust('Gabim gjatë ngarkimit.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filtri]);

  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 3000);
  };

  const handleFshi = async (id) => {
    if (!window.confirm(`Fshi rezervimin #${id}?`)) return;
    try {
      const res = await fetch(`${getApiBase()}/matches/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gabim gjatë fshirjes.');
      tregoBust(`Rezervimi #${id} u fshi.`);
      fetchData();
    } catch (err) { tregoBust(err.message, 'error'); }
  };

  const handleNdrysho = async (id, status) => {
    try {
      const res = await fetch(`${getApiBase()}/matches/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Gabim.');
      tregoBust('Statusi u ndryshua.');
      fetchData();
    } catch (err) { tregoBust(err.message, 'error'); }
  };

  return (
    <div className="page">
      <div className="page-title">Panel Admin</div>
      <div className="page-sub">Menaxho fushat, rezervimet dhe inventarin</div>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>
          {mesazhi.tekst}
        </div>
      )}

      {/* Statistikat */}
      {stats && (
        <div className="stat-grid-4">
          {[
            { label: 'Gjithsej',    vlera: stats.total,              ngjyra: '#1a1a2e' },
            { label: 'Të Ardhurat', vlera: `${stats.totali_cmimit}€`, ngjyra: '#1565c0' },
            { label: 'Konfirmuara', vlera: stats.confirmed,          ngjyra: '#27ae60' },
            { label: 'Në Pritje',   vlera: stats.pending,            ngjyra: '#f39c12' },
          ].map((k, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16, borderLeft: `4px solid ${k.ngjyra}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.ngjyra }}>{k.vlera}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Të gjitha Rezervimet</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ width: 'auto' }} value={filtri} onChange={e => setFiltri(e.target.value)}>
              <option value="">Të gjitha</option>
              <option value="pending">Në Pritje</option>
              <option value="confirmed">Konfirmuara</option>
              <option value="canceled">Anuluara</option>
            </select>
            <button className="btn btn-accent" onClick={() => navigate('/booking')}>+ Shto</button>
          </div>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Duke ngarkuar...</p>}
        {!loading && matches.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nuk ka rezervime.</p>}

        {!loading && matches.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fusha</th>
                  <th>Data / Ora</th>
                  <th>Çmimi</th>
                  <th>Split</th>
                  <th>Statusi</th>
                  <th>Veprimet</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>#{m.id}</td>
                    <td>#{m.field_id}</td>
                    <td style={{ fontSize: 12 }}>{new Date(m.start_time).toLocaleString('sq-AL')}</td>
                    <td>{m.total_price}€</td>
                    <td style={{ color: '#27ae60', fontWeight: 600 }}>{m.price_per_player}€</td>
                    <td>
                      <span className={`badge badge-${m.status}`}>
                        {m.status === 'pending' ? 'Pritje' : m.status === 'confirmed' ? 'OK' : 'Anuluar'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => navigate(`/match/${m.id}`)}>Hap</button>
                        {m.status === 'pending' && (
                          <button className="btn btn-accent" style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleNdrysho(m.id, 'confirmed')}>✓</button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => handleFshi(m.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fushat */}
      <div className="card">
        <div className="card-title">Fushat e Disponueshme</div>
        <div className="grid-2-col" style={{ gap: 12 }}>
          {[
            { id: 1, emri: 'Fusha Prishtina 1', terrain: 'Bar Artificial', cmimi: 60, aktive: true },
            { id: 2, emri: 'Salla Prizren',      terrain: 'Sallë Futsali',  cmimi: 60, aktive: true },
          ].map(f => (
            <div key={f.id} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.emri}</div>
                <span className={`badge ${f.aktive ? 'badge-confirmed' : 'badge-canceled'}`}>
                  {f.aktive ? 'Aktive' : 'Joaktive'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.terrain} · {f.cmimi}€/orë</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}