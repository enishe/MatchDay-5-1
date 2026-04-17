import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Euro, Clock, Trophy } from 'lucide-react';
import Button from '../../components/UI/Button';
import Badge from '../../components/UI/Badge';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/Layout/EmptyState';

const TABS = [
  { id: 'active', label: 'Aktive' },
  { id: 'past', label: 'Të kaluara' },
  { id: 'upcoming', label: 'Të ardhshme' },
];

const PlayerMatches = () => {
  const [tab, setTab] = useState('active');

  const matches = [
    {
      id: 1,
      field_name: 'Fusha Prishtina 1',
      start_time: '2026-04-18T18:00:00Z',
      end_time: '2026-04-18T19:00:00Z',
      status: 'confirmed',
      total_players: 12,
      accepted_players: 12,
      price_per_player: 5.0,
      role: 'organizer',
    },
    {
      id: 2,
      field_name: 'Salla Prizren',
      start_time: '2026-04-19T20:00:00Z',
      end_time: '2026-04-19T21:00:00Z',
      status: 'pending',
      total_players: 12,
      accepted_players: 6,
      price_per_player: 5.0,
      role: 'participant',
    },
  ];

  const statusVariant = (status) => {
    const m = {
      pending: 'pending',
      confirmed: 'confirmed',
      cancelled: 'cancelled',
      completed: 'paid',
      no_show: 'no-show',
    };
    return m[status] || 'pending';
  };

  const statusLabel = (status) => {
    const labels = {
      pending: 'Në pritje',
      confirmed: 'E konfirmuar',
      cancelled: 'E anuluar',
      completed: 'E përfunduar',
      no_show: 'No-show',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('sq-AL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const pct = (a, t) => Math.min(100, Math.round((a / t) * 100));

  const now = new Date();
  const list = matches.filter((m) => {
    const start = new Date(m.start_time);
    if (tab === 'past') return start < now;
    if (tab === 'upcoming') return start > now;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="player"
        eyebrow="Ndeshjet"
        title="Ndeshjet e mia"
        description="Shikoni statusin, plotësimin e grupit dhe veprimet për çdo rezervim."
      />

      <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-panel/50 p-1.5 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-text-muted hover:bg-panel-light/60 hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nuk keni ndeshje"
          description="Kur të keni rezervime, ato do të shfaqen këtu."
          action={
            <Link
              to="/player/fields"
              className="btn-primary inline-flex w-full items-center justify-center rounded-lg sm:w-auto"
            >
              Shfleto fushat
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-panel/40 px-6 py-12 text-center text-sm text-text-muted">
          Nuk ka ndeshje për këtë kategori. Provoni një tjetër skedë.
        </div>
      ) : (
        <ul className="space-y-4 sm:space-y-5">
          {list.map((match) => (
            <li
              key={match.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-panel/85 shadow-lg backdrop-blur-sm transition-colors hover:border-primary/25"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:justify-between sm:p-6">
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-6">
                  <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/50 bg-bg-light/40 px-4 py-3 sm:flex-col sm:items-center sm:justify-center sm:px-3 sm:py-4">
                    <Calendar className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
                    <div className="text-left sm:text-center">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Data
                      </p>
                      <p className="text-sm font-semibold text-text">{formatDate(match.start_time)}</p>
                      <p className="text-xs text-text-muted">
                        {formatTime(match.start_time)} – {formatTime(match.end_time)}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-text sm:text-xl">
                        {match.field_name}
                      </h3>
                      <Badge variant={statusVariant(match.status)}>
                        {statusLabel(match.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Users className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>
                          {match.accepted_players}/{match.total_players} lojtarë
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Euro className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>€{match.price_per_player}/lojtar</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                        <span>1 orë</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium text-text">
                        <Trophy className="h-4 w-4 shrink-0 text-accent" />
                        {match.role === 'organizer' ? 'Organizator' : 'Pjesëmarrës'}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-text-muted">
                        <span>Plotësimi</span>
                        <span>
                          {match.accepted_players}/{match.total_players}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-light">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
                          style={{ width: `${pct(match.accepted_players, match.total_players)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-40">
                  <Button variant="outline" size="sm" className="w-full">
                    Detajet
                  </Button>
                  {match.role === 'organizer' && match.status === 'pending' && (
                    <Button variant="secondary" size="sm" className="w-full">
                      Fto lojtarë
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlayerMatches;
