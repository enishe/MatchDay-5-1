import { useEffect, useState } from 'react';

// ─── Konstante ────────────────────────────────────────────────────────────────
const API = 'http://localhost:5000/api';

const STATUSET = {
  pending:   { label: 'PRITJE',     ngjyra: '#f39c12' },
  confirmed: { label: 'KONFIRMUAR', ngjyra: '#27ae60' },
  canceled:  { label: 'ANULUAR',    ngjyra: '#e74c3c' },
};

const STATUSI_TJETER = {
  pending:   'confirmed',
  confirmed: 'canceled',
  canceled:  'pending',
};

// ─── Vlerat fillestare të formës ──────────────────────────────────────────────
const FORMA_BOSH = {
  fieldId:     '',
  organizerId: '1',
  startTime:   '',
  endTime:     '',
  totalPrice:  '60',
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [matches, setMatches]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [forma, setForma]           = useState(FORMA_BOSH);
  const [duke_shtuar, setDukeShtur] = useState(false);
  const [filtri, setFiltri]         = useState('');
  const [splitPreview, setSplitPreview] = useState(null);
  const [mesazhi, setMesazhi]       = useState(null); // sukses/gabim feedback

  // ─── Lexo ndeshjet (READ) ─────────────────────────────────────────────────
  const fetchMatches = async (statusFilter = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `${API}/matches?status=${statusFilter}`
        : `${API}/matches`;
      const res  = await fetch(url);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Nuk mund të lidhet me serverin. Kontrollo që backend-i është aktiv.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  // ─── Smart Split Preview ──────────────────────────────────────────────────
  useEffect(() => {
    const cmimi = parseFloat(forma.totalPrice);
    if (cmimi > 0) {
      setSplitPreview((cmimi / 12).toFixed(2));
    } else {
      setSplitPreview(null);
    }
  }, [forma.totalPrice]);

  // ─── Shfaq mesazh kalimtar ────────────────────────────────────────────────
  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 3000);
  };

  // ─── Ndrysho input të formës ──────────────────────────────────────────────
  const handleForma = (e) => {
    setForma(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ─── CREATE: Shto ndeshje ─────────────────────────────────────────────────
  const handleShto = async (e) => {
    e.preventDefault();
    setDukeShtur(true);
    try {
      const res = await fetch(`${API}/matches`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId:     parseInt(forma.fieldId),
          organizerId: parseInt(forma.organizerId),
          startTime:   forma.startTime,
          endTime:     forma.endTime,
          totalPrice:  parseFloat(forma.totalPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      tregoBust(`Ndeshja u shtua! Çmimi për lojtar: ${data.price_per_player}€ (Smart Split)`);
      setForma(FORMA_BOSH);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    } finally {
      setDukeShtur(false);
    }
  };

  // ─── UPDATE: Ndrysho statusin ─────────────────────────────────────────────
  const handleUpdate = async (id, statusAktual) => {
    const statusiRi = STATUSI_TJETER[statusAktual];
    try {
      const res = await fetch(`${API}/matches/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusiRi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.cancellationNote) tregoBust(data.cancellationNote, 'kujdes');
      else tregoBust(`Statusi u ndryshua në "${STATUSET[statusiRi].label}"`);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    }
  };

  // ─── DELETE: Fshi ndeshjen ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm(`A jeni i sigurt që dëshironi ta fshini rezervimin #${id}?`)) return;
    try {
      const res = await fetch(`${API}/matches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      tregoBust(`Rezervimi #${id} u fshi me sukses.`);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    }
  };

  // ─── Filtro ───────────────────────────────────────────────────────────────
  const handleFiltri = (e) => {
    setFiltri(e.target.value);
    fetchMatches(e.target.value);
  };

  // ─── Stilet inline (pa CSS të jashtëm) ───────────────────────────────────
  const stil = {
    faqja:    { fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: '24px 16px' },
    titulli:  { fontSize: 24, fontWeight: 600, marginBottom: 4 },
    nentitulli: { color: '#666', fontSize: 14, marginBottom: 24 },
    karta:    { border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, marginBottom: 20, background: '#fff' },
    kartaTitulli: { fontSize: 16, fontWeight: 600, marginBottom: 14, color: '#222' },
    etiketa:  { display: 'block', fontSize: 13, color: '#555', marginBottom: 4, fontWeight: 500 },
    input:    { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' },
    grid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    btn:      { padding: '9px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
    tabela:   { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
    th:       { background: '#1a1a2e', color: '#fff', padding: '10px 12px', textAlign: 'left', fontWeight: 500 },
    td:       { padding: '10px 12px', borderBottom: '1px solid #f0f0f0' },
    mesazhi:  (lloji) => ({
      padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
      background: lloji === 'gabim' ? '#fdecea' : lloji === 'kujdes' ? '#fff8e1' : '#e8f5e9',
      color:      lloji === 'gabim' ? '#c62828' : lloji === 'kujdes' ? '#f57f17' : '#2e7d32',
      border:     `1px solid ${lloji === 'gabim' ? '#ef9a9a' : lloji === 'kujdes' ? '#ffe082' : '#a5d6a7'}`,
    }),
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={stil.faqja}>

      {/* Header */}
      <h1 style={stil.titulli}>MatchDay 5+1</h1>
      <p style={stil.nentitulli}>Platforma për menaxhimin e ndeshjeve të futbollit — Smart Split aktiv</p>

      {/* Mesazhi i feedback-ut */}
      {mesazhi && (
        <div style={stil.mesazhi(mesazhi.lloji)}>{mesazhi.tekst}</div>
      )}

      {/* ── Forma e Krijimit (Ushtrimi 3: CREATE) ── */}
      <div style={stil.karta}>
        <div style={stil.kartaTitulli}>Shto Ndeshje të Re</div>
        <form onSubmit={handleShto}>
          <div style={stil.grid}>
            <div>
              <label style={stil.etiketa}>ID e Fushës *</label>
              <input style={stil.input} type="number" name="fieldId"
                value={forma.fieldId} onChange={handleForma}
                placeholder="p.sh. 1" required min="1" />
            </div>
            <div>
              <label style={stil.etiketa}>Çmimi Total (€) *</label>
              <input style={stil.input} type="number" name="totalPrice"
                value={forma.totalPrice} onChange={handleForma}
                placeholder="60" required min="1" step="0.01" />
            </div>
            <div>
              <label style={stil.etiketa}>Koha e Fillimit *</label>
              <input style={stil.input} type="datetime-local" name="startTime"
                value={forma.startTime} onChange={handleForma} required />
            </div>
            <div>
              <label style={stil.etiketa}>Koha e Mbarimit *</label>
              <input style={stil.input} type="datetime-local" name="endTime"
                value={forma.endTime} onChange={handleForma} required />
            </div>
          </div>

          {/* Smart Split Preview — US #2 */}
          {splitPreview && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#2e7d32' }}>
              Smart Split: {forma.totalPrice}€ / 12 lojtarë = <strong>{splitPreview}€ për lojtar</strong>
            </div>
          )}

          <button type="submit" disabled={duke_shtuar}
            style={{ ...stil.btn, background: '#1a1a2e', color: '#fff', opacity: duke_shtuar ? 0.7 : 1 }}>
            {duke_shtuar ? 'Duke shtuar...' : '+ Shto Ndeshjen'}
          </button>
        </form>
      </div>

      {/* ── Lista e Ndeshjeve (Ushtrimi 3: READ + Filter) ── */}
      <div style={stil.karta}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={stil.kartaTitulli}>Lista e Ndeshjeve</div>
          <div>
            <label style={{ ...stil.etiketa, display: 'inline', marginRight: 8 }}>Filtro sipas statusit:</label>
            <select style={{ ...stil.input, width: 'auto' }} value={filtri} onChange={handleFiltri}>
              <option value="">Të gjitha</option>
              <option value="pending">Pritje</option>
              <option value="confirmed">Konfirmuara</option>
              <option value="canceled">Anuluara</option>
            </select>
          </div>
        </div>

        {loading && <p style={{ color: '#666', fontSize: 14 }}>Duke ngarkuar ndeshjet...</p>}
        {error   && <p style={{ color: '#c62828', fontSize: 14 }}>{error}</p>}

        {!loading && !error && (
          matches.length === 0
            ? <p style={{ color: '#999', fontSize: 14 }}>Nuk ka ndeshje për këtë filtër.</p>
            : (
              <table style={stil.tabela}>
                <thead>
                  <tr>
                    <th style={stil.th}>ID</th>
                    <th style={stil.th}>Fusha</th>
                    <th style={stil.th}>Fillimi</th>
                    <th style={stil.th}>Çmimi</th>
                    <th style={stil.th}>Smart Split</th>
                    <th style={stil.th}>Statusi</th>
                    <th style={stil.th}>Veprimet</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => (
                    <tr key={match.id} style={{ background: match.status === 'canceled' ? '#fff8f8' : '#fff' }}>
                      <td style={stil.td}>#{match.id}</td>
                      <td style={stil.td}>Fusha #{match.field_id}</td>
                      <td style={stil.td}>{new Date(match.start_time).toLocaleString('sq-AL')}</td>
                      <td style={stil.td}>{match.total_price}€</td>
                      <td style={stil.td}>
                        <strong style={{ color: '#2e7d32' }}>{match.price_per_player}€</strong>
                        <span style={{ color: '#999', fontSize: 12 }}>/lojtar</span>
                      </td>
                      <td style={stil.td}>
                        <span style={{
                          background: STATUSET[match.status]?.ngjyra + '22',
                          color: STATUSET[match.status]?.ngjyra,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                        }}>
                          {STATUSET[match.status]?.label || match.status}
                        </span>
                      </td>
                      <td style={stil.td}>
                        {/* Update — Bonus */}
                        {match.status !== 'canceled' && (
                          <button
                            onClick={() => handleUpdate(match.id, match.status)}
                            style={{ ...stil.btn, background: '#e3f2fd', color: '#1565c0', marginRight: 6 }}>
                            Ndrysho
                          </button>
                        )}
                        {/* Delete — Bonus */}
                        <button
                          onClick={() => handleDelete(match.id)}
                          style={{ ...stil.btn, background: '#fdecea', color: '#c62828' }}>
                          Fshi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}
      </div>

    </div>
  );
}

export default App;