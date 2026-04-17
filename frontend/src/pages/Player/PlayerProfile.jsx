import React from 'react';
import { User, Mail, Phone, CreditCard, Trophy, Edit } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const PlayerProfile = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-text mb-2">
            Profili Im
          </h1>
          <p className="text-text/70">
            Menaxhoni informacionet tuaja personale
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card text-center">
              {/* Avatar */}
              <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="h-12 w-12 text-text/50" />
              </div>
              
              <h2 className="text-xl font-heading font-bold text-text mb-1">
                {user.name}
              </h2>
              <p className="text-accent font-medium mb-4">
                @{user.username}
              </p>
              
              <div className="text-sm text-text/70">
                <span className="badge-confirmed">
                  {user.role === 'admin' ? 'Administrator' : 
                   user.role === 'organizer' ? 'Organizator' : 'Lojtar'}
                </span>
              </div>

              <button className="btn-outline w-full mt-6 flex items-center justify-center">
                <Edit className="h-4 w-4 mr-2" />
                Ndrysho Avatar
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="card">
              <h3 className="text-lg font-heading font-bold text-text mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-accent" />
                Informacionet Personale
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Emri i plotë
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    className="input-field"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Username Matchday
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    className="input-field"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h3 className="text-lg font-heading font-bold text-text mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-accent" />
                Informacionet e Kontaktit
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    className="input-field"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Numri i telefonit
                  </label>
                  <input
                    type="tel"
                    value={user.phone_number}
                    className="input-field"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="card">
              <h3 className="text-lg font-heading font-bold text-text mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-accent" />
                Informacionet e Pagesave
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-text/70 mb-1">
                  Numri i llogarisë bankare
                </label>
                <input
                  type="text"
                  value={user.bank_account}
                  className="input-field"
                  readOnly
                />
                <p className="text-xs text-text/50 mt-1">
                  Përdoret për pagesa dhe rimbursime
                </p>
              </div>
            </div>

            {/* Game Preferences */}
            <div className="card">
              <h3 className="text-lg font-heading font-bold text-text mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-accent" />
                Preferencat e Lojës
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Pozicioni i preferuar
                  </label>
                  <select className="input-field">
                    <option>Pa preferencë</option>
                    <option>Portier</option>
                    <option>Mbrojtës</option>
                    <option>Mesfushor</option>
                    <option> sulmues</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text/70 mb-1">
                    Niveli i lojës
                  </label>
                  <select className="input-field">
                    <option>Fillues</option>
                    <option>Mesatar</option>
                    <option>E përparuar</option>
                    <option>Profesional</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button className="btn-primary">
                Ruaj Ndryshimet
              </button>
              <button className="btn-outline">
                Anullo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
