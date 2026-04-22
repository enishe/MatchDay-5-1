import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Equipment() {
  const { token } = useAuth();
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
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Madhësia</th><th>Sasia</th><th>Çmimi i qirasë</th></tr></thead>
                <tbody>
                  {inventory.map((r) => (
                    <tr key={r.shoe_size}>
                      <td>{r.shoe_size}</td>
                      <td>{r.quantity_available}</td>
                      <td>{Number(r.rent_price).toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
