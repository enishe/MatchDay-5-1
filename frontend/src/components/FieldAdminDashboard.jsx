import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SIZES = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const WEEKDAYS = [
  { value: 0, label: 'E Diel' },
  { value: 1, label: 'E Hënë' },
  { value: 2, label: 'E Martë' },
  { value: 3, label: 'E Mërkurë' },
  { value: 4, label: 'E Enjte' },
  { value: 5, label: 'E Premte' },
  { value: 6, label: 'E Shtunë' },
];

function blockTypeLabel(type) {
  if (type === 'hour') return 'Orë specifike';
  if (type === 'full_day') return 'Ditë e plotë';
  if (type === 'weekday') return 'Ditë e javës';
  return type;
}

function formatBlockedSlot(row) {
  if (row.block_type === 'hour') {
    const d = row.blocked_date ? String(row.blocked_date).slice(0, 10) : '—';
    const h = row.blocked_hour != null ? `${String(row.blocked_hour).padStart(2, '0')}:00` : '—';
    return `${d} · ${h}`;
  }
  if (row.block_type === 'full_day') {
    return row.blocked_date ? String(row.blocked_date).slice(0, 10) : '—';
  }
  if (row.block_type === 'weekday') {
    const w = WEEKDAYS.find((x) => x.value === Number(row.weekday));
    return w?.label || `Dita ${row.weekday}`;
  }
  return '—';
}

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
  const [activeBlockedFieldId, setActiveBlockedFieldId] = useState('');
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockForm, setBlockForm] = useState({
    block_type: 'hour',
    blocked_date: '',
    blocked_hour: 12,
    weekday: 1,
    reason: '',
  });
  const [blockSaving, setBlockSaving] = useState(false);

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

  const loadBlockedSlots = async (fieldId) => {
    if (!fieldId) {
      setBlockedSlots([]);
      return;
    }
    try {
      const rows = await apiFetch(`/fields/${fieldId}/blocked-slots`, { token });
      setBlockedSlots(Array.isArray(rows) ? rows : []);
    } catch (err) {
      notify(err.message || 'Gabim gjatë ngarkimit të orareve të bllokuara.', 'error');
    }
  };

  const handleAddBlockedSlot = async (e) => {
    e.preventDefault();
    if (!activeBlockedFieldId) return;
    const { block_type, blocked_date, blocked_hour, weekday, reason } = blockForm;
    if (block_type === 'hour' && (!blocked_date || blocked_hour == null)) {
      return notify('Ora dhe data janë të detyrueshme.', 'error');
    }
    if (block_type === 'full_day' && !blocked_date) {
      return notify('Data është e detyrueshme.', 'error');
    }
    try {
      setBlockSaving(true);
      const body = {
        block_type,
        reason: reason.trim() || null,
      };
      if (block_type === 'hour') {
        body.blocked_date = blocked_date;
        body.blocked_hour = Number(blocked_hour);
      } else if (block_type === 'full_day') {
        body.blocked_date = blocked_date;
      } else if (block_type === 'weekday') {
        body.weekday = Number(weekday);
      }
      await apiFetch(`/fields/${activeBlockedFieldId}/blocked-slots`, {
        token,
        method: 'POST',
        body,
      });
      notify('Orari u bllokua.');
      setBlockForm((p) => ({ ...p, reason: '' }));
      await loadBlockedSlots(activeBlockedFieldId);
    } catch (err) {
      notify(err.message || 'Gabim gjatë bllokimit.', 'error');
    } finally {
      setBlockSaving(false);
    }
  };

  const handleRemoveBlockedSlot = async (fieldId, slotId) => {
    if (!window.confirm('Të hiqet ky bllokim?')) return;
    try {
      await apiFetch(`/fields/${fieldId}/blocked-slots/${slotId}`, { token, method: 'DELETE' });
      notify('Bllokimi u hoq.');
      await loadBlockedSlots(fieldId);
    } catch (err) {
      notify(err.message || 'Gabim gjatë fshirjes.', 'error');
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

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Oraret e Bllokuara</h2>
        {fields.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Shtoni një fushë për të menaxhuar bllokimet.</p>}
        {fields.length > 0 && (
          <>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="label" htmlFor="blocked-field-select">Zgjidh fushën</label>
              <select
                id="blocked-field-select"
                className="input"
                value={activeBlockedFieldId}
                onChange={(e) => {
                  const next = e.target.value;
                  setActiveBlockedFieldId(next);
                  if (next) loadBlockedSlots(next);
                  else setBlockedSlots([]);
                }}
              >
                <option value="">— Zgjidh —</option>
                {fields.map((f) => (
                  <option key={`block-field-${f.id}`} value={String(f.id)}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            {activeBlockedFieldId && (
              <>
                <form onSubmit={handleAddBlockedSlot} className="admin-field-create-grid" style={{ marginBottom: 16 }}>
                  <select
                    className="input"
                    value={blockForm.block_type}
                    onChange={(e) => setBlockForm((p) => ({ ...p, block_type: e.target.value }))}
                  >
                    <option value="hour">Orë specifike</option>
                    <option value="full_day">Ditë e plotë</option>
                    <option value="weekday">Ditë e javës gjithmonë</option>
                  </select>
                  {blockForm.block_type === 'hour' && (
                    <>
                      <input
                        className="input"
                        type="date"
                        value={blockForm.blocked_date}
                        onChange={(e) => setBlockForm((p) => ({ ...p, blocked_date: e.target.value }))}
                      />
                      <select
                        className="input"
                        value={blockForm.blocked_hour}
                        onChange={(e) => setBlockForm((p) => ({ ...p, blocked_hour: Number(e.target.value) }))}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={parseInt(h.split(':')[0], 10)}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {blockForm.block_type === 'full_day' && (
                    <input
                      className="input"
                      type="date"
                      value={blockForm.blocked_date}
                      onChange={(e) => setBlockForm((p) => ({ ...p, blocked_date: e.target.value }))}
                    />
                  )}
                  {blockForm.block_type === 'weekday' && (
                    <select
                      className="input"
                      value={blockForm.weekday}
                      onChange={(e) => setBlockForm((p) => ({ ...p, weekday: Number(e.target.value) }))}
                    >
                      {WEEKDAYS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    className="input"
                    placeholder="Arsyeja (opsionale)"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm((p) => ({ ...p, reason: e.target.value }))}
                  />
                  <button type="submit" className="btn btn-accent" disabled={blockSaving}>
                    {blockSaving ? 'Duke ruajtur…' : 'Blloко'}
                  </button>
                </form>
                {blockedSlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nuk ka orare të bllokuara.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Lloji</th>
                          <th>Data / Ora</th>
                          <th>Arsyeja</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {blockedSlots.map((row) => (
                          <tr key={row.id}>
                            <td>{blockTypeLabel(row.block_type)}</td>
                            <td>{formatBlockedSlot(row)}</td>
                            <td>{row.reason || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ fontSize: 12, padding: '4px 10px' }}
                                onClick={() => handleRemoveBlockedSlot(activeBlockedFieldId, row.id)}
                              >
                                Hiq
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

    </>
  );
}
