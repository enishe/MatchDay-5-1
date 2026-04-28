import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Equipment() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    setLoading(true);
    apiFetch('/fields')
      .then((f) => {
        const list = Array.isArray(f) ? f.filter((x) => x.is_active) : [];
        setFields(list);
        if (list[0]) setSelectedFieldId(String(list[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedFieldId) return;
    setLoading(true);
    apiFetch(`/fields/${selectedFieldId}`)
      .then((r) => setInventory(Array.isArray(r.shoes_inventory) ? r.shoes_inventory : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedFieldId]);

  const selectedField = useMemo(() => fields.find((f) => String(f.id) === String(selectedFieldId)), [fields, selectedFieldId]);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="skeleton" style={{ height: 44, marginBottom: 12 }} />
          <div className="shoes-grid">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="skeleton" style={{ height: 150 }} />
            ))}
          </div>
        </div>
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
      <h1 className="page-title">Pajisjet</h1>
      <p className="page-subtitle">Zgjidh lokacionin dhe shiko inventarin vetëm për atë fushë.</p>
      <div className="card">
        <label className="label">Lokacioni i fushës</label>
        <select className="input" value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
          <option value="">— Zgjidh fushën —</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.location}</option>)}
        </select>
      </div>
      {!selectedFieldId && <p style={{ color: 'var(--text-muted)' }}>Zgjidh një fushë për të parë inventarin.</p>}
      {selectedFieldId && (
        <div className="card">
          <h3 className="card-title">{selectedField?.name || 'Inventari'} — {selectedField?.location}</h3>
          {inventory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nuk ka inventar të regjistruar për këtë fushë.</p>
          ) : (
            <div className="shoes-grid">
              {inventory.map((r) => (
                <div key={r.shoe_size} className="shoe-card">
                  <span className="shoe-label">Madhësia</span>
                  <div className="shoe-value">{r.shoe_size}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
                    <div>
                      <span className="shoe-label">Sasia</span>
                      <div className="shoe-value" style={{ fontSize: '0.95rem' }}>
                        {r.quantity_available}
                      </div>
                    </div>
                    <div>
                      <span className="shoe-label">Çmimi</span>
                      <div className="shoe-value" style={{ fontSize: '0.95rem' }}>
                        {Number(r.rent_price).toFixed(2)}€
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-accent"
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={() => navigate(`/booking?fieldId=${selectedFieldId}&shoeRental=1`)}
                  >
                    Rezervo (+2€)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
