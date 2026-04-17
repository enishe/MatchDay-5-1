import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Clock, Check, X, Users, MapPin } from 'lucide-react';
import Button from '../../components/UI/Button';
import Badge from '../../components/UI/Badge';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/Layout/EmptyState';

const PlayerInvitations = () => {
  const invitations = [
    {
      id: 1,
      organizer_name: 'Enis Hetemi',
      organizer_username: 'enis_hetemi',
      field_name: 'Fusha Prishtina 1',
      start_time: '2026-04-18T18:00:00Z',
      end_time: '2026-04-18T19:00:00Z',
      status: 'pending',
      price_per_player: 5.0,
      current_players: 8,
      max_players: 12,
    },
    {
      id: 2,
      organizer_name: 'Ardit Krasniqi',
      organizer_username: 'ardit_k',
      field_name: 'Salla Prizren',
      start_time: '2026-04-19T20:00:00Z',
      end_time: '2026-04-19T21:00:00Z',
      status: 'accepted',
      price_per_player: 5.0,
      current_players: 10,
      max_players: 12,
    },
  ];

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('sq-AL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleAcceptInvitation = (invitationId) => {
    console.log('Accepting invitation:', invitationId);
  };

  const handleDeclineInvitation = (invitationId) => {
    console.log('Declining invitation:', invitationId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="player"
        eyebrow="Ftesat"
        title="Ftesat për ndeshje"
        description="Pranoni ose refuzoni ftesa nga organizatorët. Çmimi për lojtar shfaqet qartë përpara konfirmimit."
      />

      {invitations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nuk keni ftesa"
          description="Kur dikush ju fton në një ndeshje, do të shfaqet këtu."
          action={
            <Link
              to="/player/my-matches"
              className="btn-outline inline-flex w-full items-center justify-center rounded-lg sm:w-auto"
            >
              Shiko ndeshjet
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4 sm:space-y-5">
          {invitations.map((inv) => (
            <li
              key={inv.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-panel/85 shadow-lg backdrop-blur-sm"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-text">
                        {inv.organizer_name}
                      </h3>
                      <p className="text-sm text-text-muted">@{inv.organizer_username}</p>
                    </div>
                    {inv.status === 'accepted' && (
                      <Badge variant="confirmed" className="ml-auto sm:ml-0">
                        E pranuar
                      </Badge>
                    )}
                    {inv.status === 'declined' && (
                      <Badge variant="cancelled" className="ml-auto sm:ml-0">
                        E refuzuar
                      </Badge>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="flex gap-3 rounded-xl border border-border/50 bg-bg-light/30 p-3">
                      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Koha
                        </p>
                        <p className="text-sm font-medium text-text">{formatDate(inv.start_time)}</p>
                        <p className="text-xs text-text-muted">
                          {formatTime(inv.start_time)} – {formatTime(inv.end_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-border/50 bg-bg-light/30 p-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Fusha
                        </p>
                        <p className="text-sm font-medium text-text">{inv.field_name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                          <Users className="h-3.5 w-3.5" />
                          {inv.current_players}/{inv.max_players} lojtarë
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm">
                    <span className="text-text-muted">Çmimi për lojtar: </span>
                    <span className="font-heading text-lg font-bold text-primary-light">
                      €{inv.price_per_player.toFixed(2)}
                    </span>
                  </p>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
                  {inv.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleAcceptInvitation(inv.id)}
                      >
                        <Check className="mr-1.5 inline h-4 w-4" />
                        Prano
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeclineInvitation(inv.id)}
                      >
                        <X className="mr-1.5 inline h-4 w-4" />
                        Refuzo
                      </Button>
                    </>
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

export default PlayerInvitations;
