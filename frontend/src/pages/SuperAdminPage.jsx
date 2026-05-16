import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function terrainLabel(value) {
  if (value === 'artificial_grass') return 'Bar Artificial';
  if (value === 'indoor_hall') return 'Sallë Futsali';
  return value || '—';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('sq-AL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function SuperAdminPage() {
  const { token } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [fields, setFields] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingFields, setLoadingFields] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    fieldIds: [],
  });

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const rows = await apiFetch('/superadmin/admins', { token });
      setAdmins(Array.isArray(rows) ? rows : []);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, [token]);

  const loadFields = useCallback(async () => {
    setLoadingFields(true);
    try {
      const rows = await apiFetch('/fields', { token });
      setFields(Array.isArray(rows) ? rows : []);
    } catch {
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  }, [token]);

  useEffect(() => {
    loadAdmins();
    loadFields();
  }, [loadAdmins, loadFields]);

  const fieldsByLocation = useMemo(() => {
    const grouped = {};
    for (const field of fields) {
      const loc = field.location || 'Pa lokacion';
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(field);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'sq'));
  }, [fields]);

  const toggleField = (fieldId) => {
    setForm((prev) => {
      const ids = new Set(prev.fieldIds);
      if (ids.has(fieldId)) ids.delete(fieldId);
      else ids.add(fieldId);
      return { ...prev, fieldIds: [...ids] };
    });
  };

  const onDeleteAdmin = async (admin) => {
    if (!window.confirm(`Të largohet admin-i "${admin.name}"?`)) return;
    setFeedback(null);
    try {
      await apiFetch(`/superadmin/admins/${admin.id}`, { token, method: 'DELETE' });
      setFeedback({ type: 'success', text: 'Admin-i u largua me sukses.' });
      await loadAdmins();
      await loadFields();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Fshirja dështoi.' });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFeedback({ type: 'error', text: 'Plotësoni të gjitha fushat e detyrueshme.' });
      return;
    }
    if (form.password.length < 8) {
      setFeedback({ type: 'error', text: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.' });
      return;
    }
    if (form.fieldIds.length === 0) {
      setFeedback({ type: 'error', text: 'Zgjidhni të paktën një fushë.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/superadmin/admins', {
        token,
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          fieldIds: form.fieldIds,
        },
      });
      setFeedback({ type: 'success', text: 'Admin u krijua me sukses!' });
      setForm({ name: '', email: '', password: '', fieldIds: [] });
      await loadAdmins();
      await loadFields();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Krijimi dështoi.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Super Admin</h1>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Admin-ët e Fushave</h2>
        {loadingAdmins ? (
          <p className="feedback">Duke ngarkuar...</p>
        ) : admins.length === 0 ? (
          <p className="feedback">Nuk ka admin-ë të regjistruar ende.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emri</th>
                  <th>Email</th>
                  <th>Fushat e Caktuara</th>
                  <th>Data e Krijimit</th>
                  <th>Veprimet</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const adminFields = Array.isArray(admin.fields) ? admin.fields : [];
                  return (
                    <tr key={admin.id}>
                      <td data-label="Emri">{admin.name}</td>
                      <td data-label="Email">{admin.email}</td>
                      <td data-label="Fushat e Caktuara">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {adminFields.length === 0 ? (
                            <span className="badge badge-pending">Pa fusha</span>
                          ) : (
                            adminFields.map((f) => (
                              <span key={f.id} className="badge badge-confirmed">
                                {f.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td data-label="Data e Krijimit">{formatDate(admin.created_at)}</td>
                      <td data-label="Veprimet">
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => onDeleteAdmin(admin)}
                        >
                          Fshi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Shto Admin të Ri</h2>
        {feedback && (
          <p className={`feedback feedback-${feedback.type === 'success' ? 'success' : 'error'}`}>
            {feedback.text}
          </p>
        )}
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="admin-name">Emri i plotë</label>
            <input
              id="admin-name"
              className="input"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="admin-password">Fjalëkalimi</label>
            <input
              id="admin-password"
              className="input"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <span className="label">Zgjidhni Fushat</span>
            {loadingFields ? (
              <p className="feedback">Duke ngarkuar fushat...</p>
            ) : fields.length === 0 ? (
              <p className="feedback">Nuk ka fusha në sistem.</p>
            ) : (
              fieldsByLocation.map(([location, locationFields]) => (
                <div key={location} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{location}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {locationFields.map((field) => (
                      <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.fieldIds.includes(field.id)}
                          onChange={() => toggleField(field.id)}
                        />
                        <span>
                          {field.name}
                          {' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            ({terrainLabel(field.terrain_type)})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? 'Duke krijuar...' : 'Krijo Admin'}
          </button>
        </form>
      </section>
    </div>
  );
}
