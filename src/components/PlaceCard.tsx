import React from 'react';
import { Calendar, MapPin, Phone, Star } from 'lucide-react';
import type { DiscoveredPlace } from '../types/app';
import { CATEGORY_FALLBACK_IMAGES, CATEGORY_SINGULAR } from '../lib/constants';
import { formatDistance } from '../lib/placesService';

interface PlaceCardProps {
  place: DiscoveredPlace;
  onSelect: (place: DiscoveredPlace) => void;
  onBook: (place: DiscoveredPlace) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onSelect, onBook }) => {
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[place.category];
  const imgSrc = place.photoUri || fallbackImg;
  const topReview = place.reviews[0];

  return (
    <article className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col hover:border-stone-300 transition-colors">
      <button
        type="button"
        onClick={() => onSelect(place)}
        className="relative aspect-[4/3] w-full bg-stone-100 overflow-hidden text-left group"
      >
        <img
          src={imgSrc}
          alt={place.displayName}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = fallbackImg;
          }}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />
        {place.photoAttributions && place.photoAttributions.length > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] text-white/90 bg-black/55 rounded">
            Photo: {place.photoAttributions[0].displayName}
          </span>
        )}
      </button>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          {/* Clean unboxed metadata row (zero pills) */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-stone-500">
            <span className="font-medium text-teal-800">{CATEGORY_SINGULAR[place.category]}</span>
            {place.distanceMeters !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatDistance(place.distanceMeters)}</span>
              </>
            )}
            {place.isOpenNow !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className={place.isOpenNow ? 'text-emerald-700 font-medium' : 'text-rose-700'}>
                  {place.isOpenNow ? 'Open now' : 'Closed'}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelect(place)}
            className="text-left block w-full group"
          >
            <h3 className="font-display text-base font-semibold text-stone-900 group-hover:text-teal-800 transition-colors line-clamp-1">
              {place.displayName}
            </h3>
          </button>

          {place.rating !== undefined && (
            <div className="flex items-center gap-1.5 text-xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span className="font-semibold text-stone-900 tabular-nums">
                {place.rating.toFixed(1)}
              </span>
              <span className="text-stone-500 tabular-nums">
                ({place.userRatingCount ?? 0} reviews)
              </span>
            </div>
          )}

          <div className="space-y-1 pt-1 text-xs text-stone-600">
            <p className="flex items-start gap-1.5 line-clamp-2">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>{place.formattedAddress}</span>
            </p>
            {(place.nationalPhoneNumber || place.internationalPhoneNumber) && (
              <p className="flex items-center gap-1.5 font-mono text-[11px] text-stone-700">
                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{place.nationalPhoneNumber || place.internationalPhoneNumber}</span>
              </p>
            )}
          </div>

          {topReview?.text && (
            <p className="text-xs text-stone-500 italic line-clamp-2 pt-1.5 border-t border-stone-100">
              &ldquo;{topReview.text}&rdquo;
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => onSelect(place)}
            className="flex-1 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Reviews &amp; Contact
          </button>
          <button
            type="button"
            onClick={() => onBook(place)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5" />
            Book Now
          </button>
        </div>
      </div>
    </article>
  );
};
