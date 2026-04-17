import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBase } from '../lib/api';
import PageHeader from '../components/Layout/PageHeader';
import TableScroll from '../components/UI/TableScroll';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';

const authHeaders = () => {
  const token = localStorage.getItem('matchday_token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

export default function AdminPanel() {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtri, setFiltri] = useState('');
  const [mesazhi, setMesazhi] = useState(null);
  const navigate = useNavigate();

  const tregoBust = useCallback((tekst, lloji = 'sukses') => {
    setMesazhi({ tekst, lloji });
    setTimeout(() => setMesazhi(null), 4000);
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const base = getApiBase();
    const q = filtri ? `?status=${encodeURIComponent(filtri)}` : '';
    Promise.all([
      fetch(`${base}/matches${q}`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${base}/matches/stats`, { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([m, s]) => {
        setMatches(Array.isArray(m) ? m : []);
        setStats(s && typeof s === 'object' ? s : null);
      })
      .catch(() => tregoBust('Gabim gjatë ngarkimit të të dhënave.', 'error'))
      .finally(() => setLoading(false));
  }, [filtri, tregoBust]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFshi = async (id) => {
    if (!window.confirm(`Fshi rezervimin #${id}?`)) return;
    try {
      const res = await fetch(`${getApiBase()}/matches/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Gabim gjatë fshirjes.');
      tregoBust(`Rezervimi #${id} u fshi.`);
      fetchData();
    } catch (err) {
      tregoBust(err.message, 'error');
    }
  };

  const handleNdrysho = async (id, status) => {
    try {
      const res = await fetch(`${getApiBase()}/matches/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Gabim gjatë përditësimit.');
      tregoBust('Statusi u përditësua.');
      fetchData();
    } catch (err) {
      tregoBust(err.message, 'error');
    }
  };

  const statusBadge = (status) => {
    if (status === 'confirmed') return { variant: 'confirmed', label: 'Konfirmuar' };
    if (status === 'pending') return { variant: 'pending', label: 'Në pritje' };
    if (status === 'canceled' || status === 'cancelled')
      return { variant: 'cancelled', label: 'Anuluar' };
    return { variant: 'default', label: status };
  };

  const statCards = stats
    ? [
        { label: 'Gjithsej', value: stats.total, accent: 'border-l-slate-400/60' },
        { label: 'Të ardhurat', value: `${stats.totali_cmimit ?? 0}€`, accent: 'border-l-indigo-400/70' },
        { label: 'Konfirmuara', value: stats.confirmed, accent: 'border-l-emerald-400/70' },
        { label: 'Në pritje', value: stats.pending, accent: 'border-l-amber-400/70' },
      ]
    : [];

  const fieldsDemo = [
    { id: 1, emri: 'Fusha Prishtina 1', terrain: 'Bar artificial', cmimi: 60, aktive: true },
    { id: 2, emri: 'Salla Prizren', terrain: 'Sallë futsali', cmimi: 60, aktive: true },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="admin"
        eyebrow="Fushat"
        title="Menaxhimi i fushave"
        description="Përmbledhje e rezervimeve dhe lista operacionale. Veprimet kërkojnë sesion admin të vlefshëm."
      />

      {mesazhi && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
            mesazhi.lloji === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {mesazhi.tekst}
        </div>
      )}

      {statCards.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border border-border/50 border-l-4 bg-panel/80 p-4 shadow-lg backdrop-blur-sm ${s.accent}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {s.label}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-text">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mb-8 overflow-hidden rounded-2xl border border-indigo-500/10 bg-panel/85 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <h2 className="font-heading text-xl font-bold text-text">Të gjitha rezervimet</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtri}
              onChange={(e) => setFiltri(e.target.value)}
              className="input-field min-w-[10rem] flex-1 sm:flex-initial"
            >
              <option value="">Të gjitha</option>
              <option value="pending">Në pritje</option>
              <option value="confirmed">Konfirmuara</option>
              <option value="canceled">Anuluara</option>
            </select>
            <Button variant="accent" size="sm" onClick={() => navigate('/admin/bookings')}>
              + Rezervim i ri
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading && (
            <p className="text-center text-sm text-text-muted">Duke ngarkuar…</p>
          )}
          {!loading && matches.length === 0 && (
            <p className="text-center text-sm text-text-muted">Nuk ka rezervime për këtë filtrim.</p>
          )}
          {!loading && matches.length > 0 && (
            <TableScroll>
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-bg-light/40 text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Fusha</th>
                    <th className="px-4 py-3 font-semibold">Data / ora</th>
                    <th className="px-4 py-3 font-semibold">Çmimi</th>
                    <th className="px-4 py-3 font-semibold">Split</th>
                    <th className="px-4 py-3 font-semibold">Statusi</th>
                    <th className="px-4 py-3 font-semibold text-right">Veprimet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {matches.map((m) => {
                    const sb = statusBadge(m.status);
                    return (
                      <tr key={m.id} className="transition-colors hover:bg-panel-light/30">
                        <td className="px-4 py-3 font-semibold text-text">#{m.id}</td>
                        <td className="px-4 py-3 text-text-muted">#{m.field_id}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(m.start_time).toLocaleString('sq-AL')}
                        </td>
                        <td className="px-4 py-3">{m.total_price}€</td>
                        <td className="px-4 py-3 font-semibold text-primary-light">
                          {m.price_per_player}€
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!py-1.5 !px-3 text-xs"
                              onClick={() => navigate(`/match/${m.id}`)}
                            >
                              Hap
                            </Button>
                            {m.status === 'pending' && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="!py-1.5 !px-3 text-xs"
                                onClick={() => handleNdrysho(m.id, 'confirmed')}
                              >
                                Konfirmo
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              className="!py-1.5 !px-3 text-xs"
                              onClick={() => handleFshi(m.id)}
                            >
                              Fshi
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-500/10 bg-panel/85 p-5 shadow-xl sm:p-6">
        <h2 className="mb-5 font-heading text-xl font-bold text-text">Fushat e disponueshme</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fieldsDemo.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-border/60 bg-bg-light/25 p-4 transition-colors hover:border-indigo-500/25"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-heading font-bold text-text">{f.emri}</p>
                <Badge variant={f.aktive ? 'confirmed' : 'cancelled'}>
                  {f.aktive ? 'Aktive' : 'Joaktive'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {f.terrain} · {f.cmimi}€ / orë
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
