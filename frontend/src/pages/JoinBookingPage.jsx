import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function JoinBookingPage() {
  const { token } = useAuth();
  const { token: inviteToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [needsShoes, setNeedsShoes] = useState(false);
  const [shoeSize, setShoeSize] = useState(42);
  const [paid, setPaid] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }
    setLoading(true);
    apiFetch(`/bookings/join/${inviteToken}`, { token })
      .then((r) => {
        setDetails(r);
        setError('');
      })
      .catch((e) => setError(e.message || 'Ky link i ftesës nuk është më i vlefshëm.'))
      .finally(() => setLoading(false));
  }, [token, inviteToken, navigate, location]);

  const total = useMemo(() => Number(details?.price_per_player || 0) + (needsShoes ? 2 : 0), [details, needsShoes]);

  const handlePay = async () => {
    try {
      const r = await apiFetch(`/bookings/${details.booking_id}/pay`, {
        token,
        method: 'POST',
        body: { needsShoes, shoeSize },
      });
      setPaid(r);
    } catch (e) {
      setError(e.message || 'Pagesa dështoi.');
    }
  };

  if (loading) return <div className="page"><div className="card">Duke ngarkuar…</div></div>;
  if (error) return <div className="page"><div className="feedback feedback-error">{error || 'Ky link i ftesës nuk është më i vlefshëm.'}</div></div>;

  return (
    <div className="page">
      <h1 className="page-title">Bashkohu në rezervim</h1>
      <div className="card">
        <p><strong>Fusha:</strong> {details.field_name}</p>
        <p><strong>Lokacioni:</strong> {details.location}</p>
        <p><strong>Terreni:</strong> {details.terrain_type}</p>
        <p><strong>Data dhe ora:</strong> {new Date(details.start_time).toLocaleString('sq-AL')}</p>
        <p><strong>Çmimi për lojtar:</strong> {Number(details.price_per_player || 0).toFixed(2)}€</p>
        <p><strong>Kush ju ftoi:</strong> {details.organizer_name}</p>
        <p><strong>Të paguar:</strong> {details.paid_count || 0} / 12</p>
      </div>

      {!paid ? (
        <div className="card">
          <div className="form-group">
            <label className="label">A keni nevojë për patika?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`btn ${!needsShoes ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setNeedsShoes(false)}>Jo</button>
              <button type="button" className={`btn ${needsShoes ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setNeedsShoes(true)}>Po</button>
            </div>
          </div>
          {needsShoes && (
            <div className="form-group">
              <label className="label">Numri i patikave</label>
              <select className="input" value={shoeSize} onChange={(e) => setShoeSize(Number(e.target.value))}>
                {Array.from({ length: 10 }).map((_, i) => <option key={i} value={36 + i}>Nr. {36 + i}</option>)}
              </select>
            </div>
          )}
          <p>Totali juaj: <strong>{total.toFixed(2)}€</strong></p>
          <button type="button" className="btn btn-accent" onClick={handlePay}>
            Pranoj dhe Paguaj {total.toFixed(2)}€
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="feedback feedback-success">Pagesa u krye me sukses! Pjesa juaj: {Number(paid.participant_paid || total).toFixed(2)}€</div>
          <p>Mbeten {Math.max(0, 12 - Number(paid.paid_count || 0))} lojtarë për të paguar.</p>
        </div>
      )}
    </div>
  );
}
