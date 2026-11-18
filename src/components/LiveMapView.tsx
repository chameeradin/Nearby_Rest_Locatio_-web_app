import React, { useCallback, useEffect, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Calendar, Crosshair, ExternalLink, MapPin, Phone, RefreshCw, Star } from 'lucide-react';
import type { DiscoveredPlace, LatLngLiteral, PlaceCategory } from '../types/app';
import {
  CATEGORY_LABELS,
  CATEGORY_PIN_COLORS,
  CATEGORY_SINGULAR,
  GMP_ATTRIBUTION_ID,
} from '../lib/constants';
import { formatDistance } from '../lib/placesService';

interface MarkerItemProps {
  place: DiscoveredPlace;
  isSelected: boolean;
  isHovered: boolean;
  zIndex: number;
  onMarkerClick: (place: DiscoveredPlace, marker: google.maps.marker.AdvancedMarkerElement) => void;
  onHover: (id: string | null) => void;
}

const PlaceAdvancedMarker: React.FC<MarkerItemProps> = ({
  place,
  isSelected,
  isHovered,
  zIndex,
  onMarkerClick,
  onHover,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const colors = CATEGORY_PIN_COLORS[place.category];

  return (
    <AdvancedMarker
      ref={markerRef}
      position={place.location}
      title={place.displayName}
      zIndex={zIndex}
      onClick={() => {
        if (marker) onMarkerClick(place, marker);
      }}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
    >
      <Pin
        background={isSelected ? '#111827' : colors.bg}
        borderColor={isSelected ? '#0F766E' : colors.border}
        glyphColor={colors.glyph}
        scale={isSelected || isHovered ? 1.2 : 1.0}
      />
    </AdvancedMarker>
  );
};

interface LiveMapViewProps {
  center: LatLngLiteral;
  userGpsPosition: LatLngLiteral | null;
  gpsAccuracyMeters: number | null;
  townName: string;
  places: DiscoveredPlace[];
  category: PlaceCategory;
  loading: boolean;
  initialSelectedPlaceId?: string | null;
  onCategoryChange: (cat: PlaceCategory) => void;
  onSearchArea: (newCenter: LatLngLiteral) => void;
  onRecenterGps: () => void;
  onSelectDetails: (place: DiscoveredPlace) => void;
  onBookPlace: (place: DiscoveredPlace) => void;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  center,
  userGpsPosition,
  gpsAccuracyMeters,
  townName,
  places,
  category,
  loading,
  initialSelectedPlaceId,
  onCategoryChange,
  onSearchArea,
  onRecenterGps,
  onSelectDetails,
  onBookPlace,
}) => {
  const map = useMap('nearby-live-map');

  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(null);
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedPlaceId) {
      const found = places.find((p) => p.id === initialSelectedPlaceId);
      if (found) {
        setSelectedPlace(found);
        map?.panTo(found.location);
        map?.setZoom(15);
      }
    }
  }, [initialSelectedPlaceId, places, map]);

  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [center, map]);

  const handleMarkerClick = useCallback(
    (place: DiscoveredPlace, marker: google.maps.marker.AdvancedMarkerElement) => {
      setSelectedPlace(place);
      setSelectedMarker(marker);
      map?.panTo(place.location);
    },
    [map]
  );

  const handleSearchCurrentCenter = () => {
    if (!map) return;
    const c = map.getCenter();
    if (c) {
      onSearchArea({ lat: c.lat(), lng: c.lng() });
    }
  };

  // Sort by descending latitude so southern markers render cleanly in front
  const sortedPlaces = [...places].sort((a, b) => b.location.lat - a.location.lat);
  const categories: PlaceCategory[] = ['all', 'hotel', 'restaurant', 'cabana', 'cafe'];

  return (
    <div className="space-y-4 pb-8">
      {/* Map Controls Strip */}
      <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {userGpsPosition && (
            <span className="font-mono text-stone-600 tabular-nums">
              GPS: {userGpsPosition.lat.toFixed(5)}, {userGpsPosition.lng.toFixed(5)}
              {gpsAccuracyMeters ? ` (±${Math.round(gpsAccuracyMeters)}m)` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={onRecenterGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Recenter GPS
          </button>
          <button
            type="button"
            onClick={handleSearchCurrentCenter}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Search This Area
          </button>
        </div>
      </div>

      {/* Split Map + Synchronized Business List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Interactive Google Map Canvas (CF2 explicit height, CF9 mapId, mandatory attribution ID) */}
        <div className="lg:col-span-8 h-[460px] sm:h-[560px] lg:h-[640px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative">
          <GoogleMap
            id="nearby-live-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={center}
            defaultZoom={14}
            gestureHandling="greedy"
            internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Real-Time GPS User Marker */}
            {userGpsPosition && (
              <AdvancedMarker position={userGpsPosition} title="Your Real-Time GPS Location" zIndex={1200}>
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-7 h-7 rounded-full bg-sky-500/30 animate-ping" />
                  <span className="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md" />
                </div>
              </AdvancedMarker>
            )}

            {/* All Discovered Google Map Business Pins */}
            {sortedPlaces.map((place, index) => {
              const isSelected = selectedPlace?.id === place.id;
              const isHovered = hoveredId === place.id;
              const zIndex = isSelected ? 1000 : isHovered ? 999 : index;

              return (
                <PlaceAdvancedMarker
                  key={place.id}
                  place={place}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  zIndex={zIndex}
                  onMarkerClick={handleMarkerClick}
                  onHover={setHoveredId}
                />
              );
            })}

            {selectedPlace && (
              <InfoWindow
                anchor={selectedMarker || undefined}
                position={selectedMarker ? undefined : selectedPlace.location}
                onCloseClick={() => {
                  setSelectedPlace(null);
                  setSelectedMarker(null);
                }}
              >
                <div className="max-w-[260px] p-1 space-y-2 text-stone-900">
                  <div>
                    <p className="text-[11px] font-semibold text-teal-800">
                      {CATEGORY_SINGULAR[selectedPlace.category]}
                      {selectedPlace.distanceMeters !== undefined
                        ? ` · ${formatDistance(selectedPlace.distanceMeters)}`
                        : ''}
                    </p>
                    <h4 className="font-display text-sm font-bold leading-snug">
                      {selectedPlace.displayName}
                    </h4>
                  </div>

                  {selectedPlace.rating !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold tabular-nums">
                        {selectedPlace.rating.toFixed(1)}
                      </span>
                      <span className="text-stone-500 tabular-nums">
                        ({selectedPlace.userRatingCount ?? 0})
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-stone-600">{selectedPlace.formattedAddress}</p>

                  {selectedPlace.nationalPhoneNumber && (
                    <p className="text-xs font-mono text-stone-800">
                      {selectedPlace.nationalPhoneNumber}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectDetails(selectedPlace)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 rounded-md"
                    >
                      Reviews
                    </button>
                    <button
                      type="button"
                      onClick={() => onBookPlace(selectedPlace)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md"
                    >
                      Book
                    </button>
                    {selectedPlace.googleMapsURI && (
                      <a
                        href={selectedPlace.googleMapsURI}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-teal-800 hover:bg-teal-50 rounded-md"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        {/* Side Results List Synchronized with Map */}
        <aside className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl flex flex-col max-h-[560px] lg:max-h-[640px] overflow-hidden">
          <div className="px-4 py-3.5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-stone-900">
                Google Map Places · {townName}
              </h3>
              <p className="text-xs text-stone-500 tabular-nums">
                {places.length} locations plotted
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {places.length === 0 ? (
              <div className="p-6 text-center text-sm text-stone-500">
                No locations plotted yet. Pan the map and click &ldquo;Search This Area&rdquo;.
              </div>
            ) : (
              places.map((p) => {
                const active = selectedPlace?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`p-3.5 transition-colors ${
                      active ? 'bg-teal-50/70' : 'hover:bg-stone-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlace(p);
                        setSelectedMarker(null);
                        map?.panTo(p.location);
                        map?.setZoom(16);
                      }}
                      className="w-full text-left space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                        <span className="font-semibold text-teal-800">
                          {CATEGORY_SINGULAR[p.category]}
                        </span>
                        {p.distanceMeters !== undefined && (
                          <span className="tabular-nums">{formatDistance(p.distanceMeters)}</span>
                        )}
                      </div>
                      <p className="font-display text-sm font-semibold text-stone-900 line-clamp-1">
                        {p.displayName}
                      </p>
                      <p className="text-xs text-stone-600 line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{p.formattedAddress}</span>
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        {p.rating !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-xs text-stone-800 tabular-nums">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {p.rating.toFixed(1)} ({p.userRatingCount ?? 0})
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400">No ratings</span>
                        )}
                        {p.nationalPhoneNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600">
                            <Phone className="w-3 h-3" />
                            {p.nationalPhoneNumber}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectDetails(p)}
                        className="flex-1 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onBookPlace(p)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md"
                      >
                        <Calendar className="w-3 h-3" />
                        Book
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
