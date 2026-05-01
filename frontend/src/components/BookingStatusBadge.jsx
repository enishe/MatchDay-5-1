/**
 * Purpose:
 * Visual status badge for bookings with optional pending countdown.
 * This is UI-only and does not alter backend booking logic.
 */
import { useEffect, useMemo, useState } from 'react';

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function BookingStatusBadge({ status, expiresAt, cancelReason }) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (status !== 'pending' || !expiresAt) return undefined;
    const tick = () => setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status, expiresAt]);

  const effectiveStatus = useMemo(() => {
    if (status === 'pending' && expiresAt && remainingMs <= 0) return 'expired';
    return status;
  }, [status, expiresAt, remainingMs]);

  if (effectiveStatus === 'confirmed') {
    return <span className="badge badge-confirmed">Konfirmuar</span>;
  }
  if (effectiveStatus === 'canceled') {
    return <span className="badge badge-canceled">Anuluar{cancelReason ? `: ${cancelReason}` : ''}</span>;
  }
  if (effectiveStatus === 'expired') {
    return <span className="badge badge-canceled">Skaduar</span>;
  }
  if (effectiveStatus === 'pending' && expiresAt) {
    return <span className="badge badge-pending">Anulohet për: {formatRemaining(remainingMs)}</span>;
  }
  return <span className="badge badge-pending">Në pritje të konfirmimit</span>;
}
