import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { token, user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarErr, setAvatarErr] = useState('');
  const [nickname, setNickname] = useState('');
  const [prefField, setPrefField] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([apiFetch('/auth/profile', { token }), apiFetch('/fields', { token })])
      .then(([p, f]) => {
        setProfile(p);
        setFields(Array.isArray(f) ? f : []);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setPhone(p.phone || '');
        setBank(p.bank_account || '');
        setAvatar(p.avatar_url || '');
        setNickname(p.nickname || '');
        setPrefField(p.preferred_field_id != null ? String(p.preferred_field_id) : '');
      })
      .catch(() => setMsg({ type: 'err', text: 'Nuk u ngarkua profili.' }))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        bank_account: bank.trim(),
        avatar_url: avatar.trim(),
        nickname: nickname.trim(),
        profile_photo_url: avatar.trim(),
        preferred_field_id: prefField === '' ? null : parseInt(prefField, 10),
      };
      const updated = await apiFetch('/auth/profile', { token, method: 'PUT', body });
      setProfile(updated);
      const raw = localStorage.getItem('matchday_user');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'matchday_user',
        JSON.stringify({
          ...prev,
          ...updated,
          name: updated.name,
        })
      );
      refreshUser();
      setMsg({ type: 'ok', text: 'Profili u ruajt.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Ruajtja dështoi.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 'clamp(70px, 12vw, 90px)' }} />
        </div>
        <div className="profile-layout">
          <div className="card">
            <div className="skeleton" style={{ height: 'clamp(180px, 36vw, 240px)' }} />
          </div>
          <div className="card">
            <div className="skeleton" style={{ height: 'clamp(320px, 60vw, 440px)' }} />
          </div>
        </div>
      </div>
    );
  }

  const stats = profile?.stats || { matches_total: 0, matches_this_month: 0 };
  const initials = (() => {
    const fn = String(firstName || '').trim();
    const ln = String(lastName || '').trim();
    const a = fn ? fn[0] : '';
    const b = ln ? ln[0] : '';
    return (a + b).toUpperCase() || '?';
  })();

  return (
    <div className="page">
      <h1 className="page-title">Profili im</h1>
      <p className="page-subtitle">Të dhëna personale dhe preferenca</p>

      {msg && <div className={`feedback feedback-${msg.type === 'err' ? 'error' : 'success'}`}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Statistika</div>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Ndeshje totale (si organizator): <strong>{stats.matches_total}</strong>
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
          Ndeshje këtë muaj: <strong>{stats.matches_this_month}</strong>
        </p>
      </div>

      <div className="profile-layout">
        <div className="card profile-photo-card">
          <input
            id="avatar-file-hidden"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
                setAvatarErr('Ju lutem zgjidhni një foto (jpg, png, gif, webp).');
                return;
              }
              const maxBytes = 5 * 1024 * 1024;
              if (file.size > maxBytes) {
                setAvatarErr('Fotoja është shumë e madhe. Maksimumi është 5MB.');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const result = typeof reader.result === 'string' ? reader.result : '';
                if (!result.startsWith('data:image')) {
                  setAvatarErr('Ju lutem zgjidhni një foto (jpg, png, gif, webp).');
                  return;
                }
                setAvatarErr('');
                setAvatar(result);
              };
              reader.readAsDataURL(file);
            }}
          />
          <button
            type="button"
            className="profile-photo-preview"
            aria-label="Ngarko foto profili"
            onClick={() => document.getElementById('avatar-file-hidden')?.click()}
          >
            {avatar ? (
              <img src={avatar} alt="Foto e profilit" style={{ display: 'block', width: '100%', height: '100%' }} />
            ) : (
              <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{initials}</span>
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 10, width: '100%' }}
            onClick={() => document.getElementById('avatar-file-hidden')?.click()}
          >
            Ndrysho foton
          </button>
          {avatarErr && (
            <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--color-danger)', fontSize: 13 }}>
              {avatarErr}
            </p>
          )}
        </div>

        <form className="card" onSubmit={onSave}>
          <div className="card-title">Ndrysho të dhënat</div>
          <div className="form-group">
            <label className="label" htmlFor="fn">
              Emri
            </label>
            <input id="fn" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="ln">
              Mbiemri
            </label>
            <input id="ln" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="em">
              Email (vetëm lexim)
            </label>
            <input id="em" className="input" value={profile?.email || user?.email || ''} disabled readOnly />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="ph">
              Telefoni (opsional)
            </label>
            <input id="ph" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="bk">
              Numri i llogarisë bankare (opsional)
            </label>
            <input id="bk" className="input" value={bank} onChange={(e) => setBank(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="nk">
              Nickname unik
            </label>
            <input id="nk" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="pf">
              Fusha e preferuar (Mitrovicë)
            </label>
            <select id="pf" className="input" value={prefField} onChange={(e) => setPrefField(e.target.value)}>
              <option value="">— Zgjidh —</option>
              {fields.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-accent profile-save-btn" disabled={saving}>
            {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </button>
        </form>
      </div>
    </div>
  );
}
