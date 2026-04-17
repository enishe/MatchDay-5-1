import React from 'react';
import { Calendar, Users, Euro, Clock, Trophy } from 'lucide-react';

const PlayerMatches = () => {
  // Mock data for matches
  const matches = [
    {
      id: 1,
      field_name: 'Fusha Prishtina 1',
      start_time: '2026-04-18T18:00:00Z',
      end_time: '2026-04-18T19:00:00Z',
      status: 'confirmed',
      total_players: 12,
      accepted_players: 12,
      price_per_player: 5.00,
      role: 'organizer'
    },
    {
      id: 2,
      field_name: 'Salla Prizren',
      start_time: '2026-04-19T20:00:00Z',
      end_time: '2026-04-19T21:00:00Z',
      status: 'pending',
      total_players: 8,
      accepted_players: 6,
      price_per_player: 5.00,
      role: 'participant'
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      cancelled: 'badge-cancelled',
      completed: 'badge-paid',
      no_show: 'badge-no-show'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Në Pritje',
      confirmed: 'E Konfirmuar',
      cancelled: 'E Anulluar',
      completed: 'E Përfunduar',
      no_show: 'No-Show'
    };
    return labels[status] || 'Në Pritje';
  };

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

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-text mb-2">
            Ndeshjet e Mia
          </h1>
          <p className="text-text/70">
            Menaxhoni ndeshjet tuaja aktive dhe të kaluara
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="card mb-8">
          <div className="flex space-x-1 border-b border-border">
            <button className="px-4 py-2 text-accent border-b-2 border-accent font-medium">
              Aktive
            </button>
            <button className="px-4 py-2 text-text/70 hover:text-text transition-colors">
              Të Kaluara
            </button>
            <button className="px-4 py-2 text-text/70 hover:text-text transition-colors">
              Të Ardhshmet
            </button>
          </div>
        </div>

        {/* Matches Grid */}
        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="card-hover">
              <div className="flex items-start justify-between">
                {/* Match Info */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {/* Date & Time */}
                    <div className="text-center">
                      <Calendar className="h-8 w-8 text-accent mb-2" />
                      <div className="text-sm font-medium text-text">
                        {formatDate(match.start_time)}
                      </div>
                      <div className="text-text/70">
                        {formatTime(match.start_time)} - {formatTime(match.end_time)}
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="h-5 w-5 text-accent" />
                        <h3 className="text-xl font-heading font-bold text-text">
                          {match.field_name}
                        </h3>
                        <span className={getStatusBadge(match.status)}>
                          {getStatusLabel(match.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center text-text/70">
                          <Users className="h-4 w-4 mr-1" />
                          {match.accepted_players}/{match.total_players} Lojtarë
                        </div>
                        <div className="flex items-center text-text/70">
                          <Euro className="h-4 w-4 mr-1" />
                          €{match.price_per_player}/lojtar
                        </div>
                        <div className="flex items-center text-text/70">
                          <Clock className="h-4 w-4 mr-1" />
                          1 orë
                        </div>
                        <div className="flex items-center text-text/70">
                          <span className="font-medium">
                            {match.role === 'organizer' ? 'Organizator' : 'Pjesëmarrës'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button className="btn-outline">
                    Detajet
                  </button>
                  {match.role === 'organizer' && match.status === 'pending' && (
                    <button className="btn-secondary">
                      Fto Lojtarë
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar for Players */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-text/70">Plotësimi i ndeshjes</span>
                  <span className="text-text font-medium">
                    {match.accepted_players}/{match.total_players}
                  </span>
                </div>
                <div className="w-full bg-bg rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(match.accepted_players / match.total_players) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {matches.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-text/30 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-bold text-text mb-2">
              Nuk keni ndeshje
            </h3>
            <p className="text-text/70 mb-6">
              Filloni duke rezervuar fushën e parë për tu bashkuar me lojtarët e tjerë
            </p>
            <button className="btn-primary">
              Gjeni Fusha
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerMatches;
