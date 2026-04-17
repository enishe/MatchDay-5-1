import React from 'react';
import { Mail, Clock, Check, X, Users } from 'lucide-react';

const PlayerInvitations = () => {
  // Mock data for invitations
  const invitations = [
    {
      id: 1,
      organizer_name: 'Enis Hetemi',
      organizer_username: 'enis_hetemi',
      field_name: 'Fusha Prishtina 1',
      start_time: '2026-04-18T18:00:00Z',
      end_time: '2026-04-18T19:00:00Z',
      status: 'pending',
      price_per_player: 5.00,
      current_players: 8,
      max_players: 12
    },
    {
      id: 2,
      organizer_name: 'Ardit Krasniqi',
      organizer_username: 'ardit_k',
      field_name: 'Salla Prizren',
      start_time: '2026-04-19T20:00:00Z',
      end_time: '2026-04-19T21:00:00Z',
      status: 'accepted',
      price_per_player: 5.00,
      current_players: 10,
      max_players: 12
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sq-AL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAcceptInvitation = (invitationId) => {
    console.log('Accepting invitation:', invitationId);
    // TODO: Implement accept invitation logic
  };

  const handleDeclineInvitation = (invitationId) => {
    console.log('Declining invitation:', invitationId);
    // TODO: Implement decline invitation logic
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-text mb-2">
            Ftesat
          </h1>
          <p className="text-text/70">
            Menaxhoni ftesat për ndeshje
          </p>
        </div>

        {/* Invitations List */}
        <div className="space-y-6">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="card">
              <div className="flex items-start justify-between">
                {/* Invitation Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Mail className="h-5 w-5 text-accent" />
                    <h3 className="text-lg font-heading font-bold text-text">
                      Ftesë nga {invitation.organizer_name}
                    </h3>
                    <span className="text-text/70 text-sm">
                      @{invitation.organizer_username}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text/70">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <div>{formatDate(invitation.start_time)}</div>
                        <div>
                          {formatTime(invitation.start_time)} - {formatTime(invitation.end_time)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <div>
                        <div>{invitation.field_name}</div>
                        <div>
                          {invitation.current_players}/{invitation.max_players} lojtarë
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm">
                    <span className="text-text/70">Çmimi për lojtar: </span>
                    <span className="text-accent font-bold">€{invitation.price_per_player}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  {invitation.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="btn-primary flex items-center"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Prano
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        className="btn-outline flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Refuzo
                      </button>
                    </>
                  )}
                  {invitation.status === 'accepted' && (
                    <div className="text-center">
                      <span className="badge-confirmed">E Pranuar</span>
                    </div>
                  )}
                  {invitation.status === 'declined' && (
                    <div className="text-center">
                      <span className="badge-cancelled">E Refuzuar</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {invitations.length === 0 && (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-text/30 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-bold text-text mb-2">
              Nuk keni ftesa
            </h3>
            <p className="text-text/70">
              Kur të ftoni për ndeshje, ftesat do të shfaqen këtu
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInvitations;
