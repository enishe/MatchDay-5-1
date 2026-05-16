import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

function terrainLabel(value) {
  if (value === 'artificial_grass') return 'Bar Artificial';
  if (value === 'indoor_hall') return 'Sallë e mbyllur';
  if (value === 'futsal') return 'Futsal';
  return value || '—';
}

const emptyForm = {
  name: '',
  location: '',
  terrain_type: 'artificial_grass',
  price_per_hour: '',
  courts_count: '1',
  is_active: true,
};

export default function FieldAdminDashboard({ fields, onRefresh, onMessage }) {
  const { token } = useAuth();
  const [showCreateField, setShowCreateField] = useState(false);
  const [fieldForm, setFieldForm] = useState(emptyForm);
  const [editingField, setEditingField] = useState(null);
  const [shoesDraft, setShoesDraft] = useState({});
  const [activeShoesFieldId, setActiveShoesFieldId] = useState('');
  const [shoesSavingFieldId, setShoesSavingFieldId] = useState(null);

  const notify = (text, type = 'sukses') => onMessage?.(text, type);

  const handleCreateField = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!fieldForm.name.trim()) errors.push('Emri i fushës është i detyrueshëm.');
    if (!fieldForm.location.trim()) errors.push('Lokacioni është i detyrueshëm.');
    if (!fieldForm.price_per_hour || Number(fieldForm.price_per_hour) <= 0) errors.push('Çmimi duhet të jetë pozitiv.');
    if (!fieldForm.courts_count || Number(fieldForm.courts_count) <= 0) errors.push('Numri i fushave duhet të jetë pozitiv.');
    if (errors.length) return notify(errors.join(' '), 'error');
    try {
      await apiFetch('/fields', {
        token,
        method: 'POST',
        body: {
          name: fieldForm.name.trim(),
          location: fieldForm.location.trim(),
          terrain_type: fieldForm.terrain_type,
          price_per_hour: Number(fieldForm.price_per_hour),
          courts_count: Number(fieldForm.courts_count),
        },
      });
      setFieldForm(emptyForm);
      setShowCreateField(false);
      notify('Fusha u krijua.');
      onRefresh?.();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleUpdateField = async (f) => {
    try {
      await apiFetch(`/fields/${f.id}`, {
        token,
        method: 'PUT',
        body: {
          name: String(f.name || '').trim(),
          location: String(f.location || '').trim(),
          terrain_type: f.terrain_type,
          price_per_hour: Number(f.price_per_hour),
          courts_count: Number(f.courts_count),
          is_active: Boolean(f.is_active),
        },
      });
      setEditingField(null);
      notify('Fusha u përditësua.');
      onRefresh?.();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteField = async (id, fieldName) => {
    const ok = window.confirm(
      `Fshirja e "${fieldName || 'fushës'}" do të heqë përgjithmonë fushën dhe të gjitha rezervimet. A jeni i sigurt?`
    );
    if (!ok) return;
    try {
      await apiFetch(`/fields/${id}`, { token, method: 'DELETE' });
      if (String(editingField?.id) === String(id)) setEditingField(null);
      if (String(activeShoesFieldId) === String(id)) setActiveShoesFieldId('');
      notify('Fusha u fshi përgjithmonë.');
      onRefresh?.();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const loadShoesForField = async (fieldId) => {
    if (!fieldId) return;
    try {
      const rows = await apiFetch(`/fields/${fieldId}/shoes`, { token });
      const inv = Array.isArray(rows) ? rows : [];
      const draft = {};
      SIZES.forEach((size) => {
        const row = inv.find((r) => Number(r.shoe_size) === size);
        draft[size] = {
          quantity_available: Number(row?.quantity_available ?? 0),
          rent_price: Number(row?.rent_price ?? 2),
        };
      });
      setShoesDraft((prev) => ({ ...prev, [fieldId]: draft }));
    } catch (err) {
      notify(err.message || 'Gabim gjatë ngarkimit të inventarit.', 'error');
    }
  };

  const handleSaveFieldShoes = async (fieldId) => {
    const draft = shoesDraft[fieldId];
    if (!draft) return;
    try {
      setShoesSavingFieldId(String(fieldId));
      const payload = SIZES.map((size) => ({
        shoe_size: size,
        quantity_available: Number(draft[size]?.quantity_available ?? 0),
        rent_price: Number(draft[size]?.rent_price ?? 2),
      }));
      await apiFetch(`/fields/${fieldId}/shoes`, { token, method: 'PUT', body: payload });
      const selectedField = fields.find((f) => String(f.id) === String(fieldId));
      notify(`Inventari u ruajt për ${selectedField?.name || 'fushën'}`);
      await loadShoesForField(fieldId);
    } catch {
      notify('Gabim gjatë ruajtjes. Provo përsëri.', 'error');
    } finally {
      setShoesSavingFieldId(null);
    }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>Fushat e Mia</h2>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => {
              setFieldForm(emptyForm);
              setShowCreateField((v) => !v);
              setEditingField(null);
            }}
          >
            {showCreateField ? 'Mbyll formën' : 'Shto Fushë të Re'}
          </button>
        </div>

        {showCreateField && (
          <form onSubmit={handleCreateField} className="admin-field-create-grid" style={{ marginBottom: 20 }}>
            <input className="input" placeholder="Emri i fushës *" required value={fieldForm.name} onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="Lokacioni *" required value={fieldForm.location} onChange={(e) => setFieldForm((p) => ({ ...p, location: e.target.value }))} />
            <select className="input" value={fieldForm.terrain_type} onChange={(e) => setFieldForm((p) => ({ ...p, terrain_type: e.target.value }))}>
              <option value="artificial_grass">Bar Artificial</option>
              <option value="indoor_hall">Sallë e mbyllur</option>
              <option value="futsal">Futsal</option>
            </select>
            <input className="input" type="number" step="0.01" min="0" placeholder="Çmimi për orë (€) *" required value={fieldForm.price_per_hour} onChange={(e) => setFieldForm((p) => ({ ...p, price_per_hour: e.target.value }))} />
            <input className="input" type="number" min="1" max="10" placeholder="Nr. fushave/korteve *" required value={fieldForm.courts_count} onChange={(e) => setFieldForm((p) => ({ ...p, courts_count: e.target.value }))} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={fieldForm.is_active} onChange={(e) => setFieldForm((p) => ({ ...p, is_active: e.target.checked }))} />
              Aktive
            </label>
            <button type="submit" className="btn btn-accent">Krijo fushën</button>
          </form>
        )}

        {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nuk keni fusha të regjistruara.</p>}
        {fields.map((f) => (
          <div key={f.id} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 16 }}>
            {editingField?.id === f.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateField(editingField);
                }}
                className="admin-field-create-grid"
              >
                <input className="input" value={editingField.name} onChange={(e) => setEditingField((p) => ({ ...p, name: e.target.value }))} />
                <input className="input" value={editingField.location} onChange={(e) => setEditingField((p) => ({ ...p, location: e.target.value }))} />
                <select className="input" value={editingField.terrain_type} onChange={(e) => setEditingField((p) => ({ ...p, terrain_type: e.target.value }))}>
                  <option value="artificial_grass">Bar Artificial</option>
                  <option value="indoor_hall">Sallë e mbyllur</option>
                  <option value="futsal">Futsal</option>
                </select>
                <input className="input" type="number" step="0.01" value={editingField.price_per_hour} onChange={(e) => setEditingField((p) => ({ ...p, price_per_hour: e.target.value }))} />
                <input className="input" type="number" min="1" max="10" value={editingField.courts_count} onChange={(e) => setEditingField((p) => ({ ...p, courts_count: e.target.value }))} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(editingField.is_active)} onChange={(e) => setEditingField((p) => ({ ...p, is_active: e.target.checked }))} />
                  Aktive
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-accent">Ruaj</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingField(null)}>Anulo</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{f.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                    {f.location} · {terrainLabel(f.terrain_type)} · {Number(f.price_per_hour || 0).toFixed(2)}€/orë · {f.courts_count || 1} fusha
                  </div>
                  <span className={`badge ${f.is_active ? 'badge-confirmed' : 'badge-canceled'}`} style={{ marginTop: 8 }}>
                    {f.is_active ? 'Aktive' : 'Joaktive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditingField({ ...f }); setShowCreateField(false); }}>Edito</button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDeleteField(f.id, f.name)}>Fshi</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Paisjet (Patika)</h2>
        {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Shtoni një fushë për të menaxhuar inventarin.</p>}
        {fields.map((f) => (
          <div key={`shoes-${f.id}`} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <strong>{f.name}</strong>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const next = String(activeShoesFieldId) === String(f.id) ? '' : String(f.id);
                  setActiveShoesFieldId(next);
                  if (next) loadShoesForField(f.id);
                }}
              >
                {String(activeShoesFieldId) === String(f.id) ? 'Mbyll' : 'Menaxho patikat'}
              </button>
            </div>
            {String(activeShoesFieldId) === String(f.id) && shoesDraft[f.id] && (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Numri</th>
                        <th>Sasia në dispozicion</th>
                        <th>Çmimi me qira (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SIZES.map((size) => (
                        <tr key={`fa-shoe-${f.id}-${size}`}>
                          <td>{size}</td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              value={shoesDraft[f.id][size]?.quantity_available ?? 0}
                              onChange={(e) =>
                                setShoesDraft((prev) => ({
                                  ...prev,
                                  [f.id]: {
                                    ...prev[f.id],
                                    [size]: {
                                      ...prev[f.id][size],
                                      quantity_available: Math.max(0, Number(e.target.value || 0)),
                                    },
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={shoesDraft[f.id][size]?.rent_price ?? 2}
                              onChange={(e) =>
                                setShoesDraft((prev) => ({
                                  ...prev,
                                  [f.id]: {
                                    ...prev[f.id],
                                    [size]: {
                                      ...prev[f.id][size],
                                      rent_price: Math.max(0, Number(e.target.value || 0)),
                                    },
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="btn btn-accent"
                  style={{ marginTop: 12 }}
                  disabled={shoesSavingFieldId === String(f.id)}
                  onClick={() => handleSaveFieldShoes(f.id)}
                >
                  {shoesSavingFieldId === String(f.id) ? 'Duke ruajtur…' : 'Ruaj'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

    </>
  );
}
