import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [formKey, setFormKey] = useState(0);

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

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const onDeleteAdmin = async (admin) => {
    const ok = window.confirm(
      'Duke fshirë këtë admin do të fshihen të gjitha fushat dhe rezervimet e tij përgjithmonë. A jeni i sigurt?'
    );
    if (!ok) return;
    setFeedback(null);
    try {
      await apiFetch(`/superadmin/admins/${admin.id}`, { token, method: 'DELETE' });
      setFeedback({ type: 'success', text: 'Admin-i dhe të gjitha fushat u fshiën me sukses!' });
      await loadAdmins();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Fshirja dështoi.' });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.email.trim() || !form.password) {
      setFeedback({ type: 'error', text: 'Plotësoni të gjitha fushat e detyrueshme.' });
      return;
    }
    if (form.password.length < 8) {
      setFeedback({ type: 'error', text: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/superadmin/admins', {
        token,
        method: 'POST',
        body: {
          email: form.email.trim(),
          password: form.password,
        },
      });
      setFeedback({ type: 'success', text: 'Admin u krijua me sukses!' });
      setForm({ email: '', password: '' });
      setFormKey((k) => k + 1);
      await loadAdmins();
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
        <form key={formKey} onSubmit={onSubmit}>
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
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? 'Duke krijuar...' : 'Krijo Admin'}
          </button>
        </form>
      </section>
    </div>
  );
}
