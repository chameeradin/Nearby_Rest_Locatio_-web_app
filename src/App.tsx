import React, { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth';
import { Bell, Mail, X } from 'lucide-react';
import type {
  AppView,
  BookingRecord,
  DiscoveredPlace,
  LatLngLiteral,
  PlaceCategory,
  PromotionRecord,
  PushNotificationItem,
  SearchHistoryRecord,
  UserProfile,
} from './types/app';
import { ADMIN_BOOTSTRAP_EMAIL, APP_NAME, DEVELOPER_NAME } from './lib/constants';
import { auth } from './lib/firebase';
import {
  deleteSearchHistoryRecord,
  ensureUserProfile,
  logActivity,
  saveSearchHistoryRecord,
  subscribeActivePromotions,
  subscribeSearchHistory,
  subscribeUserBookings,
} from './lib/firestoreService';
import { searchNearbyBusinesses } from './lib/placesService';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { BookingsView } from './components/BookingsView';
import { ExploreView } from './components/ExploreView';
import { Header } from './components/Header';
import { LiveMapView } from './components/LiveMapView';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { SettingsView } from './components/SettingsView';

const DEFAULT_FALLBACK_CENTER: LatLngLiteral = { lat: 34.0195, lng: -118.4912 }; // Santa Monica fallback until GPS resolves

interface AppWorkspaceProps {
  mapsReady: boolean;
}

const AppWorkspace: React.FC<AppWorkspaceProps> = ({ mapsReady }) => {
  const placesLib = useMapsLibrary('places');

  const [activeView, setActiveView] = useState<AppView>('explore');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Auth & Profile state
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Location & Discovery state
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [center, setCenter] = useState<LatLngLiteral>(DEFAULT_FALLBACK_CENTER);
  const [userGpsPosition, setUserGpsPosition] = useState<LatLngLiteral | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [townName, setTownName] = useState('Detecting nearest town...');

  const [category, setCategory] = useState<PlaceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Modals & Map Focus
  const [detailPlace, setDetailPlace] = useState<DiscoveredPlace | null>(null);
  const [bookingPlace, setBookingPlace] = useState<DiscoveredPlace | null>(null);
  const [mapFocusPlaceId, setMapFocusPlaceId] = useState<string | null>(null);

  // Firestore Collections
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRecord[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);

  // Push Notifications & Toast Banner
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<PushNotificationItem | null>(null);

  const lastReverseGeocodeRef = useRef<string>('');
  const notifiedBookingIdsRef = useRef<Record<string, boolean>>({});
  const notifiedPromoIdsRef = useRef<Record<string, boolean>>({});

  const pushNotification = useCallback(
    (title: string, body: string, type: PushNotificationItem['type']) => {
      const item: PushNotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        type,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 25));
      setActiveToast(item);

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        (userProfile?.notificationsEnabled ?? true)
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Ignore browser Notification exceptions in restricted iframes
        }
      }
    },
    [userProfile?.notificationsEnabled]
  );

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const t = setTimeout(() => setActiveToast(null), 6000);
    return () => clearTimeout(t);
  }, [activeToast]);

  // Firebase Auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const profile = await ensureUserProfile(nextUser);
          setUserProfile(profile);
          if (profile.preferredCategory) setCategory(profile.preferredCategory);
          if (profile.searchRadiusMeters) setRadiusMeters(profile.searchRadiusMeters);
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      } else {
        setUserProfile(null);
        setBookings([]);
        setSearchHistory([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore real-time listeners (only when auth ready)
  useEffect(() => {
    if (!authReady) return;
    const unsubPromos = subscribeActivePromotions((items) => {
      setPromotions(items);
      if (userProfile?.promoAlertsEnabled !== false) {
        for (const promo of items) {
          if (!notifiedPromoIdsRef.current[promo.id]) {
            notifiedPromoIdsRef.current[promo.id] = true;
            pushNotification(
              `Offer: ${promo.discountLabel} — ${promo.title}`,
              promo.description,
              'promotion'
            );
          }
        }
      }
    });

    if (!user) {
      return () => {
        unsubPromos();
      };
    }

    const unsubBookings = subscribeUserBookings(user.uid, (items) => {
      setBookings(items);
      const todayStr = new Date().toISOString().split('T')[0];
      for (const b of items) {
        if (
          (b.status === 'pending' || b.status === 'confirmed') &&
          b.checkInDate >= todayStr &&
          !notifiedBookingIdsRef.current[b.id]
        ) {
          notifiedBookingIdsRef.current[b.id] = true;
          if (userProfile?.notificationsEnabled !== false) {
            pushNotification(
              `Upcoming Reservation: ${b.placeName}`,
              `Scheduled for ${b.checkInDate}${b.timeSlot ? ` at ${b.timeSlot}` : ''} · ${b.roomOrServiceType}`,
              'appointment'
            );
          }
        }
      }
    });

    const unsubHistory = subscribeSearchHistory(user.uid, setSearchHistory);

    return () => {
      unsubPromos();
      unsubBookings();
      unsubHistory();
    };
  }, [authReady, user, userProfile?.notificationsEnabled, userProfile?.promoAlertsEnabled, pushNotification]);

  // Reverse geocode nearest town whenever GPS coordinates update noticeably
  const resolveNearestTown = useCallback(async (coords: LatLngLiteral) => {
    const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
    if (lastReverseGeocodeRef.current === key) return;
    lastReverseGeocodeRef.current = key;
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.status === 429) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { townName: string };
        if (data.townName) setTownName(data.townName);
      }
    } catch {
      setTownName(`${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`);
    }
  }, []);

  // Real-Time GPS Tracking via navigator.geolocation.watchPosition
  useEffect(() => {
    if (locationMode !== 'gps') return;
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by this browser.');
      setTownName('Santa Monica');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const nextCoords: LatLngLiteral = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserGpsPosition(nextCoords);
        setGpsAccuracyMeters(pos.coords.accuracy);
        setGpsActive(true);
        setGpsError(null);
        setCenter((prev) => {
          const movedSignificantly =
            Math.abs(prev.lat - nextCoords.lat) > 0.002 ||
            Math.abs(prev.lng - nextCoords.lng) > 0.002;
          return movedSignificantly || prev === DEFAULT_FALLBACK_CENTER ? nextCoords : prev;
        });
        void resolveNearestTown(nextCoords);
      },
      (err) => {
        setGpsActive(false);
        setGpsError(
          err.code === 1
            ? 'Location permission denied. Enable GPS access or enter a town manually.'
            : 'Unable to acquire live GPS fix right now.'
        );
        setTownName((curr) => (curr.startsWith('Detecting') ? 'Santa Monica' : curr));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 12000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [locationMode, resolveNearestTown]);

  // Execute live Google Places API (New) discovery
  const runPlacesSearch = useCallback(
    async (opts?: {
      targetCenter?: LatLngLiteral;
      targetTown?: string;
      recordHistory?: boolean;
    }) => {
      if (!placesLib) return;
      const searchCenter = opts?.targetCenter || center;
      const label = opts?.targetTown || townName;

      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const results = await searchNearbyBusinesses({
          placesLib,
          center: searchCenter,
          radiusMeters,
          category,
          query: searchQuery,
        });
        setPlaces(results);

        if (opts?.recordHistory && user && user.emailVerified) {
          await saveSearchHistoryRecord(user, {
            query: searchQuery,
            locationLabel: label,
            lat: searchCenter.lat,
            lng: searchCenter.lng,
            category,
            mode: locationMode,
            resultCount: results.length,
          });
          await logActivity({
            user,
            action: 'places_search',
            details: `Searched ${category} near ${label} (${results.length} results)`,
            category: 'search',
          });
        }
      } catch (err) {
        setPlacesError(
          err instanceof Error
            ? err.message
            : 'Unable to load Google Maps places data right now.'
        );
      } finally {
        setPlacesLoading(false);
      }
    },
    [placesLib, center, townName, radiusMeters, category, searchQuery, user, locationMode]
  );

  // Trigger search automatically when placesLib, center, category, or radius changes
  useEffect(() => {
    if (!mapsReady || !placesLib) return;
    void runPlacesSearch({ recordHistory: false });
  }, [mapsReady, placesLib, center.lat, center.lng, category, radiusMeters]);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      (user.email === ADMIN_BOOTSTRAP_EMAIL || userProfile?.role === 'admin')
  );

  const handleSignOut = async () => {
    if (user) {
      await logActivity({
        user,
        action: 'sign_out',
        details: 'User signed out',
        category: 'auth',
      });
    }
    await signOut(auth);
  };

  const handleManualLocationSelect = (loc: LatLngLiteral, label: string) => {
    setLocationMode('manual');
    setCenter(loc);
    setTownName(label);
    void runPlacesSearch({ targetCenter: loc, targetTown: label, recordHistory: true });
  };

  const handleEnableGps = () => {
    setLocationMode('gps');
    if (userGpsPosition) {
      setCenter(userGpsPosition);
      void resolveNearestTown(userGpsPosition);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      <Header
        activeView={activeView}
        onNavigate={setActiveView}
        userProfile={userProfile}
        isAdmin={isAdmin}
        notifications={notifications}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => void handleSignOut()}
      />

      {/* Unverified Email Verification Reminder */}
      {user && !user.emailVerified && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              Please verify your email address ({user.email}) to sync bookings and history.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void sendEmailVerification(user)}
                className="underline font-semibold"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={async () => {
                  await user.reload();
                  window.location.reload();
                }}
                className="px-2.5 py-1 bg-amber-900 text-white rounded font-medium"
              >
                I&apos;ve Verified
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {!mapsReady && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Initializing Google Maps Platform services...
          </div>
        )}

        {activeView === 'explore' && (
          <ExploreView
            center={center}
            townName={townName}
            locationMode={locationMode}
            gpsActive={gpsActive}
            gpsError={gpsError}
            category={category}
            searchQuery={searchQuery}
            radiusMeters={radiusMeters}
            places={places}
            loading={placesLoading}
            error={placesError}
            searchHistory={searchHistory}
            onCategoryChange={setCategory}
            onSearchQueryChange={setSearchQuery}
            onRadiusChange={setRadiusMeters}
            onEnableGps={handleEnableGps}
            onManualLocationSelect={handleManualLocationSelect}
            onExecuteSearch={() => void runPlacesSearch({ recordHistory: true })}
            onSelectPlace={setDetailPlace}
            onBookPlace={setBookingPlace}
            onOpenMapView={() => setActiveView('map')}
            onDeleteHistory={(id) => void deleteSearchHistoryRecord(id)}
          />
        )}

        {activeView === 'map' && (
          <LiveMapView
            center={center}
            userGpsPosition={userGpsPosition}
            gpsAccuracyMeters={gpsAccuracyMeters}
            townName={townName}
            places={places}
            category={category}
            loading={placesLoading}
            initialSelectedPlaceId={mapFocusPlaceId}
            onCategoryChange={setCategory}
            onSearchArea={(newCenter) => {
              setCenter(newCenter);
              void resolveNearestTown(newCenter);
              void runPlacesSearch({ targetCenter: newCenter, recordHistory: true });
            }}
            onRecenterGps={() => {
              handleEnableGps();
              if (userGpsPosition) {
                setCenter(userGpsPosition);
              }
            }}
            onSelectDetails={setDetailPlace}
            onBookPlace={setBookingPlace}
          />
        )}

        {activeView === 'bookings' && (
          <BookingsView
            user={user}
            bookings={bookings}
            promotions={promotions}
            notifications={notifications}
            onRequireAuth={() => setAuthModalOpen(true)}
            onExplore={() => setActiveView('explore')}
            onSendReminderToast={(title, body) => pushNotification(title, body, 'appointment')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            user={user}
            userProfile={userProfile}
            searchHistory={searchHistory}
            onDeleteHistory={(id) => void deleteSearchHistoryRecord(id)}
            onRequireAuth={() => setAuthModalOpen(true)}
            onTriggerTestPush={(title, body) => pushNotification(title, body, 'system')}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboardView currentUser={user} isAdmin={isAdmin} />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            &copy; {new Date().getFullYear()} {APP_NAME} · Developed by{' '}
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className="font-semibold text-stone-800 hover:underline"
            >
              {DEVELOPER_NAME}
            </button>
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-800"
            >
              Google Maps Terms
            </a>
            <a
              href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-800"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* Push Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-stone-900 text-white border border-stone-700 rounded-xl shadow-xl p-4 flex items-start gap-3">
          <Bell className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{activeToast.title}</p>
            <p className="text-xs text-stone-300 mt-0.5">{activeToast.body}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="text-stone-400 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(method) => {
          if (auth.currentUser) {
            void logActivity({
              user: auth.currentUser,
              action: `auth_${method}`,
              details: `User authenticated via ${method}`,
              category: 'auth',
            });
          }
        }}
      />

      <PlaceDetailModal
        place={detailPlace}
        onClose={() => setDetailPlace(null)}
        onBook={(p) => {
          setDetailPlace(null);
          setBookingPlace(p);
        }}
        onViewOnMap={(p) => {
          setMapFocusPlaceId(p.id);
          setCenter(p.location);
          setActiveView('map');
        }}
      />

      <BookingModal
        place={bookingPlace}
        user={user}
        onClose={() => setBookingPlace(null)}
        onRequireAuth={() => {
          setAuthModalOpen(true);
        }}
        onBookingCreated={(b) => {
          pushNotification(
            `Reservation Confirmed: ${b.placeName}`,
            `Reminder scheduled for ${b.date}. Reference ${b.id}.`,
            'appointment'
          );
        }}
      />
    </div>
  );
};

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/maps-config')
      .then((res) => res.json())
      .then((data: { apiKey?: string }) => {
        if (data.apiKey) setMapsApiKey(data.apiKey);
      })
      .catch(() => undefined);
  }, [mapsApiKey]);

  return (
    <>
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {mapsApiKey ? (
        <APIProvider apiKey={mapsApiKey} libraries={['places', 'marker']} language="en">
          <AppWorkspace mapsReady={true} />
        </APIProvider>
      ) : (
        <AppWorkspace mapsReady={false} />
      )}
    </>
  );
}
