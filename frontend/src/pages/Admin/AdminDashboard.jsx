import React from 'react';
import { Trophy, Users, Calendar, Euro, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  // Mock statistics data
  const stats = [
    {
      label: 'Total Rezervime',
      value: '156',
      change: '+12%',
      icon: Calendar,
      color: 'text-blue-400'
    },
    {
      label: 'Përdorues Aktivë',
      value: '89',
      change: '+8%',
      icon: Users,
      color: 'text-green-400'
    },
    {
      label: 'Të Ardhura Totale',
      value: '€9,360',
      change: '+15%',
      icon: Euro,
      color: 'text-yellow-400'
    },
    {
      label: 'Fusha Aktive',
      value: '12',
      change: '+2',
      icon: Trophy,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-text mb-2">
            Dashboard Admin
          </h1>
          <p className="text-text/70">
            Përmbledhja e statistikave kryesore të platformës
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text/70 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-text mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">{stat.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-panel ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Bookings */}
          <div className="card">
            <h3 className="text-lg font-heading font-bold text-text mb-4">
              Rezervimet e Fundit
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-text font-medium">Fusha Prishtina 1</p>
                    <p className="text-text/70 text-sm">18 Prill, 18:00</p>
                  </div>
                  <span className="badge-confirmed">E Konfirmuar</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Users */}
          <div className="card">
            <h3 className="text-lg font-heading font-bold text-text mb-4">
              Përdorues të Rinj
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary rounded-full mr-3"></div>
                    <div>
                      <p className="text-text font-medium">Përdorues {item}</p>
                      <p className="text-text/70 text-sm">user{item}@matchday.com</p>
                    </div>
                  </div>
                  <span className="badge-pending">Lojtar</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
