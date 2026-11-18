import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Compass,
  Crosshair,
  History,
  MapPin,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  DiscoveredPlace,
  LatLngLiteral,
  PlaceCategory,
  SearchHistoryRecord,
} from '../types/app';
import { CATEGORY_LABELS, HERO_IMAGE_URL } from '../lib/constants';
import { PlaceCard } from './PlaceCard';

interface ExploreViewProps {
  center: LatLngLiteral;
  townName: string;
  locationMode: 'gps' | 'manual';
  gpsActive: boolean;
  gpsError: string | null;
  category: PlaceCategory;
  searchQuery: string;
  radiusMeters: number;
  places: DiscoveredPlace[];
  loading: boolean;
  error: string | null;
  searchHistory: SearchHistoryRecord[];
  onCategoryChange: (cat: PlaceCategory) => void;
  onSearchQueryChange: (q: string) => void;
  onRadiusChange: (r: number) => void;
  onEnableGps: () => void;
  onManualLocationSelect: (loc: LatLngLiteral, label: string) => void;
  onExecuteSearch: () => void;
  onSelectPlace: (place: DiscoveredPlace) => void;
  onBookPlace: (place: DiscoveredPlace) => void;
  onOpenMapView: () => void;
  onDeleteHistory: (id: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  center,
  townName,
  locationMode,
  gpsActive,
  gpsError,
  category,
  searchQuery,
  radiusMeters,
  places,
  loading,
  error,
  searchHistory,
  onCategoryChange,
  onSearchQueryChange,
  onRadiusChange,
  onEnableGps,
  onManualLocationSelect,
  onExecuteSearch,
  onSelectPlace,
  onBookPlace,
  onOpenMapView,
  onDeleteHistory,
}) => {
  const placesLib = useMapsLibrary('places');

  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib || !manualInput.trim() || locationMode !== 'manual') {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: manualInput.trim(),
          sessionToken: sessionTokenRef.current,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions || []);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, manualInput, locationMode]);

  const handleSuggestionPick = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!suggestion.placePrediction) return;
    setManualLoading(true);
    setManualError(null);
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      sessionTokenRef.current = null;
      setSuggestions([]);
      if (place.location) {
        const loc = {
          lat: typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat),
          lng: typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng),
        };
        const label = place.displayName || place.formattedAddress || manualInput;
        setManualInput(label);
        onManualLocationSelect(loc, label);
      }
    } catch {
      setManualError('Could not load coordinates for that place.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualGeocodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setManualLoading(true);
    setManualError(null);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(manualInput.trim())}`);
      if (res.status === 429) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setManualError('Google Maps quota exceeded while geocoding.');
        return;
      }
      if (!res.ok) {
        setManualError('Location not found. Try a city, town, or street address.');
        return;
      }
      const data = (await res.json()) as {
        townName: string;
        formattedAddress: string;
        location: LatLngLiteral;
      };
      onManualLocationSelect(data.location, data.townName || data.formattedAddress);
    } catch {
      setManualError('Unable to reach geocoding service.');
    } finally {
      setManualLoading(false);
    }
  };

  const categories: PlaceCategory[] = ['all', 'hotel', 'restaurant', 'cabana', 'cafe'];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900">
        <img
          src={HERO_IMAGE_URL}
          alt="Coastal boutique hotel and waterfront cabanas"
          className="w-full h-64 sm:h-72 object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/65 to-stone-950/30" />
        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end">
          <div className="max-w-2xl space-y-2.5">
            <p className="text-xs font-medium text-teal-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {locationMode === 'gps' ? 'Live GPS Tracking' : 'Manual Town Explore'} ·{' '}
                {townName}
              </span>
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
              Hotels, Restaurants, Cabanas &amp; Cafes in Your Nearest Town
            </h1>
            <p className="text-sm text-stone-200 max-w-xl">
              Live Google Maps discovery with verified guest reviews, direct contact info, and
              instant in-app booking.
            </p>
          </div>
        </div>
      </section>

      {/* Search, Location Mode & Filter Chips Bar */}
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* GPS vs Manual Location Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={onEnableGps}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  locationMode === 'gps'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                Live GPS Location
              </button>
              <button
                type="button"
                onClick={() => {
                  if (locationMode !== 'manual') {
                    onManualLocationSelect(center, townName);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  locationMode === 'manual'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Enter Location Manually
              </button>
            </div>

            <span className="text-xs font-mono text-stone-500 tabular-nums px-2">
              {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              {gpsActive && locationMode === 'gps' ? ' · Live' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-stone-600 whitespace-nowrap">
              Radius:
              <select
                value={radiusMeters}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="ml-2 px-2.5 py-1.5 text-xs font-mono border border-stone-300 rounded-lg bg-white"
              >
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={25000}>25 km</option>
              </select>
            </label>

            <button
              type="button"
              onClick={onOpenMapView}
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Open Full Map Window
            </button>
          </div>
        </div>

        {gpsError && locationMode === 'gps' && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
            {gpsError} You can switch to &ldquo;Enter Location Manually&rdquo; above to search any town.
          </div>
        )}

        {/* Manual Town / Address Entry Input */}
        {locationMode === 'manual' && (
          <form onSubmit={(e) => void handleManualGeocodeSubmit(e)} className="relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter a town, city, or neighborhood (e.g., Galle, Santa Monica, Lisbon)..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <button
                type="submit"
                disabled={manualLoading}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {manualLoading ? 'Locating...' : 'Set Town'}
              </button>
            </div>

            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 z-30 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg divide-y divide-stone-100 max-h-60 overflow-y-auto">
                {suggestions.map((sug, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => void handleSuggestionPick(sug)}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-50 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="truncate">{sug.placePrediction?.text.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {manualError && <p className="text-xs text-rose-700 mt-1.5">{manualError}</p>}
          </form>
        )}

        {/* Keyword Search Bar + Filter Chips (Hotels, Restaurants, Cabanas, Cafes) */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onExecuteSearch();
                }
              }}
              placeholder="Search hotels, seafood restaurants, beach cabanas, espresso cafes..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <button
            type="button"
            onClick={onExecuteSearch}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Search Nearby
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {categories.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        {/* Saved Search History Strip */}
        {searchHistory.length > 0 && (
          <div className="pt-3 border-t border-stone-100 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 shrink-0">
              <History className="w-3.5 h-3.5" />
              Recent:
            </span>
            {searchHistory.slice(0, 6).map((h) => (
              <div
                key={h.id}
                className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-700 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    onCategoryChange(h.category);
                    onSearchQueryChange(h.query);
                    onManualLocationSelect({ lat: h.lat, lng: h.lng }, h.locationLabel);
                  }}
                  className="hover:text-teal-800 font-medium whitespace-nowrap"
                >
                  {h.locationLabel}
                  {h.query ? ` · ${h.query}` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteHistory(h.id)}
                  className="text-stone-400 hover:text-rose-600 p-0.5"
                  aria-label="Remove search history item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Results Header */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-900">
              {CATEGORY_LABELS[category]} near {townName}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
              {loading
                ? 'Fetching live businesses from Google Maps...'
                : `${places.length} live Google Maps locations found within ${(radiusMeters / 1000).toFixed(0)} km`}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-stone-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-stone-200 rounded w-1/3" />
                  <div className="h-5 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-200 rounded w-full" />
                  <div className="h-8 bg-stone-200 rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3">
            <p className="font-display text-lg font-semibold text-stone-900">
              No matching locations found in this radius
            </p>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Try expanding your search radius, clearing the keyword filter, or entering a nearby
              town manually.
            </p>
            <button
              type="button"
              onClick={() => {
                onCategoryChange('all');
                onSearchQueryChange('');
                onRadiusChange(10000);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Reset Filters &amp; Expand to 10 km
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onSelect={onSelectPlace}
                onBook={onBookPlace}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
