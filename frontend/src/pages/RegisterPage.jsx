import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function usernameFromEmail(email) {
  const local = String(email).split('@')[0] || 'user';
  const safe = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return (safe.length >= 3 ? safe : `user_${safe}`).slice(0, 50);
}

export default function RegisterPage() {
  const { user, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('organizer');
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (user) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    if (!String(name).trim()) return 'Shkruani emrin.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(String(email).trim())) return 'Email jo i vlefshëm.';
    const u = String(username || usernameFromEmail(email)).trim();
    if (u.length < 3) return 'Username: minimum 3 karaktere.';
    if (!String(phone).trim()) return 'Numri i telefonit është i detyrueshëm.';
    if (!String(bank).trim()) return 'Llogaria bankare është e detyrueshme.';
    if (!password || password.length < 6) return 'Fjalëkalimi: minimum 6 karaktere.';
    if (password !== confirm) return 'Fjalëkalimet nuk përputhen.';
    if (role !== 'organizer') return 'Regjistrim publik vetëm për organizatorë.';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const v = validate();
    if (v) return setLocalError(v);
    try {
      await register({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password,
        username: String(username || usernameFromEmail(email)).trim(),
        phone_number: String(phone).trim(),
        bank_account: String(bank).trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Regjistrimi dështoi.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">MatchDay 5+1</div>
        <p className="auth-sub">Krijo llogari organizatori</p>

        {localError && <div className="feedback feedback-error">{localError}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="name">
              Emri
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (!username) setUsername(usernameFromEmail(e.target.value));
              }}
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="phone">
              Telefoni
            </label>
            <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="bank">
              Llogaria bankare
            </label>
            <input id="bank" className="input" value={bank} onChange={(e) => setBank(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="role">
              Roli
            </label>
            <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="organizer">Organizator</option>
              <option value="participant">Pjesëmarrës</option>
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Për momentin regjistrohen vetëm organizatorët; roli ruhet si organizator.
            </p>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="pw">
              Fjalëkalimi
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="pw"
                className="input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Shfaq fjalëkalimin"
                onClick={() => setShow((s) => !s)}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  width: 36,
                  height: 36,
                }}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="pw2">
              Konfirmo fjalëkalimin
            </label>
            <input
              id="pw2"
              className="input"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Duke u regjistruar…' : 'Regjistrohu'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Keni llogari? <Link to="/login">Kyçuni</Link>
        </p>
      </div>
    </div>
  );
}
