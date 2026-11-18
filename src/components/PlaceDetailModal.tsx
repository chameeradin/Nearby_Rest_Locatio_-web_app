import React from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Star,
  X,
} from 'lucide-react';
import type { DiscoveredPlace } from '../types/app';
import { CATEGORY_FALLBACK_IMAGES, CATEGORY_SINGULAR } from '../lib/constants';
import { formatDistance } from '../lib/placesService';

interface PlaceDetailModalProps {
  place: DiscoveredPlace | null;
  onClose: () => void;
  onBook: (place: DiscoveredPlace) => void;
  onViewOnMap: (place: DiscoveredPlace) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onBook,
  onViewOnMap,
}) => {
  if (!place) return null;

  const fallbackImg = CATEGORY_FALLBACK_IMAGES[place.category];
  const imgSrc = place.photoUri || fallbackImg;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Hero Photo */}
        <div className="relative h-56 sm:h-64 bg-stone-100 shrink-0">
          <img
            src={imgSrc}
            alt={place.displayName}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = fallbackImg;
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            aria-label="Close place details"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex items-center gap-2 text-xs text-stone-200">
              <span>{CATEGORY_SINGULAR[place.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{place.primaryTypeLabel}</span>
              {place.distanceMeters !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{formatDistance(place.distanceMeters)} away</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold mt-1 text-balance">{place.displayName}</h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Rating & Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-4">
              {place.rating !== undefined ? (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {place.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    ({place.userRatingCount ?? 0} Google reviews)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-stone-500">No Google ratings yet</span>
              )}

              {place.isOpenNow !== undefined && (
                <span
                  className={`text-xs font-semibold ${
                    place.isOpenNow ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {place.isOpenNow ? 'Open Now' : 'Currently Closed'}
                </span>
              )}
            </div>

            {place.photoAttributions && place.photoAttributions.length > 0 && (
              <div className="text-[11px] text-stone-500">
                Photo:{' '}
                {place.photoAttributions[0].uri ? (
                  <a
                    href={place.photoAttributions[0].uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-stone-800"
                  >
                    {place.photoAttributions[0].displayName}
                  </a>
                ) : (
                  place.photoAttributions[0].displayName
                )}
              </div>
            )}
          </div>

          {place.editorialSummary && (
            <p className="text-sm text-stone-700 leading-relaxed">{place.editorialSummary}</p>
          )}

          {/* Contact Directory */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Contact &amp; Location Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-stone-500">Address</p>
                  <p className="text-stone-900 mt-0.5">{place.formattedAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                <Phone className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-stone-500">Phone Number</p>
                  {place.nationalPhoneNumber || place.internationalPhoneNumber ? (
                    <a
                      href={`tel:${place.internationalPhoneNumber || place.nationalPhoneNumber}`}
                      className="text-teal-800 font-medium hover:underline font-mono text-xs mt-0.5 inline-block"
                    >
                      {place.nationalPhoneNumber || place.internationalPhoneNumber}
                    </a>
                  ) : (
                    <p className="text-stone-500 text-xs mt-0.5">Not published on Google Maps</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                <Globe className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stone-500">Official Website</p>
                  {place.websiteURI ? (
                    <a
                      href={place.websiteURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-800 font-medium hover:underline text-xs mt-0.5 inline-flex items-center gap-1 truncate max-w-full"
                    >
                      <span className="truncate">{place.websiteURI.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-stone-500 text-xs mt-0.5">No website listed</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                <Mail className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-stone-500">Direct Inquiry &amp; Email</p>
                  <p className="text-stone-600 text-xs mt-0.5">
                    {place.websiteURI
                      ? 'Contact via official website or submit an in-app reservation.'
                      : 'Google Maps does not publish direct email addresses; use Phone or In-App Booking.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          {place.weekdayDescriptions && place.weekdayDescriptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Opening Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg p-3">
                {place.weekdayDescriptions.map((line, i) => (
                  <p key={i} className="tabular-nums">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Real Google Maps User Reviews */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Google Maps User Reviews
              </h3>
              {place.googleMapsURI && (
                <a
                  href={place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-teal-800 hover:underline inline-flex items-center gap-1"
                >
                  Open on Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {place.reviews.length === 0 ? (
              <p className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-lg p-4">
                No detailed written reviews returned by Google Maps for this location yet.
              </p>
            ) : (
              <div className="space-y-3">
                {place.reviews.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-stone-200 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {rev.authorPhotoUri ? (
                          <img
                            src={rev.authorPhotoUri}
                            alt={rev.authorName}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : null}
                        {rev.authorUri ? (
                          <a
                            href={rev.authorUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-stone-900 hover:underline"
                          >
                            {rev.authorName}
                          </a>
                        ) : (
                          <span className="text-xs font-semibold text-stone-900">
                            {rev.authorName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-1 font-semibold text-stone-900 tabular-nums">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          {rev.rating.toFixed(1)}
                        </span>
                        {rev.relativeTime && <span>· {rev.relativeTime}</span>}
                      </div>
                    </div>
                    {rev.text && <p className="text-sm text-stone-700 leading-relaxed">{rev.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewOnMap(place);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Navigation className="w-4 h-4 text-teal-700" />
              Show on Live Map
            </button>
            {place.googleMapsURI && (
              <a
                href={place.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Directions
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => onBook(place)}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};
