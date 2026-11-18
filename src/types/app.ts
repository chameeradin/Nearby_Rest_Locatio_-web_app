export type PlaceCategory = 'all' | 'hotel' | 'restaurant' | 'cabana' | 'cafe';

export type BookingCategory = 'hotel' | 'restaurant' | 'cabana' | 'cafe';

export type AppView = 'explore' | 'map' | 'bookings' | 'settings' | 'admin';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface PlaceReviewItem {
  authorName: string;
  authorUri?: string;
  authorPhotoUri?: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface PlacePhotoAttribution {
  displayName: string;
  uri?: string;
}

export interface DiscoveredPlace {
  id: string;
  displayName: string;
  category: BookingCategory;
  primaryTypeLabel: string;
  formattedAddress: string;
  location: LatLngLiteral;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteURI?: string;
  googleMapsURI?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
  isOpenNow?: boolean;
  weekdayDescriptions?: string[];
  editorialSummary?: string;
  photoUri?: string;
  photoAttributions?: PlacePhotoAttribution[];
  reviews: PlaceReviewItem[];
  distanceMeters?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  notificationsEnabled: boolean;
  promoAlertsEnabled: boolean;
  preferredCategory?: PlaceCategory;
  searchRadiusMeters?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastLoginAt?: unknown;
}

export interface BookingRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  placePhone?: string;
  category: BookingCategory;
  checkInDate: string;
  checkOutDate?: string;
  timeSlot?: string;
  guests: number;
  roomOrServiceType: string;
  totalAmount?: number;
  currency?: string;
  paymentMethod: 'booking_com_checkout' | 'pay_at_property' | 'card_reservation';
  bookingSource: 'booking_com_api' | 'in_app_request';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  locationLabel: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  mode: 'gps' | 'manual';
  resultCount: number;
  createdAt?: unknown;
}

export interface ActivityLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  category: 'auth' | 'search' | 'booking' | 'admin' | 'notification';
  createdAt?: unknown;
}

export interface PromotionRecord {
  id: string;
  title: string;
  description: string;
  category: PlaceCategory;
  discountLabel: string;
  validUntil: string;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'appointment' | 'promotion' | 'system';
  createdAt: string;
  read: boolean;
}
