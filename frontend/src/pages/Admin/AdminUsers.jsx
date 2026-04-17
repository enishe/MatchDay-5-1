import React from 'react';
import { UsersRound, Shield, UserPlus } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';

const AdminUsers = () => {
  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="admin"
        eyebrow="Përdoruesit"
        title="Menaxhimi i përdoruesve"
        description="Roli, aktivizimi dhe mbikëqyrja e llogarive. Integrimi me API për listë dhe editim vjen më poshtë."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-indigo-500/10 bg-panel/80 p-6 shadow-lg lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-200">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-text">Të gjithë përdoruesit</h2>
                <p className="text-sm text-text-muted">Kërkim, filtrim sipas rolit, eksport CSV.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-bg-light/40 px-3 py-1 text-xs font-medium text-text-muted">
              <Shield className="h-3.5 w-3.5" />
              RBAC aktiv
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-border/60 bg-bg-light/20 px-4 py-16 text-center">
            <UserPlus className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-60" />
            <p className="text-sm text-text-muted">
              Tabela e përdoruesve dhe veprimet (suspend / ndrysho rol) do të vendosen këtu.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-panel/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Roli në DB</p>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            <li>
              <span className="font-medium text-text">admin</span> — paneli që po shihni
            </li>
            <li>
              <span className="font-medium text-text">organizator</span> — krijon ndeshje
            </li>
            <li>
              <span className="font-medium text-text">participant</span> — legacy / ftesa
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
