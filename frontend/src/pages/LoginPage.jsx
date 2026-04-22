import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : from} replace />;

  const validate = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(String(email).trim())) return 'Email jo i vlefshëm.';
    if (!password || password.length < 8) return 'Fjalëkalimi: minimum 8 karaktere.';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const v = validate();
    if (v) return setLocalError(v);
    try {
      const result = await login(String(email).trim(), password);
      navigate(result?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Kyçja dështoi.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">MatchDay 5+1</div>
        <p className="auth-sub">Hyni për të menaxhuar rezervimet dhe ndeshjet</p>

        {localError && <div className="feedback feedback-error">{localError}</div>}

        <form onSubmit={onSubmit}>
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
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="password">
              Fjalëkalimi
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={show ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
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
          <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: 8 }} disabled={isLoading}>
            {isLoading ? 'Duke u kyçur…' : 'Kyçuni'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Nuk keni llogari?{' '}
          <Link to="/register">Regjistrohuni këtu</Link>
        </p>
      </div>
    </div>
  );
}
