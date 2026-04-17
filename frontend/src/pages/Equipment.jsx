import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const GJENDJA_LABEL = { good: 'Mirë', fair: 'Mesatare', poor: 'Keq' };
const GJENDJA_COLOR = { good: '#27ae60', fair: '#f39c12', poor: '#e74c3c' };

export default function Equipment() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtri, setFiltri] = useState('all');
  const [zgjedhur, setZgjedhur] = useState(null);
  const [rating, setRating] = useState({});
  const [mesazhi, setMesazhi] = useState(null);

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 3000);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch('/shoes/inventory', { token })
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const patikat = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      madhesia: r.size,
      cmimi: parseFloat(r.rent_price || 2),
      disponueshme: r.available === true,
      gjendja: r.condition || 'good',
      rating_avg: parseFloat(r.rating_avg) || 0,
    }));
  }, [rows]);

  const filtriList = useMemo(() => {
    if (filtri === 'available') return patikat.filter((p) => p.disponueshme);
    if (filtri === 'unavailable') return patikat.filter((p) => !p.disponueshme);
    return patikat;
  }, [patikat, filtri]);

  const disponueshme = patikat.filter((p) => p.disponueshme).length;

  const handleRezervim = (id) => {
    setZgjedhur(id);
    tregoBust('Patika u zgjodh — +2€ do shtohen në faturën tënde gjatë rezervimit të ndeshjes.');
  };

  const handleRating = (id, stars) => {
    setRating((prev) => ({ ...prev, [id]: stars }));
    tregoBust('Vlerësimi lokal u përditësua (US #10).');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="feedback feedback-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Patika me Qira</h1>
      <p className="page-subtitle">Çdo madhësi — çmimi 2€/lojë · vlerësimi yje 1–5</p>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>{mesazhi.tekst}</div>
      )}

      <div className="stat-grid-3">
        {[
          { label: 'Gjithsej palë', vlera: patikat.length, ngjyra: 'var(--color-primary)' },
          { label: 'Disponueshme', vlera: disponueshme, ngjyra: 'var(--color-accent)' },
          { label: 'Rezervuara', vlera: patikat.length - disponueshme, ngjyra: 'var(--color-danger)' },
        ].map((k) => (
          <div key={k.label} className="stat-card" style={{ '--stat-accent': k.ngjyra }}>
            <div className="stat-card-label">{k.label}</div>
            <div className="stat-card-value">{k.vlera}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['all', 'Të gjitha'],
          ['available', 'Disponueshme'],
          ['unavailable', 'Rezervuara'],
        ].map(([v, l]) => (
          <button key={v} type="button" className={`btn ${filtri === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltri(v)}>
            {l}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 0, marginBottom: 16 }}>
        Objektivi inventari: 40→2, 41→2, 42→3, 43→3, 44→2, 45→2 palë.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {filtriList.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              marginBottom: 0,
              borderColor: zgjedhur === p.id ? 'var(--color-accent)' : 'var(--border-color)',
              boxShadow: zgjedhur === p.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: 36, marginBottom: 4 }} aria-hidden>
              👟
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{p.madhesia}</div>
              <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginBottom: 8 }}>
                {p.cmimi}€/lojë
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    background: `${GJENDJA_COLOR[p.gjendja]}22`,
                    color: GJENDJA_COLOR[p.gjendja],
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {GJENDJA_LABEL[p.gjendja] || p.gjendja}
                </span>
                <span className={`badge ${p.disponueshme ? 'badge-confirmed' : 'badge-canceled'}`}>
                  {p.disponueshme ? 'Lirë' : 'Zënë'}
                </span>
              </div>
              {p.rating_avg > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Mesatarja: ★ {p.rating_avg}</div>
              )}
              {p.disponueshme ? (
                <button
                  type="button"
                  className={`btn ${zgjedhur === p.id ? 'btn-ghost' : 'btn-accent'}`}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                  onClick={() => (zgjedhur === p.id ? setZgjedhur(null) : handleRezervim(p.id))}
                >
                  {zgjedhur === p.id ? 'Hiq' : 'Rezervo +2€'}
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" style={{ width: '100%' }} disabled>
                  E zënë
                </button>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Vlerëso (US #10)</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 16,
                        cursor: 'pointer',
                        color: (rating[p.id] || 0) >= star ? '#f39c12' : 'var(--border-color)',
                        padding: 0,
                      }}
                      onClick={() => handleRating(p.id, star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--color-info-light)', borderColor: 'var(--color-info)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-info)', margin: 0, lineHeight: 1.6 }}>
          <strong>Si funksionon:</strong> Zgjidh një palë për madhësinë tënde. Kostoja +2€ shtohet vetëm në pagesën tënde kur lidhet me një rezervim ndeshjeje.
        </p>
      </div>
    </div>
  );
}
