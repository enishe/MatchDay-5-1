import { useEffect, useState } from 'react';

// ─── Konstante ────────────────────────────────────────────────────────────────
const API = 'https://matchday-5-1.onrender.com/api';

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

const FORMA_BOSH = {
  fieldId:     '',
  organizerId: '1',
  startTime:   '',
  endTime:     '',
  totalPrice:  '60',
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [matches, setMatches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [forma, setForma]               = useState(FORMA_BOSH);
  const [duke_shtuar, setDukeShtur]     = useState(false);
  const [filtri, setFiltri]             = useState('');
  const [splitPreview, setSplitPreview] = useState(null);
  const [mesazhi, setMesazhi]           = useState(null);
  const [statistikat, setStatistikat]   = useState(null);

  // ─── SPRINT 2: Merr statistikat nga API (Service layer) ──────────────────
  // Logjika e llogaritjes është në MatchService.llogaritStatistikat()
  // UI thjesht shfaq rezultatin — respekton Separation of Concerns
  const fetchStatistikat = async () => {
    try {
      const res  = await fetch(`${API}/matches/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStatistikat(data);
    } catch (err) {
      // Statistikat janë opsionale — nëse dështojnë, lista vazhdon normalisht
      console.error('Statistikat nuk u ngarkuan:', err.message);
    }
  };

  // ─── READ: Merr ndeshjet ──────────────────────────────────────────────────
  const fetchMatches = async (statusFilter = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `${API}/matches?status=${statusFilter}`
        : `${API}/matches`;
      const res = await fetch(url);

      // Error Handling 1: serveri kthen status gabim
      if (!res.ok) throw new Error(`Serveri ktheu gabim: ${res.status}`);

      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setMatches(lista);

      // Pas çdo ndryshimi të listës, rifresko statistikat nga API
      await fetchStatistikat();
    } catch (err) {
      // Error Handling 2: lidhja me serverin dështoi
      if (err.message.includes('fetch') || err.message.includes('Failed')) {
        setError('Nuk mund të lidhet me serverin. Kontrollo që backend-i është aktiv në port 5000.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  // ─── Smart Split Preview ──────────────────────────────────────────────────
  useEffect(() => {
    const cmimi = parseFloat(forma.totalPrice);
    // Error Handling 3: input i gabuar për çmim (NaN)
    if (isNaN(cmimi) || cmimi <= 0) {
      setSplitPreview(null);
    } else {
      setSplitPreview((cmimi / 12).toFixed(2));
    }
  }, [forma.totalPrice]);

  // ─── Mesazh kalimtar ──────────────────────────────────────────────────────
  const tregoBust = (tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  };

  const handleForma = (e) => {
    setForma(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ─── CREATE ───────────────────────────────────────────────────────────────
  const handleShto = async (e) => {
    e.preventDefault();

    // Error Handling: validim në UI para çdo dërgimi
    const cmimi = parseFloat(forma.totalPrice);
    if (!forma.fieldId || parseInt(forma.fieldId) <= 0)
      return tregoBust('Ju lutem shkruani një ID fusha të vlefshme.', 'gabim');
    if (isNaN(cmimi) || cmimi <= 0)
      return tregoBust('Ju lutem shkruani një çmim valid (numër mbi 0€).', 'gabim');
    if (!forma.startTime)
      return tregoBust('Ju lutem zgjidhni kohën e fillimit.', 'gabim');
    if (!forma.endTime)
      return tregoBust('Ju lutem zgjidhni kohën e mbarimit.', 'gabim');
    if (new Date(forma.endTime) <= new Date(forma.startTime))
      return tregoBust('Koha e mbarimit duhet të jetë pas kohës së fillimit.', 'gabim');

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
          totalPrice:  cmimi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gabim gjatë shtimit.');
      tregoBust(`Ndeshja u shtua! Smart Split: ${data.price_per_player}€/lojtar.`);
      setForma(FORMA_BOSH);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    } finally {
      setDukeShtur(false);
    }
  };

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  const handleUpdate = async (id, statusAktual) => {
    const statusiRi = STATUSI_TJETER[statusAktual];
    try {
      const res = await fetch(`${API}/matches/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusiRi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gabim gjatë përditësimit.');
      if (data.cancellationNote) tregoBust(data.cancellationNote, 'kujdes');
      else tregoBust(`Statusi → "${STATUSET[statusiRi].label}"`);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    }
  };

  // ─── DELETE ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm(`A jeni i sigurt që dëshironi ta fshini rezervimin #${id}?`)) return;
    try {
      const res  = await fetch(`${API}/matches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gabim gjatë fshirjes.');
      tregoBust(`Rezervimi #${id} u fshi me sukses.`);
      fetchMatches(filtri);
    } catch (err) {
      tregoBust(err.message, 'gabim');
    }
  };

  // ─── FILTRO ───────────────────────────────────────────────────────────────
  const handleFiltri = (e) => {
    setFiltri(e.target.value);
    fetchMatches(e.target.value);
  };

  // ─── Stilet ───────────────────────────────────────────────────────────────
  const s = {
    faqja:  { fontFamily: 'system-ui, sans-serif', maxWidth: 980, margin: '0 auto', padding: '24px 16px', background: '#f5f6fa', minHeight: '100vh' },
    karta:  { border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, marginBottom: 20, background: '#fff' },
    titulli: { fontSize: 22, fontWeight: 700, marginBottom: 2, color: '#1a1a2e' },
    sub:    { color: '#888', fontSize: 13, marginBottom: 24 },
    kartaT: { fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#1a1a2e' },
    et:     { display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 },
    inp:    { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d0d0', fontSize: 13, boxSizing: 'border-box' },
    grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    btn:    { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
    tabela: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th:     { background: '#1a1a2e', color: '#fff', padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 12 },
    td:     { padding: '9px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
    bust: (l) => ({
      padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
      background: l === 'gabim' ? '#fdecea' : l === 'kujdes' ? '#fff8e1' : '#e8f5e9',
      color:      l === 'gabim' ? '#c62828' : l === 'kujdes' ? '#f57f17' : '#2e7d32',
      border: `1px solid ${l === 'gabim' ? '#ef9a9a' : l === 'kujdes' ? '#ffe082' : '#a5d6a7'}`,
    }),
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={s.faqja}>

      <h1 style={s.titulli}>MatchDay 5+1</h1>
      <p style={s.sub}>Platforma për menaxhimin e ndeshjeve — Smart Split aktiv</p>

      {mesazhi && <div style={s.bust(mesazhi.lloji)}>{mesazhi.tekst}</div>}

      {/* ── STATISTIKAT — Sprint 2 Feature ── */}
      {/* Të dhënat vijnë nga GET /api/matches/stats → MatchService.llogaritStatistikat() */}
      {statistikat && !loading && !error && (
        <div style={s.karta}>
          <div style={s.kartaT}>Statistikat e Ndeshjeve</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'Gjithsej Ndeshje', vlera: statistikat.total,         ngjyra: '#1a1a2e', sfx: '' },
              { label: 'Totali i Çmimeve', vlera: statistikat.totali_cmimit, ngjyra: '#1565c0', sfx: '€' },
              { label: 'Çmimi Mesatar',    vlera: statistikat.mesatare,      ngjyra: '#2e7d32', sfx: '€' },
              { label: 'Max / Min',        vlera: `${statistikat.max}€ / ${statistikat.min}€`, ngjyra: '#6a1b9a', sfx: '' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', borderLeft: `4px solid ${k.ngjyra}` }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.ngjyra }}>{k.vlera}{k.sfx}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Në Pritje',   vlera: statistikat.pending,   ngjyra: '#f39c12' },
              { label: 'Konfirmuara', vlera: statistikat.confirmed,  ngjyra: '#27ae60' },
              { label: 'Anuluara',    vlera: statistikat.canceled,   ngjyra: '#e74c3c' },
            ].map((st, i) => (
              <div key={i} style={{ background: st.ngjyra + '14', border: `1px solid ${st.ngjyra}44`, borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: st.ngjyra, fontWeight: 600 }}>{st.label}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: st.ngjyra }}>{st.vlera}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORMA CREATE ── */}
      <div style={s.karta}>
        <div style={s.kartaT}>Shto Ndeshje të Re</div>
        <form onSubmit={handleShto}>
          <div style={s.grid2}>
            <div>
              <label style={s.et}>ID e Fushës *</label>
              <input style={s.inp} type="number" name="fieldId"
                value={forma.fieldId} onChange={handleForma} placeholder="p.sh. 1" min="1" />
            </div>
            <div>
              <label style={s.et}>Çmimi Total (€) *</label>
              <input style={s.inp} type="number" name="totalPrice"
                value={forma.totalPrice} onChange={handleForma} placeholder="60" min="1" step="0.01" />
            </div>
            <div>
              <label style={s.et}>Koha e Fillimit *</label>
              <input style={s.inp} type="datetime-local" name="startTime"
                value={forma.startTime} onChange={handleForma} />
            </div>
            <div>
              <label style={s.et}>Koha e Mbarimit *</label>
              <input style={s.inp} type="datetime-local" name="endTime"
                value={forma.endTime} onChange={handleForma} />
            </div>
          </div>

          {splitPreview && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#2e7d32' }}>
              Smart Split: {forma.totalPrice}€ ÷ 12 lojtarë = <strong>{splitPreview}€ për lojtar</strong>
            </div>
          )}

          <button type="submit" disabled={duke_shtuar}
            style={{ ...s.btn, background: '#1a1a2e', color: '#fff', opacity: duke_shtuar ? 0.7 : 1 }}>
            {duke_shtuar ? 'Duke shtuar...' : '+ Shto Ndeshjen'}
          </button>
        </form>
      </div>

      {/* ── LISTA + FILTRIM ── */}
      <div style={s.karta}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={s.kartaT}>Lista e Ndeshjeve</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...s.et, marginBottom: 0 }}>Filtro:</label>
            <select style={{ ...s.inp, width: 'auto' }} value={filtri} onChange={handleFiltri}>
              <option value="">Të gjitha</option>
              <option value="pending">Në Pritje</option>
              <option value="confirmed">Konfirmuara</option>
              <option value="canceled">Anuluara</option>
            </select>
          </div>
        </div>

        {loading && <p style={{ color: '#888', fontSize: 13 }}>Duke ngarkuar ndeshjet...</p>}

        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #ef9a9a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#c62828', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{error}</span>
            <button onClick={() => fetchMatches(filtri)}
              style={{ ...s.btn, background: '#c62828', color: '#fff', padding: '5px 12px', fontSize: 12, flexShrink: 0 }}>
              Provo Përsëri
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <p style={{ color: '#999', fontSize: 13 }}>Nuk ka ndeshje për këtë filtër.</p>
        )}

        {!loading && !error && matches.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.tabela}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Fusha</th>
                  <th style={s.th}>Fillimi</th>
                  <th style={s.th}>Çmimi</th>
                  <th style={s.th}>Smart Split</th>
                  <th style={s.th}>Statusi</th>
                  <th style={s.th}>Veprimet</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(match => (
                  <tr key={match.id} style={{ background: match.status === 'canceled' ? '#fff8f8' : '#fff' }}>
                    <td style={s.td}>#{match.id}</td>
                    <td style={s.td}>Fusha #{match.field_id}</td>
                    <td style={s.td}>{new Date(match.start_time).toLocaleString('sq-AL')}</td>
                    <td style={s.td}>{match.total_price}€</td>
                    <td style={s.td}>
                      <strong style={{ color: '#2e7d32' }}>{match.price_per_player}€</strong>
                      <span style={{ color: '#bbb', fontSize: 11 }}>/lojtar</span>
                    </td>
                    <td style={s.td}>
                      <span style={{
                        background: (STATUSET[match.status]?.ngjyra || '#888') + '22',
                        color: STATUSET[match.status]?.ngjyra || '#888',
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>
                        {STATUSET[match.status]?.label || match.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      {match.status !== 'canceled' && (
                        <button onClick={() => handleUpdate(match.id, match.status)}
                          style={{ ...s.btn, background: '#e3f2fd', color: '#1565c0', marginRight: 6 }}>
                          Ndrysho
                        </button>
                      )}
                      <button onClick={() => handleDelete(match.id)}
                        style={{ ...s.btn, background: '#fdecea', color: '#c62828' }}>
                        Fshi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;