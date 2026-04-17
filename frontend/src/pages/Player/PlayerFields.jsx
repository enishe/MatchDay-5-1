import React, { useState } from 'react';
import { Search, Filter, MapPin, Clock, Euro, Sparkles } from 'lucide-react';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/Layout/EmptyState';

const PlayerFields = () => {
  const fields = [
    {
      id: 1,
      name: 'Fusha Prishtina 1',
      terrain_type: 'artificial_grass',
      location: 'Prishtinë, Rruga Agim Ramadani',
      price_per_hour: 60.0,
      is_active: true,
      available_slots: ['18:00-19:00', '19:00-20:00', '20:00-21:00'],
      shoe_rental_available: true,
      shoe_rental_price: 2.0,
    },
    {
      id: 2,
      name: 'Salla Prizren',
      terrain_type: 'indoor_hall',
      location: 'Prizren, Qendra Sportive',
      price_per_hour: 60.0,
      is_active: true,
      available_slots: ['17:00-18:00', '18:00-19:00', '19:00-20:00'],
      shoe_rental_available: true,
      shoe_rental_price: 2.0,
    },
  ];

  const [selectedShoeRental, setSelectedShoeRental] = useState({});
  const [selectedSlot, setSelectedSlot] = useState({});

  const getTerrainLabel = (type) =>
    type === 'artificial_grass' ? 'Bar artificial' : 'Sallë futsali';

  const handleBookField = (fieldId) => {
    const field = fields.find((f) => f.id === fieldId);
    const shoeRental = selectedShoeRental[fieldId];
    const slot = selectedSlot[fieldId];
    console.log('Booking field:', fieldId, shoeRental, slot);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <PageHeader
        variant="player"
        eyebrow="Rezervime"
        title="Zgjidhni fushën"
        description="Kërkoni sipas lokacionit, filtroni terrenin dhe zgjidhni orarin që përshtatet me grupin tuaj."
      />

      <Card className="mb-8 border-emerald-500/15 bg-gradient-to-br from-panel to-panel-light/80 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Emër ose lokacion…"
              className="input-field w-full pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <select className="input-field w-full cursor-pointer appearance-none pl-10 pr-8">
              <option value="">Të gjitha terrenet</option>
              <option value="artificial_grass">Bar artificial</option>
              <option value="indoor_hall">Sallë futsali</option>
            </select>
          </div>
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input type="date" className="input-field w-full pl-10" />
          </div>
        </div>
      </Card>

      {fields.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nuk u gjetën fusha"
          description="Provoni të ndryshoni filtrat ose kërkoni një lokacion tjetër."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <article
              key={field.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-panel/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-primary/35 hover:shadow-primary/5"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-950/80 via-panel-dark to-bg">
                <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_30%_20%,theme(colors.primary.DEFAULT),transparent_55%)]" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <span className="rounded-lg bg-bg/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted backdrop-blur-sm">
                    {getTerrainLabel(field.terrain_type)}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1 text-sm font-bold text-primary-light backdrop-blur-sm">
                    <Euro className="h-3.5 w-3.5" />
                    {field.price_per_hour.toFixed(0)}
                    <span className="text-xs font-medium text-text-muted">/orë</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="font-heading text-xl font-bold text-text">{field.name}</h3>
                <div className="mt-1.5 flex items-start gap-1.5 text-sm text-text-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <span>{field.location}</span>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Orari
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {field.available_slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setSelectedSlot((prev) => ({ ...prev, [field.id]: slot }))
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          selectedSlot[field.id] === slot
                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
                            : 'border-border/80 bg-bg-light/40 text-text-muted hover:border-primary/40 hover:text-text'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {field.shoe_rental_available && (
                  <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-bg-light/30 p-3 transition-colors hover:border-primary/30">
                    <input
                      type="checkbox"
                      checked={selectedShoeRental[field.id] || false}
                      onChange={(e) =>
                        setSelectedShoeRental((prev) => ({
                          ...prev,
                          [field.id]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">Patika me qira</p>
                      <p className="text-xs text-text-muted">
                        +€{field.shoe_rental_price.toFixed(2)} për lojtar
                      </p>
                    </div>
                  </label>
                )}

                {selectedSlot[field.id] && (
                  <div className="mt-4 rounded-xl border border-primary/25 bg-primary/10 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Totali i orës</span>
                      <span className="font-heading text-lg font-bold text-primary-light">
                        €{field.price_per_hour.toFixed(2)}
                      </span>
                    </div>
                    {selectedShoeRental[field.id] && (
                      <p className="mt-1 text-xs text-text-muted">
                        Patika: +€{field.shoe_rental_price.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-5">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleBookField(field.id)}
                    disabled={!selectedSlot[field.id]}
                  >
                    {selectedSlot[field.id] ? 'Rezervo tani' : 'Zgjidh orarin'}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerFields;
