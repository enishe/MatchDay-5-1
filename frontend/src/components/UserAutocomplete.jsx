import React, { useState, useEffect } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import { getApiBase, parseResponseJson } from '../lib/api';

function userLabel(u) {
  if (!u) return '';
  if (u.name) return u.name;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.email || `ID ${u.id}`;
}

const UserAutocomplete = ({ onUserSelect, selectedUsers = [], maxUsers = 12 }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('matchday_token');
        const response = await fetch(`${getApiBase()}/search-users?q=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await parseResponseJson(response);
          const list = Array.isArray(data) ? data : [];
          const filtered = list.filter(
            (user) => !selectedUsers.some((selected) => selected.id === user.id)
          );
          setSuggestions(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, selectedUsers]);

  const handleSelectUser = (user) => {
    if (selectedUsers.length >= maxUsers) {
      alert(`Mund të ftoni maksimum ${maxUsers} lojtarë`);
      return;
    }
    onUserSelect(user);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveUser = (userId) => {
    onUserSelect(null, userId);
  };

  return (
    <div className="relative">
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-primary text-text px-3 py-1.5 rounded-full text-sm"
            >
              <span className="font-medium">{userLabel(user)}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                className="hover:text-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <span className="text-text/70 text-sm self-center">
            {selectedUsers.length}/{maxUsers}
          </span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="Kërko sipas username..."
          disabled={selectedUsers.length >= maxUsers}
          className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-panel border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-3 text-left hover:bg-primary/50 transition-colors flex items-center gap-3"
            >
              <div className="flex-1">
                <div className="font-medium text-text">{userLabel(user)}</div>
                <div className="text-sm text-text/70">{user.email || ''}</div>
              </div>
              <UserPlus className="h-4 w-4 text-accent" />
            </button>
          ))}
        </div>
      )}

      {showSuggestions && query.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-2 bg-panel border border-border rounded-md shadow-lg px-4 py-3 text-text/70 text-sm">
          Nuk u gjet asnjë përdorues
        </div>
      )}
    </div>
  );
};

export default UserAutocomplete;
