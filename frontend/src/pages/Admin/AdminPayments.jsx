import React from 'react';
import { CreditCard, Banknote, Receipt } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';

const AdminPayments = () => {
  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="admin"
        eyebrow="Pagesat"
        title="Menaxhimi i pagesave"
        description="Përpunimi i pagesave të lojtarëve (p.sh. para me të holla) kërkon rol admin në API. Këtu do të shfaqen transaksionet dhe filtrat."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/15 bg-panel/80 p-5 text-center shadow-lg">
          <Banknote className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Në pritje</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text">—</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/15 bg-panel/80 p-5 text-center shadow-lg">
          <Receipt className="mx-auto mb-2 h-8 w-8 text-indigo-300" />
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Të përpunuara</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text">—</p>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-panel/80 p-5 text-center shadow-lg">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-amber-300" />
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Total (demo)</p>
          <p className="mt-1 font-heading text-2xl font-bold text-text">€0</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-panel/50 p-8 text-center">
        <CreditCard className="mx-auto mb-3 h-12 w-12 text-text-muted opacity-50" />
        <p className="text-sm text-text-muted">
          Lista e transaksioneve dhe lidhja me <code className="rounded bg-bg-light px-1.5 py-0.5 text-xs text-primary-light">POST /api/payments/:id/process</code> (vetëm admin) do të shtohet këtu.
        </p>
      </div>
    </div>
  );
};

export default AdminPayments;
