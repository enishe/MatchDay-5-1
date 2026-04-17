import React from 'react';
import { Trophy, Users, Calendar, Euro, TrendingUp, ArrowUpRight } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';

const AdminDashboard = () => {
  const stats = [
    {
      label: 'Rezervime totale',
      value: '156',
      change: '+12%',
      icon: Calendar,
      accent: 'from-indigo-500/20 to-indigo-600/5',
      iconClass: 'text-indigo-300',
    },
    {
      label: 'Përdorues aktivë',
      value: '89',
      change: '+8%',
      icon: Users,
      accent: 'from-emerald-500/15 to-emerald-600/5',
      iconClass: 'text-emerald-300',
    },
    {
      label: 'Të ardhura (vlerësim)',
      value: '€9.360',
      change: '+15%',
      icon: Euro,
      accent: 'from-amber-500/15 to-amber-600/5',
      iconClass: 'text-amber-300',
    },
    {
      label: 'Fusha aktive',
      value: '12',
      change: '+2',
      icon: Trophy,
      accent: 'from-violet-500/15 to-violet-600/5',
      iconClass: 'text-violet-300',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="admin"
        eyebrow="Përmbledhje"
        title="Dashboard"
        description="Statistika të përgjithshme dhe aktiviteti i fundit në platformë (të dhëna demonstruese)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-2xl border border-indigo-500/10 bg-gradient-to-br ${stat.accent} p-5 shadow-lg backdrop-blur-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {stat.label}
                </p>
                <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-text">
                  {stat.value}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400/90">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {stat.change}
                </div>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg/50 ${stat.iconClass}`}
              >
                <stat.icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-indigo-500/10 bg-panel/80 p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-bold text-text">Rezervimet e fundit</h3>
            <ArrowUpRight className="h-4 w-4 text-text-muted" />
          </div>
          <ul className="divide-y divide-border/50">
            {[1, 2, 3, 4].map((item) => (
              <li key={item} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-text">Fusha Prishtina 1</p>
                  <p className="text-xs text-text-muted">18 prill, 18:00</p>
                </div>
                <span className="badge-confirmed shrink-0 rounded-lg px-2.5 py-1 text-[11px]">
                  E konfirmuar
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-indigo-500/10 bg-panel/80 p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-bold text-text">Përdorues të rinj</h3>
            <Users className="h-4 w-4 text-text-muted" />
          </div>
          <ul className="divide-y divide-border/50">
            {[1, 2, 3, 4].map((item) => (
              <li key={item} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500/40 to-indigo-700/20 ring-2 ring-indigo-400/20" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">Përdorues {item}</p>
                    <p className="truncate text-xs text-text-muted">user{item}@matchday.com</p>
                  </div>
                </div>
                <span className="badge-pending shrink-0 rounded-lg px-2.5 py-1 text-[11px]">
                  Lojtar
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
