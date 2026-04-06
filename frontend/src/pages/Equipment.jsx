import { useState } from 'react';

const PATIKA = [
  { id: 1, madhesia: 40, cmimi: 2, disponueshme: true,  gjendja: 'good' },
  { id: 2, madhesia: 41, cmimi: 2, disponueshme: true,  gjendja: 'good' },
  { id: 3, madhesia: 42, cmimi: 2, disponueshme: false, gjendja: 'fair' },
  { id: 4, madhesia: 43, cmimi: 2, disponueshme: true,  gjendja: 'good' },
  { id: 5, madhesia: 44, cmimi: 2, disponueshme: true,  gjendja: 'poor' },
  { id: 6, madhesia: 45, cmimi: 2, disponueshme: true,  gjendja: 'good' },
  { id: 7, madhesia: 42, cmimi: 2, disponueshme: true,  gjendja: 'fair' },
  { id: 8, madhesia: 43, cmimi: 2, disponueshme: false, gjendja: 'good' },
];

const GJENDJA_LABEL = { good: 'Mirë', fair: 'Mesatare', poor: 'Keq' };
const GJENDJA_COLOR = { good: '#27ae60', fair: '#f39c12', poor: '#e74c3c' };

export default function Equipment() {
  const [zgjedhur, setZgjedhur] = useState(null);
  const [rating,   setRating]   = useState({});
  const [mesazhi,  setMesazhi]  = useState(null);
  const [filtri,   setFiltri]   = useState('all');

  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 3000);
  };

  const handleRezervim = (id) => {
    setZgjedhur(id);
    tregoBust(`Patika nr. ${PATIKA.find(p => p.id === id)?.madhesia} u rezervua! +2€ do shtohen në faturën tënde.`);
  };

  const handleRating = (id, stars) => {
    setRating(prev => ({ ...prev, [id]: stars }));
    tregoBust('Vlerësimi u ruajt. Faleminderit!');
  };

  const patikat = filtri === 'available'
    ? PATIKA.filter(p => p.disponueshme)
    : filtri === 'unavailable'
    ? PATIKA.filter(p => !p.disponueshme)
    : PATIKA;

  const disponueshme = PATIKA.filter(p => p.disponueshme).length;

  return (
    <div className="page">
      <div className="page-title">Pajisjet Ndihmëse</div>
      <div className="page-sub">Patika pa thuma me qira — +2€ për lojtar</div>

      {mesazhi && (
        <div className={`feedback feedback-${mesazhi.lloji === 'error' ? 'error' : 'success'}`}>
          {mesazhi.tekst}
        </div>
      )}

      {/* Statistika */}
      <div className="stat-grid-3">
        {[
          { label: 'Gjithsej Palë', vlera: PATIKA.length,                 ngjyra: '#1a1a2e' },
          { label: 'Disponueshme',  vlera: disponueshme,                   ngjyra: '#27ae60' },
          { label: 'Rezervuara',    vlera: PATIKA.length - disponueshme,   ngjyra: '#e74c3c' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16, borderLeft: `4px solid ${k.ngjyra}`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.ngjyra }}>{k.vlera}</div>
          </div>
        ))}
      </div>

      {/* Filtrim */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'Të gjitha'], ['available', 'Disponueshme'], ['unavailable', 'Rezervuara']].map(([v, l]) => (
          <button key={v} className={`btn ${filtri === v ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltri(v)}>{l}</button>
        ))}
      </div>

      {/* Grid i patikave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {patikat.map(p => (
          <div key={p.id} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${zgjedhur === p.id ? '#27ae60' : 'var(--border)'}`,
            borderRadius: 10, padding: 16, opacity: p.disponueshme ? 1 : 0.6,
            outline: zgjedhur === p.id ? '2px solid #27ae60' : 'none',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>👟</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nr. {p.madhesia}</div>
              <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 600, marginBottom: 8 }}>{p.cmimi}€/lojë</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: GJENDJA_COLOR[p.gjendja] + '22', color: GJENDJA_COLOR[p.gjendja], padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {GJENDJA_LABEL[p.gjendja]}
                </span>
                <span className={`badge ${p.disponueshme ? 'badge-confirmed' : 'badge-canceled'}`}>
                  {p.disponueshme ? 'Lirë' : 'Zënë'}
                </span>
              </div>

              {p.disponueshme && (
                <button
                  className={`btn ${zgjedhur === p.id ? 'btn-ghost' : 'btn-accent'}`}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                  onClick={() => zgjedhur === p.id ? setZgjedhur(null) : handleRezervim(p.id)}>
                  {zgjedhur === p.id ? 'Hiq' : 'Rezervo +2€'}
                </button>
              )}

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Vlerëso</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button"
                      style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: (rating[p.id] || 0) >= star ? '#f39c12' : 'var(--border)', padding: 0 }}
                      onClick={() => handleRating(p.id, star)}>★</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, background: '#e3f2fd', border: '1px solid #90caf9' }}>
        <div style={{ fontSize: 13, color: '#1565c0', lineHeight: 1.6 }}>
          <b>Si funksionon:</b> Rezervo patikën e dëshiruar (+2€). Kostoja shtohet vetëm te fatura jote personale — shokët që kanë patikat e tyre paguajnë vetëm pjesën e fushës.
        </div>
      </div>
    </div>
  );
}