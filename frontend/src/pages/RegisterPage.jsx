import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (user) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    if (!String(firstName).trim()) return 'Shkruani emrin.';
    if (!String(lastName).trim()) return 'Shkruani mbiemrin.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(String(email).trim())) return 'Email jo i vlefshëm.';
    if (!password || password.length < 8) return 'Fjalëkalimi: minimum 8 karaktere.';
    if (password !== confirmPassword) return 'Fjalëkalimet nuk përputhen.';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const v = validate();
    if (v) return setLocalError(v);
    try {
      await register({
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        password,
        confirmPassword,
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
        <p className="auth-sub">Krijo llogari lojtari</p>

        {localError && <div className="feedback feedback-error">{localError}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="firstName">
              Emri
            </label>
            <input
              id="firstName"
              className="input"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="lastName">
              Mbiemri
            </label>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
                minLength={8}
                required
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
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
