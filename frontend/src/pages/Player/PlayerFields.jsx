import React, { useState } from 'react';
import { Search, Filter, MapPin, Clock, Euro, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';

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
      available_slots: ['18:00-19:00', '19:00-20:00', '20:00-21:00'],
      shoe_rental_available: true,
      shoe_rental_price: 2.00
    },
    {
      id: 2,
      name: 'Salla Prizren',
      terrain_type: 'indoor_hall',
      location: 'Prizren, Qendra Sportive',
      price_per_hour: 60.00,
      is_active: true,
      available_slots: ['17:00-18:00', '18:00-19:00', '19:00-20:00'],
      shoe_rental_available: true,
      shoe_rental_price: 2.00
    }
  ];

  const [selectedShoeRental, setSelectedShoeRental] = useState({});
  const [selectedSlot, setSelectedSlot] = useState({});

  const getTerrainIcon = (type) => {
    return type === 'artificial_grass' ? '🏟️' : '🏠';
  };

  const getTerrainLabel = (type) => {
    return type === 'artificial_grass' ? 'Bar Artificial' : 'Sallë Futsali';
  };

  const handleBookField = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    const shoeRental = selectedShoeRental[fieldId];
    const slot = selectedSlot[fieldId];
    
    console.log('Booking field:', fieldId, 'with shoe rental:', shoeRental, 'slot:', slot);
    // TODO: Implement booking logic with shoe rental
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold gradient-text mb-2">
            Zgjidhni Fushën
          </h1>
          <p className="text-text-muted">
            Gjeni dhe rezervoni fushën perfekte për ndeshjen tuaj
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Kërkoni sipas emrit ose lokacionit..."
                className="input-field pl-10"
              />
            </div>

            {/* Terrain Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <select className="input-field pl-10 appearance-none">
                <option value="">Të gjitha terrenet</option>
                <option value="artificial_grass">Bar Artificial</option>
                <option value="indoor_hall">Sallë Futsali</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="date"
                className="input-field pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((field) => (
            <Card key={field.id} hover={true}>
              {/* Field Image Placeholder */}
              <div className="h-48 bg-panel rounded-lg mb-4 flex items-center justify-center">
                <span className="text-6xl">{getTerrainIcon(field.terrain_type)}</span>
              </div>

              {/* Field Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-heading font-bold text-text mb-1">
                    {field.name}
                  </h3>
                  <div className="flex items-center text-text-muted text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {field.location}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="badge-primary">
                    {getTerrainLabel(field.terrain_type)}
                  </span>
                  <div className="flex items-center text-primary font-bold">
                    <Euro className="h-4 w-4 mr-1" />
                    {field.price_per_hour.toFixed(2)}/orë
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <h4 className="text-sm font-medium text-text mb-2">Orare të disponueshme:</h4>
                  <div className="flex flex-wrap gap-2">
                    {field.available_slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(prev => ({ ...prev, [field.id]: slot }))}
                        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                          selectedSlot[field.id] === slot
                            ? 'bg-primary text-white'
                            : 'bg-panel border border-border text-text-muted hover:border-primary'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shoe Rental Option */}
                {field.shoe_rental_available && (
                  <div className="p-3 bg-panel-light rounded-lg border border-border">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedShoeRental[field.id] || false}
                        onChange={(e) => setSelectedShoeRental(prev => ({ ...prev, [field.id]: e.target.checked }))}
                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center text-text font-medium">
                          <span className="mr-2">👟</span>
                          Rezervo patika
                        </div>
                        <div className="text-sm text-text-muted">
                          +{field.shoe_rental_price.toFixed(2)}/lojtar
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Total Price Display */}
                {selectedSlot[field.id] && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Totali:</span>
                      <div className="text-right">
                        <div className="text-primary font-bold text-lg">
                          <Euro className="h-4 w-4 inline mr-1" />
                          {field.price_per_hour.toFixed(2)}
                        </div>
                        {selectedShoeRental[field.id] && (
                          <div className="text-xs text-text-muted">
                            +{field.shoe_rental_price.toFixed(2)} për patika
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleBookField(field.id)}
                  disabled={!selectedSlot[field.id]}
                >
                  {selectedSlot[field.id] ? 'Rezervo tani' : 'Zgjidhni orarin'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {fields.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-xl font-heading font-bold text-text mb-2">
              Nuk u gjetën fusha
            </h3>
            <p className="text-text-muted">
              Provoni të ndryshoni filtrat ose kërkoni një lokacion tjetër
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerFields;
