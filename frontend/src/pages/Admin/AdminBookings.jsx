import React from 'react';
import { CalendarRange, ClipboardList, Sparkles } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';

const AdminBookings = () => {
  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="admin"
        eyebrow="Rezervime"
        title="Menaxhimi i rezervimeve"
        description="Filtra globale, anulime dhe mbikëqyrje e statusit për të gjitha fushat. Moduli i plotë lidhet me API në një hap të ardhshëm."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-indigo-500/10 bg-panel/80 p-6 shadow-lg lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-200">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-text">Lista e rezervimeve</h2>
              <p className="text-sm text-text-muted">Së shpejti: tabelë me filtra dhe eksport.</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-border/60 bg-bg-light/20 px-4 py-16 text-center">
            <CalendarRange className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-60" />
            <p className="text-sm text-text-muted">
              Endpoint-et e adminit për listimin e të gjitha rezervimeve do të shfaqen këtu.
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-indigo-950/30 to-panel p-5">
            <Sparkles className="mb-2 h-5 w-5 text-indigo-300" />
            <p className="text-sm font-semibold text-text">Çfarë vjen më pas</p>
            <ul className="mt-3 space-y-2 text-xs text-text-muted">
              <li>Filtrim sipas fushës dhe datës</li>
              <li>Ndryshim masiv i statusit</li>
              <li>Audit log për veprime admin</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminBookings;
