import type { BookingCategory, PlaceCategory } from '../types/app';

export const APP_NAME = 'Nearby Rest Locations';
export const DEVELOPER_NAME = 'Waves IT';
export const ADMIN_BOOTSTRAP_EMAIL = 'chameeragamage2020@gmail.com';
export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export const HERO_IMAGE_URL = '/src/assets/images/hero_coastal_retreat_1795005381384.jpg';

export const CATEGORY_FALLBACK_IMAGES: Record<BookingCategory, string> = {
  hotel: '/src/assets/images/fallback_hotel_suite_1795005382041.jpg',
  restaurant: '/src/assets/images/fallback_restaurant_dining_1795005382083.jpg',
  cabana: '/src/assets/images/fallback_cabana_lounge_1795005382374.jpg',
  cafe: '/src/assets/images/fallback_cafe_espresso_1795005383826.jpg',
};

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  all: 'All Places',
  hotel: 'Hotels',
  restaurant: 'Restaurants',
  cabana: 'Cabanas',
  cafe: 'Cafes',
};

export const CATEGORY_SINGULAR: Record<BookingCategory, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  cabana: 'Cabana',
  cafe: 'Cafe',
};

export const CATEGORY_PIN_COLORS: Record<BookingCategory, { bg: string; border: string; glyph: string }> = {
  hotel: { bg: '#0F766E', border: '#115E59', glyph: '#FFFFFF' },
  restaurant: { bg: '#B45309', border: '#92400E', glyph: '#FFFFFF' },
  cabana: { bg: '#0369A1', border: '#075985', glyph: '#FFFFFF' },
  cafe: { bg: '#6D28D9', border: '#5B21B6', glyph: '#FFFFFF' },
};

// Blueprint-synchronized volumetric limits
export const FIELD_LIMITS = {
  displayNameMax: 120,
  emailMax: 254,
  phoneMax: 40,
  queryMax: 200,
  locationLabelMax: 200,
  placeNameMax: 200,
  placeAddressMax: 400,
  notesMax: 500,
  roomTypeMax: 160,
  actionMax: 100,
  detailsMax: 400,
};

export function sanitizeStr(val: string | undefined | null, maxLen: number): string {
  if (!val) return '';
  return val.trim().slice(0, maxLen);
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
}
