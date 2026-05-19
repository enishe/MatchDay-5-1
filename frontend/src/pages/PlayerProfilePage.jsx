import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function playerInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerProfilePage() {
  const { nickname } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !nickname) return;
    setLoading(true);
    setError('');
    apiFetch(`/users/search?nickname=${encodeURIComponent(nickname)}`, { token })
      .then((data) => setPlayer(data))
      .catch((err) => setError(err.message || 'Lojtari nuk u gjet.'))
      .finally(() => setLoading(false));
  }, [nickname, token]);

  if (loading) {
    return (
      <div className="page container" style={{ textAlign: 'center', marginTop: 60 }}>
        Duke kërkuar...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="page container" style={{ textAlign: 'center', marginTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2>Lojtari nuk u gjet</h2>
        <p style={{ opacity: 0.6 }}>{error || 'Lojtari nuk u gjet.'}</p>
        <button type="button" className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
          ← Kthehu
        </button>
      </div>
    );
  }

  const photo = player.profile_photo_url;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start', marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Kthehu
      </button>

      <div
        className="card profile-card"
        style={{
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={player.name}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              margin: '0 auto 16px',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#0a0f0d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              margin: '0 auto 16px',
            }}
          >
            {playerInitials(player.name)}
          </div>
        )}

        <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem' }}>{player.name}</h1>
        <p style={{ margin: '0 0 24px', opacity: 0.65, fontSize: 15 }}>@{player.nickname}</p>

        <div
          className="stat-card"
          style={{
            marginBottom: player.preferred_field_name ? 20 : 0,
            padding: '20px 16px',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚽</div>
          <div className="stat-card-value" style={{ fontSize: '2rem' }}>
            {player.matches_this_month}
          </div>
          <div className="stat-card-label">ndeshje këtë muaj</div>
        </div>

        {player.preferred_field_name && (
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>
            🏟️ {player.preferred_field_name}
          </p>
        )}
      </div>
    </div>
  );
}
