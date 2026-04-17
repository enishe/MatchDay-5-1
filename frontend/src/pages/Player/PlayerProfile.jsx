import React from 'react';
import { User, Mail, Phone, CreditCard, Trophy, Edit } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Button from '../../components/UI/Button';
import PageHeader from '../../components/Layout/PageHeader';
import SectionCard from '../../components/Layout/SectionCard';
import Badge from '../../components/UI/Badge';

const PlayerProfile = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const roleLabel =
    user.role === 'admin'
      ? 'Administrator'
      : user.role === 'organizer'
        ? 'Organizator'
        : 'Lojtar';

  const badgeVariant =
    user.role === 'admin' ? 'accent' : user.role === 'organizer' ? 'confirmed' : 'default';

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <PageHeader
        variant="player"
        eyebrow="Profili"
        title="Profili im"
        description="Të dhënat e llogarisë dhe preferencat e lojës. Për ndryshime të thella, kontaktoni mbështetjen."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-panel to-panel-dark/90 p-6 shadow-xl">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-2 ring-primary/20">
              <User className="h-14 w-14 text-primary-light/90" strokeWidth={1.25} />
            </div>
            <h2 className="mt-5 text-center font-heading text-2xl font-bold text-text">{user.name}</h2>
            <p className="text-center text-sm font-medium text-primary-light">@{user.username}</p>
            <div className="mt-4 flex justify-center">
              <Badge variant={badgeVariant}>{roleLabel}</Badge>
            </div>
            <Button variant="outline" size="sm" className="mt-6 w-full">
              <Edit className="mr-2 h-4 w-4" />
              Ndrysho avatar
            </Button>
          </div>
        </aside>

        <div className="space-y-6 lg:col-span-8">
          <SectionCard title="Informacionet personale" icon={User}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Emri i plotë
                </label>
                <input type="text" value={user.name} readOnly className="input-field" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Username Matchday
                </label>
                <input type="text" value={user.username || ''} readOnly className="input-field" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Kontakti" icon={Mail}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Email
                </label>
                <input type="email" value={user.email} readOnly className="input-field" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <Phone className="h-3 w-3" />
                  Telefoni
                </label>
                <input
                  type="tel"
                  value={user.phone_number || '—'}
                  readOnly
                  className="input-field"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pagesat" icon={CreditCard}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Llogaria bankare
            </label>
            <input
              type="text"
              value={user.bank_account || '—'}
              readOnly
              className="input-field"
            />
            <p className="mt-2 text-xs text-text-muted">
              Përdoret për pagesa dhe rimbursime sipas rregullave të platformës.
            </p>
          </SectionCard>

          <SectionCard title="Preferencat e lojës" icon={Trophy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Pozicioni i preferuar
                </label>
                <select className="input-field cursor-pointer">
                  <option>Pa preferencë</option>
                  <option>Portier</option>
                  <option>Mbrojtës</option>
                  <option>Mesfushor</option>
                  <option>Sulmues</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Niveli
                </label>
                <select className="input-field cursor-pointer">
                  <option>Fillues</option>
                  <option>Mesatar</option>
                  <option>I përparuar</option>
                  <option>Profesional</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto">
              Anulo
            </Button>
            <Button variant="primary" className="w-full sm:w-auto">
              Ruaj ndryshimet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
