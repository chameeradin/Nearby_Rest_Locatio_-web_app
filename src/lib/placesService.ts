import type {
  BookingCategory,
  DiscoveredPlace,
  LatLngLiteral,
  PlaceCategory,
  PlacePhotoAttribution,
  PlaceReviewItem,
} from '../types/app';
import { GMP_ATTRIBUTION_ID } from './constants';

const SEARCH_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'priceLevel',
  'businessStatus',
  'regularOpeningHours',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteURI',
  'googleMapsURI',
  'photos',
  'reviews',
  'editorialSummary',
];

function notifyIfQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('429') ||
    msg.includes('Quota')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

export function computeDistanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function formatDistance(meters?: number): string {
  if (meters === undefined) return '';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function inferCategory(place: google.maps.places.Place, requested: PlaceCategory): BookingCategory {
  if (requested !== 'all') return requested;
  const nameLower = (place.displayName || '').toLowerCase();
  const types = place.types || [];
  if (nameLower.includes('cabana') || nameLower.includes('bungalow') || nameLower.includes('villa')) {
    return 'cabana';
  }
  if (types.includes('cafe') || types.includes('coffee_shop') || types.includes('bakery')) {
    return 'cafe';
  }
  if (
    types.includes('lodging') ||
    types.includes('hotel') ||
    types.includes('resort_hotel') ||
    types.includes('motel') ||
    types.includes('bed_and_breakfast')
  ) {
    return 'hotel';
  }
  if (types.includes('restaurant') || types.includes('meal_takeaway')) {
    return 'restaurant';
  }
  return 'hotel';
}

function mapPlaceToDiscovered(
  place: google.maps.places.Place,
  origin: LatLngLiteral,
  requestedCategory: PlaceCategory
): DiscoveredPlace | null {
  if (!place.id || !place.displayName || !place.location) return null;

  const loc: LatLngLiteral = {
    lat: typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat),
    lng: typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng),
  };

  let photoUri: string | undefined;
  let photoAttributions: PlacePhotoAttribution[] = [];
  if (place.photos && place.photos.length > 0) {
    try {
      photoUri = place.photos[0].getURI({ maxWidth: 720, maxHeight: 540 });
      photoAttributions = (place.photos[0].authorAttributions || []).map((a) => ({
        displayName: a.displayName || 'Google Maps Contributor',
        uri: a.uri || undefined,
      }));
    } catch {
      photoUri = undefined;
    }
  }

  const reviews: PlaceReviewItem[] = (place.reviews || []).slice(0, 6).map((rev) => ({
    authorName: rev.authorAttribution?.displayName || 'Google Reviewer',
    authorUri: rev.authorAttribution?.uri || undefined,
    authorPhotoUri: rev.authorAttribution?.photoURI || undefined,
    rating: typeof rev.rating === 'number' ? rev.rating : 0,
    text: rev.text || '',
    relativeTime: rev.relativePublishTimeDescription || '',
  }));

  let isOpenNow: boolean | undefined;
  try {
    if (place.regularOpeningHours && typeof (place as unknown as { isOpen?: () => boolean }).isOpen === 'function') {
      isOpenNow = (place as unknown as { isOpen: () => boolean }).isOpen();
    }
  } catch {
    isOpenNow = undefined;
  }

  const category = inferCategory(place, requestedCategory);

  return {
    id: place.id,
    displayName: place.displayName,
    category,
    primaryTypeLabel: place.primaryTypeDisplayName || category.charAt(0).toUpperCase() + category.slice(1),
    formattedAddress: place.formattedAddress || 'Address available on Google Maps',
    location: loc,
    nationalPhoneNumber: place.nationalPhoneNumber || undefined,
    internationalPhoneNumber: place.internationalPhoneNumber || undefined,
    websiteURI: place.websiteURI || undefined,
    googleMapsURI: place.googleMapsURI || undefined,
    rating: typeof place.rating === 'number' ? place.rating : undefined,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
    priceLevel: place.priceLevel ? String(place.priceLevel) : undefined,
    businessStatus: place.businessStatus ? String(place.businessStatus) : undefined,
    isOpenNow,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions || undefined,
    editorialSummary: place.editorialSummary || undefined,
    photoUri,
    photoAttributions,
    reviews,
    distanceMeters: computeDistanceMeters(origin, loc),
  };
}

export async function searchNearbyBusinesses(params: {
  placesLib: google.maps.PlacesLibrary;
  center: LatLngLiteral;
  radiusMeters: number;
  category: PlaceCategory;
  query?: string;
}): Promise<DiscoveredPlace[]> {
  const { placesLib, center, radiusMeters, category, query } = params;
  const { Place, SearchNearbyRankPreference } = placesLib;
  const clampedRadius = Math.min(Math.max(radiusMeters, 500), 50000);
  const trimmedQuery = (query || '').trim();

  const deduped: Record<string, DiscoveredPlace> = {};

  try {
    if (trimmedQuery.length > 0) {
      const catSuffix =
        category === 'all'
          ? 'hotels restaurants cabanas cafes'
          : category === 'cabana'
            ? 'cabanas resort bungalows'
            : `${category}s`;
      const textRequest = {
        textQuery: `${trimmedQuery} ${catSuffix}`.trim(),
        fields: SEARCH_FIELDS,
        locationBias: {
          center,
          radius: clampedRadius,
        },
        maxResultCount: 16,
        language: 'en-US',
      };
      const res = await Place.searchByText(textRequest as google.maps.places.SearchByTextRequest);
      for (const p of res.places || []) {
        const mapped = mapPlaceToDiscovered(p, center, category);
        if (mapped) deduped[mapped.id] = mapped;
      }
    } else if (category === 'cabana') {
      const textRequest = {
        textQuery: 'cabanas beach resort cottages villas',
        fields: SEARCH_FIELDS,
        locationBias: {
          center,
          radius: clampedRadius,
        },
        maxResultCount: 16,
        language: 'en-US',
      };
      const res = await Place.searchByText(textRequest as google.maps.places.SearchByTextRequest);
      for (const p of res.places || []) {
        const mapped = mapPlaceToDiscovered(p, center, 'cabana');
        if (mapped) deduped[mapped.id] = mapped;
      }
    } else if (category === 'all') {
      const [hotelsRes, diningRes, cafesRes, cabanasRes] = await Promise.allSettled([
        Place.searchNearby({
          fields: SEARCH_FIELDS,
          locationRestriction: { center, radius: clampedRadius },
          includedPrimaryTypes: ['hotel', 'lodging', 'resort_hotel'],
          maxResultCount: 8,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: 'en-US',
        } as google.maps.places.SearchNearbyRequest),
        Place.searchNearby({
          fields: SEARCH_FIELDS,
          locationRestriction: { center, radius: clampedRadius },
          includedPrimaryTypes: ['restaurant'],
          maxResultCount: 8,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: 'en-US',
        } as google.maps.places.SearchNearbyRequest),
        Place.searchNearby({
          fields: SEARCH_FIELDS,
          locationRestriction: { center, radius: clampedRadius },
          includedPrimaryTypes: ['cafe', 'coffee_shop'],
          maxResultCount: 6,
          rankPreference: SearchNearbyRankPreference.POPULARITY,
          language: 'en-US',
        } as google.maps.places.SearchNearbyRequest),
        Place.searchByText({
          textQuery: 'cabanas resort bungalows',
          fields: SEARCH_FIELDS,
          locationBias: { center, radius: clampedRadius },
          maxResultCount: 5,
          language: 'en-US',
        } as google.maps.places.SearchByTextRequest),
      ]);

      const collect = (res: PromiseSettledResult<{ places: google.maps.places.Place[] }>, cat: PlaceCategory) => {
        if (res.status === 'fulfilled') {
          for (const p of res.value.places || []) {
            const mapped = mapPlaceToDiscovered(p, center, cat);
            if (mapped && !deduped[mapped.id]) {
              deduped[mapped.id] = mapped;
            }
          }
        } else {
          notifyIfQuotaError(res.reason);
        }
      };

      collect(hotelsRes, 'hotel');
      collect(diningRes, 'restaurant');
      collect(cafesRes, 'cafe');
      collect(cabanasRes, 'cabana');
    } else {
      const typeMap: Record<Exclude<PlaceCategory, 'all' | 'cabana'>, string[]> = {
        hotel: ['hotel', 'lodging', 'resort_hotel', 'motel', 'bed_and_breakfast'],
        restaurant: ['restaurant'],
        cafe: ['cafe', 'coffee_shop', 'bakery'],
      };
      const res = await Place.searchNearby({
        fields: SEARCH_FIELDS,
        locationRestriction: { center, radius: clampedRadius },
        includedPrimaryTypes: typeMap[category],
        maxResultCount: 18,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
        language: 'en-US',
      } as google.maps.places.SearchNearbyRequest);

      for (const p of res.places || []) {
        const mapped = mapPlaceToDiscovered(p, center, category);
        if (mapped) deduped[mapped.id] = mapped;
      }
    }
  } catch (err) {
    notifyIfQuotaError(err);
    throw err;
  }

  return Object.values(deduped).sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
}

export async function refreshPlaceDetails(
  placesLib: google.maps.PlacesLibrary,
  placeId: string,
  origin: LatLngLiteral,
  category: BookingCategory
): Promise<DiscoveredPlace | null> {
  try {
    const place = new placesLib.Place({ id: placeId, requestedLanguage: 'en' });
    await place.fetchFields({ fields: SEARCH_FIELDS });
    return mapPlaceToDiscovered(place, origin, category);
  } catch (err) {
    notifyIfQuotaError(err);
    return null;
  }
}

export { GMP_ATTRIBUTION_ID };
