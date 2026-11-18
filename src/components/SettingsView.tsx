import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Bell, CheckCircle2, Code2, ExternalLink, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import type { PlaceCategory, SearchHistoryRecord, UserProfile } from '../types/app';
import { APP_NAME, DEVELOPER_NAME, FIELD_LIMITS } from '../lib/constants';
import { updateUserPreferences } from '../lib/firestoreService';

interface SettingsViewProps {
  user: User | null;
  userProfile: UserProfile | null;
  searchHistory: SearchHistoryRecord[];
  onDeleteHistory: (id: string) => void;
  onRequireAuth: () => void;
  onTriggerTestPush: (title: string, body: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  userProfile,
  searchHistory,
  onDeleteHistory,
  onRequireAuth,
  onTriggerTestPush,
}) => {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    userProfile?.notificationsEnabled ?? true
  );
  const [promoAlertsEnabled, setPromoAlertsEnabled] = useState(
    userProfile?.promoAlertsEnabled ?? true
  );
  const [preferredCategory, setPreferredCategory] = useState<PlaceCategory>(
    userProfile?.preferredCategory || 'all'
  );
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(
    userProfile?.searchRadiusMeters || 5000
  );

  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showComposeHint, setShowComposeHint] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setNotificationsEnabled(userProfile.notificationsEnabled);
      setPromoAlertsEnabled(userProfile.promoAlertsEnabled);
      setPreferredCategory(userProfile.preferredCategory || 'all');
      setSearchRadiusMeters(userProfile.searchRadiusMeters || 5000);
    }
  }, [userProfile]);

  const handleRequestBrowserPush = async () => {
    if (typeof Notification === 'undefined') {
      setBrowserPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      onTriggerTestPush(
        `${APP_NAME} Push Enabled`,
        'You will receive reminders for upcoming bookings and promotional offers.'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    setSavedNotice(false);
    try {
      await updateUserPreferences(user.uid, {
        displayName,
        phone,
        notificationsEnabled,
        promoAlertsEnabled,
        preferredCategory,
        searchRadiusMeters,
      });
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="border-b border-stone-200 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          Application Settings
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Configure push notifications, exploration defaults, search history, and developer details.
        </p>
      </div>

      {/* Highlighted Developer Section: Waves IT */}
      <section className="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
            Developer &amp; Engineering Studio
          </p>
          <h2 className="font-display text-2xl font-bold">{DEVELOPER_NAME}</h2>
          <p className="text-sm text-stone-300 max-w-xl">
            {APP_NAME} is engineered and maintained by <strong>{DEVELOPER_NAME}</strong>, combining
            real-time Google Maps Platform geolocation, Booking.com availability integration, and
            cross-platform responsive interfaces.
          </p>
        </div>
        <div className="shrink-0 bg-white/10 border border-white/15 rounded-xl px-5 py-4 text-left sm:text-right">
          <p className="text-xs text-stone-300">Developed by</p>
          <p className="font-display text-lg font-bold text-white">{DEVELOPER_NAME}</p>
          <p className="text-xs font-mono text-teal-300 mt-1">Web &amp; Android Compose</p>
        </div>
      </section>

      {/* Push Notifications & Preferences Form */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-700" />
              Push Notifications &amp; Preferences
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Browser permission status:{' '}
              <span className="font-mono font-semibold text-stone-800">{browserPermission}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRequestBrowserPush()}
            className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            {browserPermission === 'granted' ? 'Send Test Notification' : 'Enable Browser Push'}
          </button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={FIELD_LIMITS.displayNameMax}
                disabled={!user}
                placeholder={user ? 'Your name' : 'Sign in to edit profile'}
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={FIELD_LIMITS.phoneMax}
                disabled={!user}
                placeholder="+1 555 010 9900"
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg font-mono disabled:bg-stone-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Default Explore Category
              </label>
              <select
                value={preferredCategory}
                onChange={(e) => setPreferredCategory(e.target.value as PlaceCategory)}
                disabled={!user}
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg bg-white disabled:bg-stone-50"
              >
                <option value="all">All Places</option>
                <option value="hotel">Hotels</option>
                <option value="restaurant">Restaurants</option>
                <option value="cabana">Cabanas</option>
                <option value="cafe">Cafes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Default Search Radius
              </label>
              <select
                value={searchRadiusMeters}
                onChange={(e) => setSearchRadiusMeters(Number(e.target.value))}
                disabled={!user}
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg bg-white font-mono disabled:bg-stone-50"
              >
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={25000}>25 km</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  Upcoming Appointment Reminders
                </p>
                <p className="text-xs text-stone-500">
                  Receive push alerts before check-in or table reservation times.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                disabled={!user}
                className="w-4 h-4 accent-teal-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-900">Promotional Offers Alerts</p>
                <p className="text-xs text-stone-500">
                  Get notified about seasonal hotel, cabana, and dining deals.
                </p>
              </div>
              <input
                type="checkbox"
                checked={promoAlertsEnabled}
                onChange={(e) => setPromoAlertsEnabled(e.target.checked)}
                disabled={!user}
                className="w-4 h-4 accent-teal-700"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Preferences saved to cloud profile
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {user ? (saving ? 'Saving...' : 'Save Preferences') : 'Sign In to Save'}
            </button>
          </div>
        </form>
      </section>

      {/* Saved Search History */}
      {user && (
        <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-stone-900">
            Saved Search History ({searchHistory.length})
          </h2>
          {searchHistory.length === 0 ? (
            <p className="text-sm text-stone-500">No search history recorded yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {searchHistory.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.locationLabel}
                      {item.query ? ` — "${item.query}"` : ''}
                    </p>
                    <p className="text-xs text-stone-500 tabular-nums">
                      Mode: {item.mode.toUpperCase()} · Category: {item.category} · {item.resultCount}{' '}
                      results
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteHistory(item.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                    aria-label="Delete search history entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Android Jetpack Compose Companion & Legal Compliance */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-teal-700" />
            <div>
              <h2 className="font-display text-base font-semibold text-stone-900">
                Android Jetpack Compose Companion Screen
              </h2>
              <p className="text-xs text-stone-500">
                Native Kotlin Compose screen with Material 3 SearchBar, FilterChips &amp; Google
                Location Services
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowComposeHint((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showComposeHint ? 'Hide Source Info' : 'View Compose Details'}
          </button>
        </div>

        {showComposeHint && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-2">
            <p>
              Included in repository at{' '}
              <code className="font-mono bg-stone-200 px-1.5 py-0.5 rounded">
                android/NearbyRestLocationsScreen.kt
              </code>
              .
            </p>
            <p>
              Implements <code className="font-mono">FusedLocationProviderClient</code> high-accuracy
              location acquisition, Material 3 <code className="font-mono">SearchBar</code>, and
              interactive <code className="font-mono">FilterChip</code> selectors for{' '}
              <strong>Hotels, Restaurants, Cabanas, Cafes</strong>.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1 text-stone-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            Google Maps Platform Compliance
          </span>
          <a
            href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
          >
            Google Maps Terms
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
          >
            Google Privacy Policy
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>
    </div>
  );
};
