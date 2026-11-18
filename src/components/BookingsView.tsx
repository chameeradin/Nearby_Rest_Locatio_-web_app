import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { Bell, Calendar, MapPin, Phone, Tag, XCircle } from 'lucide-react';
import type { BookingRecord, PromotionRecord, PushNotificationItem } from '../types/app';
import { CATEGORY_SINGULAR } from '../lib/constants';
import { cancelBookingRecord, logActivity } from '../lib/firestoreService';

interface BookingsViewProps {
  user: User | null;
  bookings: BookingRecord[];
  promotions: PromotionRecord[];
  notifications: PushNotificationItem[];
  onRequireAuth: () => void;
  onExplore: () => void;
  onSendReminderToast: (title: string, body: string) => void;
}

const STATUS_STYLES: Record<BookingRecord['status'], string> = {
  confirmed: 'text-emerald-700',
  pending: 'text-amber-700',
  completed: 'text-stone-600',
  cancelled: 'text-rose-700',
};

export const BookingsView: React.FC<BookingsViewProps> = ({
  user,
  bookings,
  promotions,
  notifications,
  onRequireAuth,
  onExplore,
  onSendReminderToast,
}) => {
  const [filter, setFilter] = useState<'all' | BookingRecord['status']>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filtered =
    filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const handleCancel = async (b: BookingRecord) => {
    if (!user) return;
    setCancellingId(b.id);
    try {
      await cancelBookingRecord(b.id, 'Cancelled by user');
      await logActivity({
        user,
        action: 'booking_cancelled',
        details: `Cancelled booking ${b.id} at ${b.placeName}`,
        category: 'booking',
      });
      onSendReminderToast('Booking Cancelled', `Your reservation at ${b.placeName} has been cancelled.`);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Bookings &amp; Upcoming Alerts
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage reservations saved to your account and view upcoming appointment notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                filter === s
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!user ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-4">
          <Calendar className="w-10 h-10 text-teal-700 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold text-stone-900">
              Sign in to view your booking history
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Your hotel rooms, cabanas, restaurant tables, and cafe bookings are securely synced to
              your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
          >
            Sign In or Create Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bookings List */}
          <div className="lg:col-span-8 space-y-4">
            {filtered.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3">
                <p className="font-display text-lg font-semibold text-stone-900">
                  No {filter === 'all' ? '' : filter} bookings yet
                </p>
                <p className="text-sm text-stone-600">
                  Explore nearby hotels, restaurants, cabanas, and cafes to reserve your spot.
                </p>
                <button
                  type="button"
                  onClick={onExplore}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Explore Locations
                </button>
              </div>
            ) : (
              filtered.map((b) => (
                <article
                  key={b.id}
                  className="bg-white border border-stone-200 rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-semibold text-teal-800">
                          {CATEGORY_SINGULAR[b.category]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{b.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-semibold capitalize ${STATUS_STYLES[b.status]}`}>
                          {b.status}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-stone-900 mt-1">
                        {b.placeName}
                      </h3>
                    </div>

                    {b.totalAmount !== undefined && (
                      <div className="text-right">
                        <p className="font-mono text-base font-semibold text-stone-900 tabular-nums">
                          {b.currency || 'USD'} {b.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-stone-500">Booking.com API Rate</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="font-mono tabular-nums">
                        {b.checkInDate}
                        {b.checkOutDate ? ` → ${b.checkOutDate}` : b.timeSlot ? ` at ${b.timeSlot}` : ''}
                      </span>
                    </p>
                    <p className="tabular-nums">
                      {b.roomOrServiceType} · {b.guests} {b.guests === 1 ? 'guest' : 'guests'}
                    </p>
                    <p className="flex items-start gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>{b.placeAddress}</span>
                    </p>
                    {b.placePhone && (
                      <p className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{b.placePhone}</span>
                      </p>
                    )}
                  </div>

                  {b.notes && (
                    <p className="text-xs text-stone-500 bg-stone-50 border border-stone-100 rounded-lg p-2.5">
                      Note: {b.notes}
                    </p>
                  )}

                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSendReminderToast(
                            `Upcoming Appointment: ${b.placeName}`,
                            `Scheduled for ${b.checkInDate}${b.timeSlot ? ` at ${b.timeSlot}` : ''} (${b.roomOrServiceType}).`
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:underline"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Send Push Reminder
                      </button>

                      <button
                        type="button"
                        disabled={cancellingId === b.id}
                        onClick={() => void handleCancel(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Push Notifications & Active Promotional Offers Sidebar */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-stone-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-700" />
                Appointment Alerts
              </h2>
              {notifications.length === 0 ? (
                <p className="text-xs text-stone-500">
                  Notifications for upcoming bookings and special offers appear here.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                      <p className="font-semibold text-stone-900">{n.title}</p>
                      <p className="text-stone-600 mt-0.5">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-semibold text-stone-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                Promotional Offers
              </h2>
              {promotions.length === 0 ? (
                <p className="text-xs text-stone-500">
                  No active promotional offers published yet. Admins can publish live offers in the
                  Admin Dashboard.
                </p>
              ) : (
                <div className="space-y-3">
                  {promotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="p-3.5 rounded-lg border border-stone-200 bg-stone-50 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-teal-800">{promo.discountLabel}</span>
                        <span className="font-mono text-stone-500">Until {promo.validUntil}</span>
                      </div>
                      <p className="text-sm font-semibold text-stone-900">{promo.title}</p>
                      <p className="text-xs text-stone-600">{promo.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
