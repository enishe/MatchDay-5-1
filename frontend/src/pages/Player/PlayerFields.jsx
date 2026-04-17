import React from 'react';
import { Search, Filter, MapPin, Clock, Euro } from 'lucide-react';

const PlayerFields = () => {
  // Mock data for fields
  const fields = [
    {
      id: 1,
      name: 'Fusha Prishtina 1',
      terrain_type: 'artificial_grass',
      location: 'Prishtinë, Rruga Agim Ramadani',
      price_per_hour: 60.00,
      is_active: true,
      available_slots: ['18:00-19:00', '19:00-20:00', '20:00-21:00']
    },
    {
      id: 2,
      name: 'Salla Prizren',
      terrain_type: 'indoor_hall',
      location: 'Prizren, Qendra Sportive',
      price_per_hour: 60.00,
      is_active: true,
      available_slots: ['17:00-18:00', '18:00-19:00', '19:00-20:00']
    }
  ];

  const getTerrainIcon = (type) => {
    return type === 'artificial_grass' ? '🏟️' : '🏠';
  };

  const getTerrainLabel = (type) => {
    return type === 'artificial_grass' ? 'Bar Artificial' : 'Sallë Futsali';
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-text mb-2">
            Zgjidhni Fushën
          </h1>
          <p className="text-text/70">
            Gjeni dhe rezervoni fushën perfekte për ndeshjen tuaj
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
              <input
                type="text"
                placeholder="Kërkoni sipas emrit ose lokacionit..."
                className="input-field pl-10"
              />
            </div>

            {/* Terrain Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
              <select className="input-field pl-10 appearance-none">
                <option value="">Të gjitha terrenet</option>
                <option value="artificial_grass">Bar Artificial</option>
                <option value="indoor_hall">Sallë Futsali</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
              <input
                type="date"
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((field) => (
            <div key={field.id} className="card-hover cursor-pointer">
              {/* Field Image Placeholder */}
              <div className="h-48 bg-bg rounded-lg mb-4 flex items-center justify-center">
                <span className="text-6xl">{getTerrainIcon(field.terrain_type)}</span>
              </div>

              {/* Field Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-heading font-bold text-text mb-1">
                    {field.name}
                  </h3>
                  <div className="flex items-center text-text/70 text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {field.location}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="badge-confirmed">
                    {getTerrainLabel(field.terrain_type)}
                  </span>
                  <div className="flex items-center text-accent font-bold">
                    <Euro className="h-4 w-4 mr-1" />
                    {field.price_per_hour.toFixed(2)}/orë
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <h4 className="text-sm font-medium text-text mb-2">Orare të disponueshme:</h4>
                  <div className="flex flex-wrap gap-2">
                    {field.available_slots.map((slot, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/50 text-text text-xs rounded-md"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button className="btn-primary w-full">
                  Rezervo tani
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {fields.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-xl font-heading font-bold text-text mb-2">
              Nuk u gjetën fusha
            </h3>
            <p className="text-text/70">
              Provoni të ndryshoni filtrat ose kërkoni një lokacion tjetër
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerFields;
