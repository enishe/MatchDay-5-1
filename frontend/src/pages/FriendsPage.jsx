import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function FriendsPage() {
  const { token } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const bust = useCallback((text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const refreshLists = useCallback(() => {
    if (!token) return;
    Promise.all([apiFetch('/friends', { token }), apiFetch('/friends/pending', { token })])
      .then(([f, p]) => {
        setFriends(Array.isArray(f) ? f : []);
        setPending(Array.isArray(p) ? p : []);
      })
      .catch((e) => bust(e.message, 'err'));
  }, [token, bust]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const onSearch = async (e) => {
    e.preventDefault();
    if (!token || q.trim().length < 2) return bust('Shkruani të paktën 2 karaktere.', 'err');
    setLoading(true);
    try {
      const rows = await apiFetch(`/auth/search?q=${encodeURIComponent(q.trim())}`, { token });
      setResults(Array.isArray(rows) ? rows : []);
    } catch (err) {
      bust(err.message || 'Kërkimi dështoi.', 'err');
    } finally {
      setLoading(false);
    }
  };

  const sendRequestByEmail = async (email) => {
    if (!token) return;
    try {
      await apiFetch('/friends/request', { token, method: 'POST', body: { email } });
      bust('Ftesa u dërgua.');
      refreshLists();
    } catch (err) {
      bust(err.message || 'Gabim', 'err');
    }
  };

  const accept = async (id) => {
    try {
      await apiFetch(`/friends/accept/${id}`, { token, method: 'POST' });
      bust('Ftesa u pranua.');
      refreshLists();
    } catch (err) {
      bust(err.message || 'Gabim', 'err');
    }
  };

  const decline = async (id) => {
    try {
      await apiFetch(`/friends/decline/${id}`, { token, method: 'POST' });
      bust('Ftesa u refuzua.');
      refreshLists();
    } catch (err) {
      bust(err.message || 'Gabim', 'err');
    }
  };

  const inviteToMatch = async (friendId) => {
    try {
      const res = await apiFetch('/friends/invite-to-match', {
        token,
        method: 'POST',
        body: { friendId },
      });
      const link = res.link || `${window.location.origin}${res.path || ''}`;
      bust(`Njoftimi u dërgua. Link: ${link}`, 'ok');
    } catch (err) {
      bust(err.message || 'Gabim', 'err');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Friends</h1>
      <p className="page-subtitle">Kërko lojtarë, dërgo ftesa dhe fto në ndeshje</p>

      {msg && (
        <div className={`feedback feedback-${msg.type === 'err' ? 'error' : 'success'}`}>{msg.text}</div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Ftesë me email</div>
        <form
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}
          onSubmit={(e) => {
            e.preventDefault();
            sendRequestByEmail(inviteEmail.trim().toLowerCase());
          }}
        >
          <div style={{ flex: '1 1 220px' }}>
            <label className="label" htmlFor="invEmail">
              Email i lojtarit
            </label>
            <input
              id="invEmail"
              className="input"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="shoku@example.com"
            />
          </div>
          <button type="submit" className="btn btn-accent">
            Dërgo ftesë
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Kërko sipas emrit ose email-it</div>
        <form style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }} onSubmit={onSearch}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="p.sh. enis" />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '…' : 'Kërko'}
          </button>
        </form>
        {results.length > 0 && (
          <ul style={{ marginTop: 12, paddingLeft: 18 }}>
            {results.map((u) => (
              <li key={u.id} style={{ marginBottom: 8 }}>
                <strong>{u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()}</strong> — {u.email}{' '}
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => sendRequestByEmail(u.email)}>
                  Fto
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Ftesa në pritje</div>
          {pending.map((p) => (
            <div key={p.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span>
                {p.from.name} ({p.from.email})
              </span>
              <button type="button" className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => accept(p.id)}>
                Prano
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => decline(p.id)}>
                Refuzo
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">Miqtë e mi</div>
        {friends.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Ende nuk ke miq të pranuar.</p>}
        {friends.map((row) => (
          <div
            key={row.friendshipId}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div>
              <strong>{row.friend.name}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.friend.email}</div>
            </div>
            <button type="button" className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => inviteToMatch(row.friend.id)}>
              Fto në ndeshje
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
